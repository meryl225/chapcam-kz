import { NextResponse, type NextRequest } from "next/server"

const REPO = "meryl225/chapcam-kz"

type Asset = { name: string; browser_download_url: string }
type Release = { draft: boolean; prerelease: boolean; assets: Asset[] }

// Each target resolves to the newest published release that contains a matching file,
// so /download/<target> links stay stable across versions.
const TARGETS: Record<string, (name: string) => boolean> = {
  "windows-x64": (n) => /\.exe$/i.test(n) && /setup/i.test(n) && !/arm64/i.test(n),
  "windows-arm64": (n) => /\.exe$/i.test(n) && /setup/i.test(n) && /arm64/i.test(n),
  "mac-arm64": (n) => /\.dmg$/i.test(n) && /arm64/i.test(n),
  "mac-x64": (n) => /\.dmg$/i.test(n) && !/arm64/i.test(n),
}

async function getReleases(): Promise<Release[]> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  return res.json()
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ target: string }> }) {
  const { target } = await params
  const matches = TARGETS[target]
  const fallback = new URL(`/download?unavailable=${encodeURIComponent(target)}`, request.url)
  if (!matches) return NextResponse.redirect(fallback)

  const releases = (await getReleases()).filter((r) => !r.draft && !r.prerelease)
  for (const release of releases) {
    const asset = release.assets.find((a) => matches(a.name))
    if (asset) return NextResponse.redirect(asset.browser_download_url, 302)
  }
  return NextResponse.redirect(fallback)
}
