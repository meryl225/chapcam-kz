// ChapCam Camera - Media Foundation custom media source for a Windows 11
// virtual camera (MFCreateVirtualCamera). The Frame Server service loads this
// DLL through the IMFActivate below, and the media source streams NV12 frames
// read from the shared file written by chapcam-vcam.exe.
#include <windows.h>
#include <initguid.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mferror.h>
#include <ks.h>
#include <ksproxy.h>
#include <ksmedia.h>
#include <wrl/client.h>
#include <wrl/implements.h>
#include <wrl/module.h>

#include <algorithm>
#include <chrono>
#include <condition_variable>
#include <deque>
#include <mutex>
#include <thread>
#include <vector>

#include "frame_shared.h"

// Repeat the IKsControl uuid so __uuidof works regardless of SDK header order.
struct __declspec(uuid("28F54685-06FD-11D2-B27A-00A0C9223196")) IKsControl;

using Microsoft::WRL::ChainInterfaces;
using Microsoft::WRL::ClassicCom;
using Microsoft::WRL::ComPtr;
using Microsoft::WRL::FtmBase;
using Microsoft::WRL::InProc;
using Microsoft::WRL::MakeAndInitialize;
using Microsoft::WRL::Module;
using Microsoft::WRL::RuntimeClass;
using Microsoft::WRL::RuntimeClassFlags;

#define CC_RETURN_IF_FAILED(expr) \
  do {                            \
    HRESULT _hr = (expr);         \
    if (FAILED(_hr)) return _hr;  \
  } while (0)

static HMODULE g_module = nullptr;

namespace {

constexpr DWORD kStreamId = 0;
constexpr LONGLONG kFrameDuration100ns = 10'000'000LL / chapcam::kOutFps;

// ---------------------------------------------------------------------------
// Shared frame reader
// ---------------------------------------------------------------------------
class FrameReader {
 public:
  ~FrameReader() { Close(); }

  // Copies the latest fresh frame into `out`. Returns false when no writer is
  // active or the frame is stale.
  bool Read(std::vector<uint8_t>& out, uint32_t& width, uint32_t& height) {
    if (!m_view && !TryOpen()) return false;
    auto* header = reinterpret_cast<const chapcam::FrameHeader*>(m_view);
    if (header->magic != chapcam::kFrameMagic || header->version != chapcam::kFrameVersion) return false;

    for (int attempt = 0; attempt < 3; ++attempt) {
      const LONG64 before = header->sequence;
      MemoryBarrier();
      if (before & 1) {
        YieldProcessor();
        continue;
      }
      const uint32_t w = header->width;
      const uint32_t h = header->height;
      const uint64_t writtenAt = static_cast<uint64_t>(header->writtenAtMs);
      if (w == 0 || h == 0 || w > chapcam::kMaxWidth || h > chapcam::kMaxHeight) return false;
      if (GetTickCount64() - writtenAt > chapcam::kStaleAfterMs) return false;

      const size_t bytes = size_t(w) * h * 4;
      out.resize(bytes);
      memcpy(out.data(), m_view + sizeof(chapcam::FrameHeader), bytes);
      MemoryBarrier();
      if (header->sequence == before) {
        width = w;
        height = h;
        return true;
      }
    }
    return false;
  }

 private:
  bool TryOpen() {
    const ULONGLONG now = GetTickCount64();
    if (now - m_lastOpenAttempt < 1000) return false;
    m_lastOpenAttempt = now;

    const std::wstring path = chapcam::FrameFilePath();
    HANDLE file = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                              OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file == INVALID_HANDLE_VALUE) return false;

    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file, &size) || size.QuadPart < static_cast<LONGLONG>(chapcam::kFrameFileSize)) {
      CloseHandle(file);
      return false;
    }
    HANDLE mapping = CreateFileMappingW(file, nullptr, PAGE_READONLY, 0, 0, nullptr);
    if (!mapping) {
      CloseHandle(file);
      return false;
    }
    void* view = MapViewOfFile(mapping, FILE_MAP_READ, 0, 0, chapcam::kFrameFileSize);
    if (!view) {
      CloseHandle(mapping);
      CloseHandle(file);
      return false;
    }
    m_file = file;
    m_mapping = mapping;
    m_view = static_cast<const uint8_t*>(view);
    return true;
  }

  void Close() {
    if (m_view) UnmapViewOfFile(m_view);
    if (m_mapping) CloseHandle(m_mapping);
    if (m_file && m_file != INVALID_HANDLE_VALUE) CloseHandle(m_file);
    m_view = nullptr;
    m_mapping = nullptr;
    m_file = nullptr;
  }

  HANDLE m_file = nullptr;
  HANDLE m_mapping = nullptr;
  const uint8_t* m_view = nullptr;
  ULONGLONG m_lastOpenAttempt = 0;
};

