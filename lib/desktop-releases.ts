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

const RELEASE_TAG = "desktop-v1.0.5"
const BASE = `https://github.com/meryl225/chapcam-kz/releases/download/${RELEASE_TAG}`

export const DESKTOP_VERSION = "1.0.5"

export const desktopReleases: DesktopRelease[] = [
  {
    id: "windows-x64",
    os: "windows",
    title: "Windows",
    compatibility: "Windows 11 x64",
    format: "EXE",
    fileName: "ChapCam-Setup-1.0.5-x64.exe",
    url: `${BASE}/ChapCam-Setup-1.0.5-x64.exe`,
    sizeBytes: 322304138,
    sha256: "e80cc4c810a6ab4e0732355f4a4ed67528e542241296b4115f5a18451d283fae",
    sourceCommit: "6f88e7dc",
    sourceRun: "40192778566",
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
