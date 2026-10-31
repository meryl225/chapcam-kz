// Public ChapCam Desktop installers shown on the homepage.
// Files are hosted on a GitHub release of the public repository, so they
// never expire and download without a GitHub account.
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

const RELEASES = "https://github.com/meryl225/chapcam-kz/releases/download"
const WINDOWS_BASE = `${RELEASES}/desktop-v1.0.6`
// The Mac installers were not rebuilt for 1.0.6.
const BASE = `${RELEASES}/desktop-v1.0.5`

export const DESKTOP_VERSION = "1.0.6"

export const desktopReleases: DesktopRelease[] = [
  {
    id: "windows-x64",
    os: "windows",
    title: "Windows",
    compatibility: "Windows 11 x64",
    format: "EXE",
    fileName: "ChapCam-Setup-1.0.6-x64.exe",
    url: `${WINDOWS_BASE}/ChapCam-Setup-1.0.6-x64.exe`,
    sizeBytes: 323405538,
    sha256: "b2e4f2e6aca9d624b6f92ebc4970d53c843080d8757599e2893ea26c59117f1d",
    sourceCommit: "ad82b7e5",
    sourceRun: "41131267580",
    signed: false,
    status: "validated",
  },
  {
    id: "mac-arm64",
    os: "mac",
    title: "Mac Apple Silicon",
    compatibility: "Mac M1, M2, M3, M4 et modèles ultérieurs",
    format: "DMG",
    fileName: "ChapCam-1.0.5-arm64.dmg",
    url: `${BASE}/ChapCam-1.0.5-arm64.dmg`,
    sizeBytes: 376819879,
    sha256: "e3a08d86c3ec28fd51a087218f3a1f9640ec1574b8b473c6746f2a4b53665fca",
    sourceCommit: "6f88e7dc",
    sourceRun: "40192778566",
    signed: true,
    status: "validated",
  },
  {
    id: "mac-x64",
    os: "mac",
    title: "Mac Intel",
    compatibility: "Mac avec processeur Intel",
    format: "DMG",
    fileName: "ChapCam-1.0.5-x64.dmg",
    url: `${BASE}/ChapCam-1.0.5-x64.dmg`,
    sizeBytes: 382888314,
    sha256: "c6addf0772adf7cf62c7df65a1aa25d522392ccc8b803cd1e9bf8695cc15be54",
    sourceCommit: "6f88e7dc",
    sourceRun: "40192778566",
    signed: true,
    status: "validated",
  },
]