inline uint8_t Clamp8(int v) { return static_cast<uint8_t>(v < 0 ? 0 : (v > 255 ? 255 : v)); }

// BGRA (any size, top-down) -> NV12 (dstW x dstH), nearest-neighbour scaling,
// BT.601 limited range.
void BgraToNv12(const uint8_t* src, uint32_t srcW, uint32_t srcH, uint8_t* dst, LONG pitch, uint32_t dstW,
                uint32_t dstH) {
  uint8_t* uvPlane = dst + size_t(pitch) * dstH;
  for (uint32_t y = 0; y < dstH; ++y) {
    const uint32_t sy = (y * srcH) / dstH;
    const uint8_t* srcRow = src + size_t(sy) * srcW * 4;
    uint8_t* yRow = dst + size_t(pitch) * y;
    uint8_t* uvRow = uvPlane + size_t(pitch) * (y / 2);
    for (uint32_t x = 0; x < dstW; ++x) {
      const uint32_t sx = (x * srcW) / dstW;
      const uint8_t* p = srcRow + size_t(sx) * 4;
      const int b = p[0], g = p[1], r = p[2];
      yRow[x] = Clamp8(((66 * r + 129 * g + 25 * b + 128) >> 8) + 16);
      if ((y & 1) == 0 && (x & 1) == 0) {
        uvRow[x] = Clamp8(((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128);
        uvRow[x + 1] = Clamp8(((112 * r - 94 * g - 18 * b + 128) >> 8) + 128);
      }
    }
  }
}

void FillBlackNv12(uint8_t* dst, LONG pitch, uint32_t w, uint32_t h) {
  for (uint32_t y = 0; y < h; ++y) memset(dst + size_t(pitch) * y, 16, w);
  uint8_t* uv = dst + size_t(pitch) * h;
  for (uint32_t y = 0; y < h / 2; ++y) memset(uv + size_t(pitch) * y, 128, w);
}

HRESULT CreateNv12MediaType(IMFMediaType** out) {
  ComPtr<IMFMediaType> type;
  CC_RETURN_IF_FAILED(MFCreateMediaType(&type));
  CC_RETURN_IF_FAILED(type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video));
  CC_RETURN_IF_FAILED(type->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_NV12));
  CC_RETURN_IF_FAILED(MFSetAttributeSize(type.Get(), MF_MT_FRAME_SIZE, chapcam::kOutWidth, chapcam::kOutHeight));
  CC_RETURN_IF_FAILED(MFSetAttributeRatio(type.Get(), MF_MT_FRAME_RATE, chapcam::kOutFps, 1));
  CC_RETURN_IF_FAILED(MFSetAttributeRatio(type.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1));
  CC_RETURN_IF_FAILED(type->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive));
  CC_RETURN_IF_FAILED(type->SetUINT32(MF_MT_ALL_SAMPLES_INDEPENDENT, TRUE));
  CC_RETURN_IF_FAILED(type->SetUINT32(MF_MT_DEFAULT_STRIDE, chapcam::kOutWidth));
  CC_RETURN_IF_FAILED(type->SetUINT32(MF_MT_SAMPLE_SIZE, chapcam::kOutWidth * chapcam::kOutHeight * 3 / 2));
  *out = type.Detach();
  return S_OK;
}

