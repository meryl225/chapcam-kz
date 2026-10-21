import React, { forwardRef } from 'react'
import { Text as RNText, TextInput as RNTextInput } from 'react-native'
import { translate, translateChildren, useLanguage } from './index'

export const Text = forwardRef(function Text({ children, accessibilityLabel, ...props }, ref) {
  useLanguage()
  return (
    <RNText ref={ref} accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : accessibilityLabel} {...props}>
      {translateChildren(children)}
    </RNText>
  )
})

export const TextInput = forwardRef(function TextInput({ placeholder, accessibilityLabel, ...props }, ref) {
  useLanguage()
  return (
    <RNTextInput
      ref={ref}
      placeholder={placeholder ? translate(placeholder) : placeholder}
      accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : accessibilityLabel}
      {...props}
    />
  )
})
