import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { C } from './catalog'

// Transparent, uncropped export of the website's /public/chapcam-mark.png, centered on a square canvas.
const SYMBOL = require('../../assets/chapcam-symbol.png')

export function ChapCamBrand({ markSize = 46, textSize = 28, style }) {
  return (
    <View style={[styles.row, style]} accessible accessibilityRole="header" accessibilityLabel="ChapCam">
      <Image
        source={SYMBOL}
        resizeMode="contain"
        style={{ width: markSize, height: markSize }}
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[styles.wordmark, { fontSize: textSize, lineHeight: Math.round(textSize * 1.15) }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        ChapCam
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { color: C.ink, fontWeight: '800', letterSpacing: -0.8, includeFontPadding: false },
})