HRESULT SetDeviceStreamAttributes(IMFAttributes* attrs) {
  CC_RETURN_IF_FAILED(attrs->SetGUID(MF_DEVICESTREAM_STREAM_CATEGORY, PINNAME_VIDEO_CAPTURE));
  CC_RETURN_IF_FAILED(attrs->SetUINT32(MF_DEVICESTREAM_STREAM_ID, kStreamId));
  CC_RETURN_IF_FAILED(attrs->SetUINT32(MF_DEVICESTREAM_FRAMESERVER_SHARED, 1));
  CC_RETURN_IF_FAILED(attrs->SetUINT32(MF_DEVICESTREAM_ATTRIBUTE_FRAMESOURCE_TYPES, MFFrameSourceTypes_Color));
  return S_OK;
}

}  // namespace

// ---------------------------------------------------------------------------
// Media stream
// ---------------------------------------------------------------------------
class ChapCamMediaStream
    : public RuntimeClass<RuntimeClassFlags<ClassicCom>,
                          ChainInterfaces<IMFMediaStream2, IMFMediaStream, IMFMediaEventGenerator>, IKsControl,
                          FtmBase> {
 public:
  ~ChapCamMediaStream() { Shutdown(); }

  HRESULT RuntimeClassInitialize(IMFMediaSource* source) {
    m_source = source;
    CC_RETURN_IF_FAILED(MFCreateEventQueue(&m_events));

    ComPtr<IMFMediaType> type;
    CC_RETURN_IF_FAILED(CreateNv12MediaType(&type));
    IMFMediaType* types[] = {type.Get()};
    CC_RETURN_IF_FAILED(MFCreateStreamDescriptor(kStreamId, 1, types, &m_descriptor));

    ComPtr<IMFMediaTypeHandler> handler;
    CC_RETURN_IF_FAILED(m_descriptor->GetMediaTypeHandler(&handler));
    CC_RETURN_IF_FAILED(handler->SetCurrentMediaType(type.Get()));
    CC_RETURN_IF_FAILED(SetDeviceStreamAttributes(m_descriptor.Get()));

    m_worker = std::thread([this] { WorkerLoop(); });
    return S_OK;
  }

  // IMFMediaEventGenerator
  STDMETHODIMP GetEvent(DWORD flags, IMFMediaEvent** event) override {
    ComPtr<IMFMediaEventQueue> queue;
    {
      std::lock_guard<std::mutex> lock(m_lock);
      if (m_shutdown) return MF_E_SHUTDOWN;
      queue = m_events;
    }
    return queue->GetEvent(flags, event);
  }
  STDMETHODIMP BeginGetEvent(IMFAsyncCallback* callback, IUnknown* state) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->BeginGetEvent(callback, state);
  }
  STDMETHODIMP EndGetEvent(IMFAsyncResult* result, IMFMediaEvent** event) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->EndGetEvent(result, event);
  }
  STDMETHODIMP QueueEvent(MediaEventType type, REFGUID ext, HRESULT status, const PROPVARIANT* value) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->QueueEventParamVar(type, ext, status, value);
  }

  // IMFMediaStream
  STDMETHODIMP GetMediaSource(IMFMediaSource** source) override {
    if (!source) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_source.CopyTo(source);
  }
  STDMETHODIMP GetStreamDescriptor(IMFStreamDescriptor** descriptor) override {
    if (!descriptor) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_descriptor.CopyTo(descriptor);
  }
  STDMETHODIMP RequestSample(IUnknown* token) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    if (m_state != MF_STREAM_STATE_RUNNING) return MF_E_MEDIA_SOURCE_WRONGSTATE;
    m_tokens.emplace_back(token);
    m_wake.notify_one();
    return S_OK;
  }

  // IMFMediaStream2
  STDMETHODIMP SetStreamState(MF_STREAM_STATE state) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    if (state == MF_STREAM_STATE_PAUSED) return MF_E_INVALID_STATE_TRANSITION;
    m_state = state;
    if (state == MF_STREAM_STATE_STOPPED) m_tokens.clear();
    m_wake.notify_one();
    return S_OK;
  }
  STDMETHODIMP GetStreamState(MF_STREAM_STATE* state) override {
    if (!state) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    *state = m_state;
    return S_OK;
  }

  // IKsControl: no custom camera controls are exposed.
  STDMETHODIMP KsProperty(PKSPROPERTY, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }
  STDMETHODIMP KsMethod(PKSMETHOD, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }
  STDMETHODIMP KsEvent(PKSEVENT, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }

  // Internal API used by the media source.
  HRESULT Start() {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    m_state = MF_STREAM_STATE_RUNNING;
    m_active = true;
    m_wake.notify_one();
    return m_events->QueueEventParamVar(MEStreamStarted, GUID_NULL, S_OK, nullptr);
  }
  HRESULT Stop() {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    m_state = MF_STREAM_STATE_STOPPED;
    m_active = false;
    m_tokens.clear();
    return m_events->QueueEventParamVar(MEStreamStopped, GUID_NULL, S_OK, nullptr);
  }
  bool IsActive() {
    std::lock_guard<std::mutex> lock(m_lock);
    return m_active;
  }
  HRESULT GetAttributes(IMFAttributes** attrs) {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_descriptor.CopyTo(attrs);
  }
  void Shutdown() {
    {
      std::lock_guard<std::mutex> lock(m_lock);
      if (m_shutdown) return;
      m_shutdown = true;
      m_tokens.clear();
      m_wake.notify_all();
    }
    if (m_worker.joinable()) {
      if (m_worker.get_id() == std::this_thread::get_id()) {
        m_worker.detach();
      } else {
        m_worker.join();
      }
    }
    if (m_events) m_events->Shutdown();
    m_source.Reset();
  }

 private:
  void WorkerLoop() {
    auto nextDue = std::chrono::steady_clock::now();
    const auto interval = std::chrono::microseconds(1'000'000 / chapcam::kOutFps);
    for (;;) {
      ComPtr<IUnknown> token;
      {
        std::unique_lock<std::mutex> lock(m_lock);
        m_wake.wait(lock, [this] {
          return m_shutdown || (m_state == MF_STREAM_STATE_RUNNING && !m_tokens.empty());
        });
        if (m_shutdown) return;
        token = m_tokens.front();
        m_tokens.pop_front();
      }

      const auto now = std::chrono::steady_clock::now();
      if (nextDue > now) std::this_thread::sleep_until(nextDue);
      nextDue = std::max(nextDue, now) + interval;

      ComPtr<IMFSample> sample;
      if (FAILED(BuildSample(token.Get(), &sample))) continue;

      std::lock_guard<std::mutex> lock(m_lock);
      if (m_shutdown || m_state != MF_STREAM_STATE_RUNNING) continue;
      m_events->QueueEventParamUnk(MEMediaSample, GUID_NULL, S_OK, sample.Get());
    }
  }

  HRESULT BuildSample(IUnknown* token, IMFSample** out) {
    uint32_t w = 0, h = 0;
    const bool fresh = m_reader.Read(m_scratch, w, h);
    if (fresh) {
      m_frame.swap(m_scratch);
      m_frameW = w;
      m_frameH = h;
      m_frameAt = GetTickCount64();
    }
    const bool haveFrame = !m_frame.empty() && GetTickCount64() - m_frameAt <= chapcam::kStaleAfterMs;

    ComPtr<IMFMediaBuffer> buffer;
    CC_RETURN_IF_FAILED(
        MFCreate2DMediaBuffer(chapcam::kOutWidth, chapcam::kOutHeight, MAKEFOURCC('N', 'V', '1', '2'), FALSE, &buffer));
    ComPtr<IMF2DBuffer> buffer2d;
    CC_RETURN_IF_FAILED(buffer.As(&buffer2d));

    BYTE* scan0 = nullptr;
    LONG pitch = 0;
    CC_RETURN_IF_FAILED(buffer2d->Lock2D(&scan0, &pitch));
    if (haveFrame) {
      BgraToNv12(m_frame.data(), m_frameW, m_frameH, scan0, pitch, chapcam::kOutWidth, chapcam::kOutHeight);
    } else {
      FillBlackNv12(scan0, pitch, chapcam::kOutWidth, chapcam::kOutHeight);
    }
    buffer2d->Unlock2D();

    DWORD length = 0;
    CC_RETURN_IF_FAILED(buffer2d->GetContiguousLength(&length));
    CC_RETURN_IF_FAILED(buffer->SetCurrentLength(length));

    ComPtr<IMFSample> sample;
    CC_RETURN_IF_FAILED(MFCreateSample(&sample));
    CC_RETURN_IF_FAILED(sample->AddBuffer(buffer.Get()));
    CC_RETURN_IF_FAILED(sample->SetSampleTime(MFGetSystemTime()));
    CC_RETURN_IF_FAILED(sample->SetSampleDuration(kFrameDuration100ns));
    CC_RETURN_IF_FAILED(sample->SetUINT32(MFSampleExtension_CleanPoint, TRUE));
    if (token) CC_RETURN_IF_FAILED(sample->SetUnknown(MFSampleExtension_Token, token));
    *out = sample.Detach();
    return S_OK;
  }

  std::mutex m_lock;
  std::condition_variable m_wake;
  std::thread m_worker;
  std::deque<ComPtr<IUnknown>> m_tokens;
  ComPtr<IMFMediaSource> m_source;
  ComPtr<IMFMediaEventQueue> m_events;
  ComPtr<IMFStreamDescriptor> m_descriptor;
  MF_STREAM_STATE m_state = MF_STREAM_STATE_STOPPED;
  bool m_active = false;
  bool m_shutdown = false;

  // Only touched by the worker thread.
  FrameReader m_reader;
  std::vector<uint8_t> m_frame;
  std::vector<uint8_t> m_scratch;
  uint32_t m_frameW = 0;
  uint32_t m_frameH = 0;
  ULONGLONG m_frameAt = 0;
};

