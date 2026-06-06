'use client'

import { useEffect } from 'react'

// Anti-debugging and anti-scraping measures for production
export function SecurityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only enable in production
    if (process.env.NODE_ENV !== 'production') return
    
    // Disable right-click context menu on sensitive areas
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Allow right-click on text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      // Block on video elements and sensitive data
      if (target.closest('[data-protected]') || target.tagName === 'VIDEO') {
        e.preventDefault()
      }
    }
    
    // Detect DevTools opening (basic detection)
    let devtoolsOpen = false
    const threshold = 160
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold
      
      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true
          console.log('%c[ChapCam Security]', 'color: #00ff88; font-weight: bold', 
            'DevTools detecte. Certaines fonctionnalites de protection sont actives.')
        }
      } else {
        devtoolsOpen = false
      }
    }
    
    // Disable certain keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }
      
      // Disable Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        return false
      }
      
      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        return false
      }
      
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault()
        return false
      }
    }
    
    // Add watermark to console
    console.log(
      '%c ChapCam - Swap en Temps Reel ',
      'background: linear-gradient(90deg, #00ff88, #00d4ff); color: #0a0e1a; font-size: 20px; font-weight: bold; padding: 10px 20px; border-radius: 5px;'
    )
    console.log(
      '%cAttention: Toute tentative de reverse engineering ou de clonage est interdite et surveillee.',
      'color: #ff4444; font-size: 12px;'
    )
    
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    
    const devToolsInterval = setInterval(checkDevTools, 1000)
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      clearInterval(devToolsInterval)
    }
  }, [])
  
  return <>{children}</>
}

// Hook to mark elements as protected
export function useProtectedElement() {
  return { 'data-protected': true }
}

// Obfuscate sensitive strings in frontend
export function obfuscateApiUrl(url: string): string {
  // In production, use masked endpoints
  if (process.env.NODE_ENV === 'production') {
    const mappings: Record<string, string> = {
      '/api/decart-token': '/api/v1/token',
      '/api/decart-session': '/api/v1/session',
      '/api/swap/cloud': '/api/v1/transform',
      '/api/faceswap/stream': '/api/v1/stream',
    }
    return mappings[url] || url
  }
  return url
}
