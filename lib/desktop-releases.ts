// Public ChapCam Desktop installers shown on the homepage.
// Files are hosted on a GitHub pre-release of the public repository, so they
// never expire and download without a GitHub account. Pre-releases are ignored
// by /download/<target>, which keeps serving the last stable release.
//
// status:
//   "validated"   tested on real hardware, shown as the official version
//   "test"        built, signed where possible, not yet tested on real hardware
//   "unavailable" no public file: no download button is rendered

export type DesktopReleaseStatus = "validated" | "test" | "unavailable"

export type DesktopRelease = {
  id: "windows-x64" | "mac-arm64" | "mac-x64"
  os: "windows" | "mac"
  title: string
  compatibility: string
  format: "EXE" | "DMG"
  fileName: string
  url: string | null
  sizeBytes: number
  sha256: string
  sourceCommit: string
  sourceRun: string
  signed: boolean
  status: DesktopReleaseStatus
}

const RELEASE_TAG = "desktop-beta-1.0.0-1"
const BASE = `https://github.com/meryl225/chapcam-kz/releases/download/${RELEASE_TAG}`

export const DESKTOP_VERSION = "1.0.0"

export const desktopReleases: DesktopRelease[] = [
  {
    id: "windows-x64",
    os: "windows",
    title: "Windows",
    compatibility: "Windows 11 x64",
    format: "EXE",
    fileName: "ChapCam-Setup-1.0.0-x64.exe",
    url: `${BASE}/ChapCam-Setup-1.0.0-x64.exe`,
    sizeBytes: 321520094,
    sha256: "3ca717fefb9676c469862407312e664a2b35d1bfa113ec173d8073486bb13f9c",
    sourceCommit: "bccf1fa",
    sourceRun: "38969032116",
    signed: false,
    status: "validated",
  },
  {
    id: "mac-arm64",
    os: "mac",
    title: "Mac Apple Silicon",
    compatibility: "Mac M1, M2, M3, M4 et modèles ultérieurs",
    format: "DMG",
    fileName: "ChapCam-1.0.0-arm64.dmg",
    url: `${BASE}/ChapCam-1.0.0-arm64.dmg`,
    sizeBytes: 375868782,
    sha256: "f222e8cc259f8e2439c526b6ce2e79d09ac5babf42118d4d8c75abd944dfcbca",
    sourceCommit: "41d8b53",
    sourceRun: "39027065439",
    signed: true,
    status: "validated",
  },
  {
    id: "mac-x64",
    os: "mac",
    title: "Mac Intel",
    compatibility: "Mac avec processeur Intel",
    format: "DMG",
    fileName: "ChapCam-1.0.0-x64.dmg",
    url: `${BASE}/ChapCam-1.0.0-x64.dmg`,
    sizeBytes: 381959780,
    sha256: "bcf4732b9e4b8cd79d05256b60bbab1fe882972d89ee6675c3022f312c1d102e",
    sourceCommit: "41d8b53",
    sourceRun: "39027065439",
    signed: true,
    status: "validated",
  },
]