// ---------------------------------------------------------------------------
// Media source
// ---------------------------------------------------------------------------
class ChapCamMediaSource
    : public RuntimeClass<RuntimeClassFlags<ClassicCom>,
                          ChainInterfaces<IMFMediaSourceEx, IMFMediaSource, IMFMediaEventGenerator>, IMFGetService,
                          IKsControl, FtmBase> {
 public:
  HRESULT RuntimeClassInitialize() {
    CC_RETURN_IF_FAILED(MFCreateEventQueue(&m_events));
    CC_RETURN_IF_FAILED(MFCreateAttributes(&m_attributes, 2));
    CC_RETURN_IF_FAILED(MakeAndInitialize<ChapCamMediaStream>(m_stream.GetAddressOf(),
                                                              static_cast<IMFMediaSource*>(this)));
    ComPtr<IMFStreamDescriptor> descriptor;
    CC_RETURN_IF_FAILED(m_stream->GetStreamDescriptor(&descriptor));
    IMFStreamDescriptor* descriptors[] = {descriptor.Get()};
    CC_RETURN_IF_FAILED(MFCreatePresentationDescriptor(1, descriptors, &m_presentation));
    CC_RETURN_IF_FAILED(m_presentation->SelectStream(0));
    return S_OK;
  }

  // IMFMediaEventGenerator
  STDMETHODIMP GetEvent(DWORD flags, IMFMediaEvent** event) override {
    ComPtr<IMFMediaEventQueue> queue;
    {
      std::lock_guard<std::mutex> lock(m_lock);
      if (m_shutdown) return MF_E_SHUTDOWN;
      queue = m_events;
    }
    return queue->GetEvent(flags, event);
  }
  STDMETHODIMP BeginGetEvent(IMFAsyncCallback* callback, IUnknown* state) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->BeginGetEvent(callback, state);
  }
  STDMETHODIMP EndGetEvent(IMFAsyncResult* result, IMFMediaEvent** event) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->EndGetEvent(result, event);
  }
  STDMETHODIMP QueueEvent(MediaEventType type, REFGUID ext, HRESULT status, const PROPVARIANT* value) override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_events->QueueEventParamVar(type, ext, status, value);
  }

  // IMFMediaSource
  STDMETHODIMP GetCharacteristics(DWORD* characteristics) override {
    if (!characteristics) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    *characteristics = MFMEDIASOURCE_IS_LIVE;
    return S_OK;
  }
  STDMETHODIMP CreatePresentationDescriptor(IMFPresentationDescriptor** descriptor) override {
    if (!descriptor) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_presentation->Clone(descriptor);
  }
  STDMETHODIMP Start(IMFPresentationDescriptor* descriptor, const GUID* timeFormat,
                     const PROPVARIANT* startPosition) override {
    if (!descriptor) return E_INVALIDARG;
    if (timeFormat && *timeFormat != GUID_NULL) return MF_E_UNSUPPORTED_TIME_FORMAT;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;

    DWORD count = 0;
    CC_RETURN_IF_FAILED(descriptor->GetStreamDescriptorCount(&count));
    for (DWORD i = 0; i < count; ++i) {
      BOOL selected = FALSE;
      ComPtr<IMFStreamDescriptor> sd;
      CC_RETURN_IF_FAILED(descriptor->GetStreamDescriptorByIndex(i, &selected, &sd));
      DWORD id = 0;
      CC_RETURN_IF_FAILED(sd->GetStreamIdentifier(&id));
      if (id != kStreamId) continue;

      if (selected) {
        const bool wasActive = m_stream->IsActive();
        CC_RETURN_IF_FAILED(m_events->QueueEventParamUnk(wasActive ? MEUpdatedStream : MENewStream, GUID_NULL, S_OK,
                                                         static_cast<IMFMediaStream*>(m_stream.Get())));
        CC_RETURN_IF_FAILED(m_stream->Start());
      } else if (m_stream->IsActive()) {
        CC_RETURN_IF_FAILED(m_stream->Stop());
      }
    }

    PROPVARIANT position;
    PropVariantInit(&position);
    if (startPosition) PropVariantCopy(&position, startPosition);
    const HRESULT hr = m_events->QueueEventParamVar(MESourceStarted, GUID_NULL, S_OK, &position);
    PropVariantClear(&position);
    return hr;
  }
  STDMETHODIMP Stop() override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    if (m_stream->IsActive()) CC_RETURN_IF_FAILED(m_stream->Stop());
    return m_events->QueueEventParamVar(MESourceStopped, GUID_NULL, S_OK, nullptr);
  }
  STDMETHODIMP Pause() override { return MF_E_INVALID_STATE_TRANSITION; }
  STDMETHODIMP Shutdown() override {
    ComPtr<ChapCamMediaStream> stream;
    {
      std::lock_guard<std::mutex> lock(m_lock);
      if (m_shutdown) return MF_E_SHUTDOWN;
      m_shutdown = true;
      m_events->Shutdown();
      stream = m_stream;
      m_stream.Reset();
    }
    if (stream) stream->Shutdown();
    return S_OK;
  }

  // IMFMediaSourceEx
  STDMETHODIMP GetSourceAttributes(IMFAttributes** attributes) override {
    if (!attributes) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    return m_attributes.CopyTo(attributes);
  }
  STDMETHODIMP GetStreamAttributes(DWORD streamId, IMFAttributes** attributes) override {
    if (!attributes) return E_POINTER;
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_shutdown) return MF_E_SHUTDOWN;
    if (streamId != kStreamId) return MF_E_INVALIDSTREAMNUMBER;
    return m_stream->GetAttributes(attributes);
  }
  STDMETHODIMP SetD3DManager(IUnknown*) override { return S_OK; }

  // IMFGetService
  STDMETHODIMP GetService(REFGUID, REFIID, LPVOID* object) override {
    if (object) *object = nullptr;
    return MF_E_UNSUPPORTED_SERVICE;
  }

  // IKsControl
  STDMETHODIMP KsProperty(PKSPROPERTY, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }
  STDMETHODIMP KsMethod(PKSMETHOD, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }
  STDMETHODIMP KsEvent(PKSEVENT, ULONG, LPVOID, ULONG, ULONG*) override {
    return HRESULT_FROM_WIN32(ERROR_SET_NOT_FOUND);
  }

 private:
  std::mutex m_lock;
  bool m_shutdown = false;
  ComPtr<IMFMediaEventQueue> m_events;
  ComPtr<IMFAttributes> m_attributes;
  ComPtr<IMFPresentationDescriptor> m_presentation;
  ComPtr<ChapCamMediaStream> m_stream;
};

