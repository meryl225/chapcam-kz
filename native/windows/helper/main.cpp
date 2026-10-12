// chapcam-vcam.exe - companion of ChapCamVCamSource.dll
//
//   chapcam-vcam.exe install     (admin) register the source DLL, create the
//                                shared frame file and the "ChapCam Camera"
//   chapcam-vcam.exe uninstall   (admin) remove the camera and unregister
//   chapcam-vcam.exe status      exit 0 = ready, 2 = Windows too old,
//                                3 = not installed
//   chapcam-vcam.exe stream W H FPS
//                                read raw BGRA frames (W*H*4 bytes each,
//                                top-down) from stdin into the shared file
#include <windows.h>
#include <initguid.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfvirtualcamera.h>
#include <sddl.h>
#include <aclapi.h>
#include <fcntl.h>
#include <io.h>

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

#include "frame_shared.h"

namespace {

enum ExitCode { kOk = 0, kError = 1, kUnsupportedOs = 2, kNotInstalled = 3 };

using CreateVirtualCameraFn = HRESULT(STDAPICALLTYPE*)(MFVirtualCameraType, MFVirtualCameraLifetime,
                                                        MFVirtualCameraAccess, LPCWSTR, LPCWSTR, const GUID*, ULONG,
                                                        IMFVirtualCamera**);

void Log(const char* fmt, ...) {
  va_list args;
  va_start(args, fmt);
  vfprintf(stderr, fmt, args);
  va_end(args);
  fputc('\n', stderr);
  fflush(stderr);
}

CreateVirtualCameraFn LoadCreateVirtualCamera() {
  HMODULE lib = LoadLibraryExW(L"mfsensorgroup.dll", nullptr, LOAD_LIBRARY_SEARCH_SYSTEM32);
  if (!lib) return nullptr;
  return reinterpret_cast<CreateVirtualCameraFn>(GetProcAddress(lib, "MFCreateVirtualCamera"));
}

std::wstring SiblingPath(const wchar_t* fileName) {
  wchar_t self[MAX_PATH] = {};
  GetModuleFileNameW(nullptr, self, MAX_PATH);
  std::wstring dir(self);
  dir = dir.substr(0, dir.find_last_of(L"\\/"));
  return dir + L"\\" + fileName;
}

HRESULT CallDllEntry(const char* entry) {
  const std::wstring dll = SiblingPath(L"ChapCamVCamSource.dll");
  HMODULE module = LoadLibraryW(dll.c_str());
  if (!module) return HRESULT_FROM_WIN32(GetLastError());
  using EntryFn = HRESULT(STDAPICALLTYPE*)();
  auto fn = reinterpret_cast<EntryFn>(GetProcAddress(module, entry));
  const HRESULT hr = fn ? fn() : HRESULT_FROM_WIN32(GetLastError());
  FreeLibrary(module);
  return hr;
}

bool EnsureFrameFile() {
  const std::wstring dir = chapcam::FrameDirectory();
  CreateDirectoryW(dir.c_str(), nullptr);

  PSECURITY_DESCRIPTOR sd = nullptr;
  if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(chapcam::kFrameFileSddl, SDDL_REVISION_1, &sd,
                                                            nullptr)) {
    Log("Security descriptor error %lu", GetLastError());
    return false;
  }
  SECURITY_ATTRIBUTES sa{sizeof(sa), sd, FALSE};
  const std::wstring path = chapcam::FrameFilePath();
  HANDLE file = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE | WRITE_DAC,
                            FILE_SHARE_READ | FILE_SHARE_WRITE, &sa, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) {
    Log("Cannot create %ls (error %lu)", path.c_str(), GetLastError());
    LocalFree(sd);
    return false;
  }

  // Re-apply the DACL when the file already existed.
  BOOL present = FALSE, defaulted = FALSE;
  PACL dacl = nullptr;
  if (GetSecurityDescriptorDacl(sd, &present, &dacl, &defaulted) && present) {
    SetSecurityInfo(file, SE_FILE_OBJECT, DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION, nullptr,
                    nullptr, dacl, nullptr);
  }
  LocalFree(sd);

  LARGE_INTEGER size;
  size.QuadPart = static_cast<LONGLONG>(chapcam::kFrameFileSize);
  const bool ok = SetFilePointerEx(file, size, nullptr, FILE_BEGIN) && SetEndOfFile(file);
  CloseHandle(file);
  if (!ok) Log("Cannot size frame file (error %lu)", GetLastError());
  return ok;
}

HRESULT CreateCamera(CreateVirtualCameraFn create, IMFVirtualCamera** camera) {
  return create(MFVirtualCameraType_SoftwareCameraSource, MFVirtualCameraLifetime_System,
                MFVirtualCameraAccess_AllUsers, chapcam::kFriendlyName, chapcam::kSourceClsidString, nullptr, 0,
                camera);
}

