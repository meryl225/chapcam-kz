// Shared-memory contract between chapcam-vcam.exe (writer, runs as the user)
// and ChapCamVCamSource.dll (reader, loaded by the Windows Frame Server
// service). A file-backed mapping under %ProgramData% is used instead of a
// Global\ named section because creating Global\ objects requires
// SeCreateGlobalPrivilege, which standard users do not have.
#pragma once

#include <windows.h>
#include <shlobj.h>
#include <stdint.h>
#include <string>

namespace chapcam {

constexpr uint32_t kFrameMagic = 0x46564343;  // "CCVF"
constexpr uint32_t kFrameVersion = 1;
constexpr uint32_t kMaxWidth = 1920;
constexpr uint32_t kMaxHeight = 1080;

constexpr uint32_t kOutWidth = 1280;
constexpr uint32_t kOutHeight = 720;
constexpr uint32_t kOutFps = 30;

// A frame older than this is considered stale and replaced by a black frame.
constexpr uint64_t kStaleAfterMs = 1500;

#pragma pack(push, 8)
struct FrameHeader {
  uint32_t magic;
  uint32_t version;
  uint32_t width;
  uint32_t height;
  // Seqlock: odd while the writer is copying pixels, even when stable.
  volatile LONG64 sequence;
  // GetTickCount64() of the last completed write (system-wide clock).
  volatile LONG64 writtenAtMs;
  uint8_t reserved[24];
};
#pragma pack(pop)
static_assert(sizeof(FrameHeader) == 64, "FrameHeader layout must stay 64 bytes");

constexpr size_t kPixelBytesMax = size_t(kMaxWidth) * kMaxHeight * 4;
constexpr size_t kFrameFileSize = sizeof(FrameHeader) + kPixelBytesMax;

constexpr const wchar_t* kFriendlyName = L"ChapCam Camera";
constexpr const wchar_t* kSourceClsidString = L"{7E3C9B21-5A4F-4C8E-9D21-3B6F0A1C2D45}";

// Everyone, all app packages, LocalService, SYSTEM and Administrators get full
// access so the Frame Server (LocalService) can read what the user writes.
constexpr const wchar_t* kFrameFileSddl =
    L"D:P(A;;GA;;;WD)(A;;GA;;;AC)(A;;GA;;;LS)(A;;GA;;;SY)(A;;GA;;;BA)";

inline std::wstring FrameDirectory() {
  std::wstring base = L"C:\\ProgramData";
  PWSTR known = nullptr;
  if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_ProgramData, 0, nullptr, &known)) && known) {
    base = known;
  }
  if (known) CoTaskMemFree(known);
  return base + L"\\ChapCam";
}

inline std::wstring FrameFilePath() { return FrameDirectory() + L"\\vcam-frame.bin"; }

}  // namespace chapcam