// ---------------------------------------------------------------------------
// Activate object registered under the CLSID passed to MFCreateVirtualCamera.
// ---------------------------------------------------------------------------
#define CC_DELEGATE_ATTRIBUTES(a)                                                                             \
  STDMETHODIMP GetItem(REFGUID k, PROPVARIANT* v) override { return a->GetItem(k, v); }                       \
  STDMETHODIMP GetItemType(REFGUID k, MF_ATTRIBUTE_TYPE* t) override { return a->GetItemType(k, t); }         \
  STDMETHODIMP CompareItem(REFGUID k, REFPROPVARIANT v, BOOL* r) override { return a->CompareItem(k, v, r); } \
  STDMETHODIMP Compare(IMFAttributes* o, MF_ATTRIBUTES_MATCH_TYPE m, BOOL* r) override {                      \
    return a->Compare(o, m, r);                                                                               \
  }                                                                                                           \
  STDMETHODIMP GetUINT32(REFGUID k, UINT32* v) override { return a->GetUINT32(k, v); }                        \
  STDMETHODIMP GetUINT64(REFGUID k, UINT64* v) override { return a->GetUINT64(k, v); }                        \
  STDMETHODIMP GetDouble(REFGUID k, double* v) override { return a->GetDouble(k, v); }                        \
  STDMETHODIMP GetGUID(REFGUID k, GUID* v) override { return a->GetGUID(k, v); }                              \
  STDMETHODIMP GetStringLength(REFGUID k, UINT32* l) override { return a->GetStringLength(k, l); }            \
  STDMETHODIMP GetString(REFGUID k, LPWSTR s, UINT32 n, UINT32* l) override { return a->GetString(k, s, n, l); } \
  STDMETHODIMP GetAllocatedString(REFGUID k, LPWSTR* s, UINT32* l) override {                                 \
    return a->GetAllocatedString(k, s, l);                                                                    \
  }                                                                                                           \
  STDMETHODIMP GetBlobSize(REFGUID k, UINT32* n) override { return a->GetBlobSize(k, n); }                    \
  STDMETHODIMP GetBlob(REFGUID k, UINT8* b, UINT32 n, UINT32* s) override { return a->GetBlob(k, b, n, s); }  \
  STDMETHODIMP GetAllocatedBlob(REFGUID k, UINT8** b, UINT32* s) override { return a->GetAllocatedBlob(k, b, s); } \
  STDMETHODIMP GetUnknown(REFGUID k, REFIID r, LPVOID* p) override { return a->GetUnknown(k, r, p); }         \
  STDMETHODIMP SetItem(REFGUID k, REFPROPVARIANT v) override { return a->SetItem(k, v); }                     \
  STDMETHODIMP DeleteItem(REFGUID k) override { return a->DeleteItem(k); }                                    \
  STDMETHODIMP DeleteAllItems() override { return a->DeleteAllItems(); }                                      \
  STDMETHODIMP SetUINT32(REFGUID k, UINT32 v) override { return a->SetUINT32(k, v); }                         \
  STDMETHODIMP SetUINT64(REFGUID k, UINT64 v) override { return a->SetUINT64(k, v); }                         \
  STDMETHODIMP SetDouble(REFGUID k, double v) override { return a->SetDouble(k, v); }                         \
  STDMETHODIMP SetGUID(REFGUID k, REFGUID v) override { return a->SetGUID(k, v); }                            \
  STDMETHODIMP SetString(REFGUID k, LPCWSTR v) override { return a->SetString(k, v); }                        \
  STDMETHODIMP SetBlob(REFGUID k, const UINT8* b, UINT32 n) override { return a->SetBlob(k, b, n); }          \
  STDMETHODIMP SetUnknown(REFGUID k, IUnknown* u) override { return a->SetUnknown(k, u); }                    \
  STDMETHODIMP LockStore() override { return a->LockStore(); }                                                \
  STDMETHODIMP UnlockStore() override { return a->UnlockStore(); }                                            \
  STDMETHODIMP GetCount(UINT32* c) override { return a->GetCount(c); }                                        \
  STDMETHODIMP GetItemByIndex(UINT32 i, GUID* k, PROPVARIANT* v) override { return a->GetItemByIndex(i, k, v); } \
  STDMETHODIMP CopyAllItems(IMFAttributes* d) override { return a->CopyAllItems(d); }

