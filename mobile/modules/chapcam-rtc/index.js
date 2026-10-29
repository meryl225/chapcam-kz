import React from 'react'
import { requireNativeView, requireOptionalNativeModule } from 'expo-modules-core'

// Optional so a binary built before this module existed keeps working (it falls back to the previous engine).
const ChapcamRtcNative = requireOptionalNativeModule('ChapcamRtc')

export const isChapcamRtcAvailable = Boolean(ChapcamRtcNative)

export const ChapcamRtc = {
  join: (options) => ChapcamRtcNative.join(options),
  switchCamera: () => ChapcamRtcNative.switchCamera(),
  leave: () => (ChapcamRtcNative ? ChapcamRtcNative.leave() : Promise.resolve()),
  addListener: (listener) => ChapcamRtcNative.addListener('onRtcEvent', listener),
}

let NativeView = null

// Renders only the transformed stream; the local camera is never drawn.
export function ChapcamRtcView(props) {
  if (!ChapcamRtcNative) return null
  if (!NativeView) NativeView = requireNativeView('ChapcamRtc')
  return <NativeView {...props} />
}
