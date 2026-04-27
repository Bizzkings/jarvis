'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { UseSpeechSynthesisReturn } from '@/lib/assistant/types'

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    clearKeepAlive()
    setIsSpeaking(false)
  }, [clearKeepAlive])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onend = () => {
        clearKeepAlive()
        setIsSpeaking(false)
        onEnd?.()
      }

      utterance.onerror = () => {
        clearKeepAlive()
        setIsSpeaking(false)
      }

      setIsSpeaking(true)

      // Chrome pauses TTS after ~15s — keep it alive
      keepAliveRef.current = setInterval(() => {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 10_000)

      window.speechSynthesis.speak(utterance)
    },
    [cancel, clearKeepAlive]
  )

  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  return { isSpeaking, speak, cancel }
}