class __declspec(uuid("7E3C9B21-5A4F-4C8E-9D21-3B6F0A1C2D45")) ChapCamActivate
    : public RuntimeClass<RuntimeClassFlags<ClassicCom>, ChainInterfaces<IMFActivate, IMFAttributes>, FtmBase> {
 public:
  ChapCamActivate() { MFCreateAttributes(&m_attributes, 1); }

  CC_DELEGATE_ATTRIBUTES(m_attributes)

  STDMETHODIMP ActivateObject(REFIID riid, void** object) override {
    if (!object) return E_POINTER;
    *object = nullptr;
    std::lock_guard<std::mutex> lock(m_lock);
    if (!m_source) {
      CC_RETURN_IF_FAILED(MakeAndInitialize<ChapCamMediaSource>(m_source.GetAddressOf()));
    }
    return m_source.CopyTo(riid, object);
  }
  STDMETHODIMP ShutdownObject() override {
    std::lock_guard<std::mutex> lock(m_lock);
    if (m_source) {
      m_source->Shutdown();
      m_source.Reset();
    }
    return S_OK;
  }
  STDMETHODIMP DetachObject() override {
    std::lock_guard<std::mutex> lock(m_lock);
    m_source.Reset();
    return S_OK;
  }

 private:
  std::mutex m_lock;
  ComPtr<IMFAttributes> m_attributes;
  ComPtr<ChapCamMediaSource> m_source;
};

