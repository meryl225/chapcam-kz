#!/usr/bin/env bash
# Builds the macOS virtual camera pieces and stages them for electron-builder:
#   resources/vcam/mac-extension/com.chapcam.desktop.camera-extension.systemextension
#     (signed here with its own entitlements; copied into the app by after-pack.js)
#   resources/vcam/mac/chapcam-vcam-mac            (signed later by electron-builder)
#   resources/vcam/mac/{arm64,x64}/vcam_activator.node
#
# Required env: APPLE_TEAM_ID, MAC_EXT_PROFILE_PATH, ELECTRON_VERSION
# Optional env: MAC_SIGN_IDENTITY (default "Developer ID Application"), BUILD_NUMBER
set -euo pipefail

: "${APPLE_TEAM_ID:?APPLE_TEAM_ID is required}"
: "${MAC_EXT_PROFILE_PATH:?MAC_EXT_PROFILE_PATH is required}"
: "${ELECTRON_VERSION:?ELECTRON_VERSION is required}"
SIGN_IDENTITY="${MAC_SIGN_IDENTITY:-Developer ID Application}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
BUILD="$ROOT/build"
EXT_ID="com.chapcam.desktop.camera-extension"
MIN_MACOS="12.3"
VERSION="$(node -p "require('$REPO/package.json').version")"
BUILD_NUMBER="${BUILD_NUMBER:-1}"

rm -rf "$BUILD"
mkdir -p "$BUILD"

compile_universal() {
  local output="$1"
  shift
  for arch in arm64 x86_64; do
    xcrun swiftc -O -target "${arch}-apple-macos${MIN_MACOS}" "$@" -o "${output}.${arch}"
  done
  lipo -create "${output}.arm64" "${output}.x86_64" -output "$output"
  rm -f "${output}.arm64" "${output}.x86_64"
}

substitute() {
  sed -e "s/__TEAM_ID__/${APPLE_TEAM_ID}/g" \
      -e "s/__EXT_ID__/${EXT_ID}/g" \
      -e "s/__VERSION__/${VERSION}/g" \
      -e "s/__BUILD__/${BUILD_NUMBER}/g" "$1"
}

echo "==> Camera extension"
EXT="$BUILD/${EXT_ID}.systemextension"
mkdir -p "$EXT/Contents/MacOS"
compile_universal "$EXT/Contents/MacOS/${EXT_ID}" "$ROOT"/CameraExtension/*.swift \
  -framework CoreMediaIO -framework CoreMedia -framework CoreVideo -framework IOKit
substitute "$ROOT/CameraExtension/Info.plist" > "$EXT/Contents/Info.plist"
cp "$MAC_EXT_PROFILE_PATH" "$EXT/Contents/embedded.provisionprofile"
substitute "$ROOT/CameraExtension/CameraExtension.entitlements" > "$BUILD/extension.entitlements"
codesign --force --options runtime --timestamp \
  --entitlements "$BUILD/extension.entitlements" \
  --sign "$SIGN_IDENTITY" "$EXT"
codesign --verify --strict --verbose=2 "$EXT"

echo "==> Frame helper"
compile_universal "$BUILD/chapcam-vcam-mac" "$ROOT/Helper/main.swift" \
  -framework CoreMediaIO -framework CoreMedia -framework CoreVideo

echo "==> Activation addon (Electron ${ELECTRON_VERSION})"
for arch in arm64 x64; do
  (cd "$ROOT/activator" && npx --yes node-gyp@10 rebuild \
    --target="$ELECTRON_VERSION" --arch="$arch" --dist-url=https://electronjs.org/headers)
  mkdir -p "$BUILD/addon/$arch"
  cp "$ROOT/activator/build/Release/vcam_activator.node" "$BUILD/addon/$arch/"
done

echo "==> Staging into resources/vcam"
rm -rf "$REPO/resources/vcam/mac" "$REPO/resources/vcam/mac-extension"
mkdir -p "$REPO/resources/vcam/mac" "$REPO/resources/vcam/mac-extension"
cp "$BUILD/chapcam-vcam-mac" "$REPO/resources/vcam/mac/"
cp -R "$BUILD/addon/arm64" "$BUILD/addon/x64" "$REPO/resources/vcam/mac/"
cp -R "$EXT" "$REPO/resources/vcam/mac-extension/"
echo "Done."