int Install() {
  auto create = LoadCreateVirtualCamera();
  if (!create) {
    Log("ChapCam Camera requires Windows 11 (MFCreateVirtualCamera unavailable).");
    return kUnsupportedOs;
  }
  HRESULT hr = CallDllEntry("DllRegisterServer");
  if (FAILED(hr)) {
    Log("DllRegisterServer failed 0x%08lx", hr);
    return kError;
  }
  if (!EnsureFrameFile()) return kError;

  IMFVirtualCamera* camera = nullptr;
  hr = CreateCamera(create, &camera);
  if (SUCCEEDED(hr)) hr = camera->Start(nullptr);
  if (camera) {
    camera->Shutdown();
    camera->Release();
  }
  if (FAILED(hr)) {
    Log("Virtual camera registration failed 0x%08lx", hr);
    return kError;
  }
  Log("ChapCam Camera installed.");
  return kOk;
}

int Uninstall() {
  if (auto create = LoadCreateVirtualCamera()) {
    IMFVirtualCamera* camera = nullptr;
    HRESULT hr = CreateCamera(create, &camera);
    if (SUCCEEDED(hr)) hr = camera->Remove();
    if (camera) {
      camera->Shutdown();
      camera->Release();
    }
    if (FAILED(hr)) Log("Virtual camera removal returned 0x%08lx", hr);
  }
  const HRESULT hr = CallDllEntry("DllUnregisterServer");
  if (FAILED(hr)) Log("DllUnregisterServer returned 0x%08lx", hr);
  DeleteFileW(chapcam::FrameFilePath().c_str());
  return kOk;
}

int Status() {
  if (!LoadCreateVirtualCamera()) {
    Log("unsupported-os");
    return kUnsupportedOs;
  }
  const DWORD attrs = GetFileAttributesW(chapcam::FrameFilePath().c_str());
  if (attrs == INVALID_FILE_ATTRIBUTES) {
    Log("not-installed");
    return kNotInstalled;
  }
  Log("ready");
  return kOk;
}

bool ReadExact(uint8_t* dst, size_t bytes) {
  size_t done = 0;
  while (done < bytes) {
    const size_t n = fread(dst + done, 1, bytes - done, stdin);
    if (n == 0) return false;
    done += n;
  }
  return true;
}

int Stream(uint32_t width, uint32_t height) {
  if (width == 0 || height == 0 || width > chapcam::kMaxWidth || height > chapcam::kMaxHeight) {
    Log("Invalid size %ux%u (max %ux%u)", width, height, chapcam::kMaxWidth, chapcam::kMaxHeight);
    return kError;
  }
  const std::wstring path = chapcam::FrameFilePath();
  HANDLE file = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr,
                            OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) {
    Log("Frame file missing (%lu). Reinstall ChapCam.", GetLastError());
    return kNotInstalled;
  }
  HANDLE mapping = CreateFileMappingW(file, nullptr, PAGE_READWRITE, 0, 0, nullptr);
  if (!mapping) {
    Log("CreateFileMapping failed %lu", GetLastError());
    CloseHandle(file);
    return kError;
  }
  auto* view = static_cast<uint8_t*>(MapViewOfFile(mapping, FILE_MAP_WRITE, 0, 0, chapcam::kFrameFileSize));
  if (!view) {
    Log("MapViewOfFile failed %lu", GetLastError());
    CloseHandle(mapping);
    CloseHandle(file);
    return kError;
  }

  auto* header = reinterpret_cast<chapcam::FrameHeader*>(view);
  uint8_t* pixels = view + sizeof(chapcam::FrameHeader);
  header->magic = chapcam::kFrameMagic;
  header->version = chapcam::kFrameVersion;
  if (header->sequence & 1) InterlockedIncrement64(&header->sequence);

  _setmode(_fileno(stdin), _O_BINARY);
  const size_t frameBytes = size_t(width) * height * 4;
  std::vector<uint8_t> frame(frameBytes);
  Log("Streaming %ux%u to ChapCam Camera", width, height);

  while (ReadExact(frame.data(), frameBytes)) {
    InterlockedIncrement64(&header->sequence);  // odd: writing
    header->width = width;
    header->height = height;
    memcpy(pixels, frame.data(), frameBytes);
    header->writtenAtMs = static_cast<LONG64>(GetTickCount64());
    InterlockedIncrement64(&header->sequence);  // even: stable
  }

  // Input closed: mark the frame stale right away so callers see black.
  header->writtenAtMs = 0;
  UnmapViewOfFile(view);
  CloseHandle(mapping);
  CloseHandle(file);
  return kOk;
}

}  // namespace

int wmain(int argc, wchar_t** argv) {
  if (argc < 2) {
    Log("usage: chapcam-vcam install|uninstall|status|stream W H FPS");
    return kError;
  }
  const std::wstring command = argv[1];

  if (command == L"stream") {
    if (argc < 4) return kError;
    return Stream(static_cast<uint32_t>(_wtoi(argv[2])), static_cast<uint32_t>(_wtoi(argv[3])));
  }
  if (command == L"status") return Status();

  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(hr)) return kError;
  hr = MFStartup(MF_VERSION);
  if (FAILED(hr)) {
    CoUninitialize();
    return kError;
  }
  int code = kError;
  if (command == L"install") code = Install();
  else if (command == L"uninstall") code = Uninstall();
  else Log("Unknown command");
  MFShutdown();
  CoUninitialize();
  return code;
}