CoCreatableClass(ChapCamActivate);

// ---------------------------------------------------------------------------
// DLL entry points
// ---------------------------------------------------------------------------
namespace {
const std::wstring ClsidKeyPath() { return std::wstring(L"SOFTWARE\\Classes\\CLSID\\") + chapcam::kSourceClsidString; }

LSTATUS SetStringValue(HKEY key, const wchar_t* name, const std::wstring& value) {
  return RegSetValueExW(key, name, 0, REG_SZ, reinterpret_cast<const BYTE*>(value.c_str()),
                        static_cast<DWORD>((value.size() + 1) * sizeof(wchar_t)));
}
}  // namespace

BOOL APIENTRY DllMain(HMODULE module, DWORD reason, LPVOID) {
  if (reason == DLL_PROCESS_ATTACH) {
    g_module = module;
    DisableThreadLibraryCalls(module);
  }
  return TRUE;
}

STDAPI DllGetClassObject(REFCLSID clsid, REFIID riid, LPVOID* object) {
  return Module<InProc>::GetModule().GetClassObject(clsid, riid, object);
}

STDAPI DllCanUnloadNow() { return Module<InProc>::GetModule().Terminate() ? S_OK : S_FALSE; }

STDAPI DllRegisterServer() {
  wchar_t modulePath[MAX_PATH] = {};
  if (!GetModuleFileNameW(g_module, modulePath, MAX_PATH)) return HRESULT_FROM_WIN32(GetLastError());

  HKEY clsidKey = nullptr;
  LSTATUS status = RegCreateKeyExW(HKEY_LOCAL_MACHINE, ClsidKeyPath().c_str(), 0, nullptr, 0, KEY_WRITE, nullptr,
                                   &clsidKey, nullptr);
  if (status != ERROR_SUCCESS) return HRESULT_FROM_WIN32(status);
  SetStringValue(clsidKey, nullptr, L"ChapCam Camera Source");

  HKEY inproc = nullptr;
  status = RegCreateKeyExW(clsidKey, L"InprocServer32", 0, nullptr, 0, KEY_WRITE, nullptr, &inproc, nullptr);
  if (status == ERROR_SUCCESS) {
    SetStringValue(inproc, nullptr, modulePath);
    SetStringValue(inproc, L"ThreadingModel", L"Both");
    RegCloseKey(inproc);
  }
  RegCloseKey(clsidKey);
  return HRESULT_FROM_WIN32(status);
}

STDAPI DllUnregisterServer() {
  const LSTATUS status = RegDeleteTreeW(HKEY_LOCAL_MACHINE, ClsidKeyPath().c_str());
  return (status == ERROR_SUCCESS || status == ERROR_FILE_NOT_FOUND) ? S_OK : HRESULT_FROM_WIN32(status);
}
