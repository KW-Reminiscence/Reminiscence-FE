import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeSpeech } from '../../api/client'

export type SpeechPlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'blocked'
  | 'error'

export function useSpeechPlayer() {
  const [status, setStatus] = useState<SpeechPlayerStatus>('idle')
  const currentKeyRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
    }
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const play = useCallback(
    async (text: string, key: string, force = false) => {
      if (!force && currentKeyRef.current === key) return

      currentKeyRef.current = key
      abortRef.current?.abort()
      releaseAudio()

      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')

      try {
        const blob = await synthesizeSpeech(text, controller.signal)
        if (controller.signal.aborted) return

        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        const audio = new Audio(objectUrl)
        audioRef.current = audio
        audio.onended = () => setStatus('idle')
        audio.onerror = () => setStatus('error')

        await audio.play()
        setStatus('playing')
      } catch (cause) {
        if (controller.signal.aborted) return
        if (
          cause instanceof DOMException &&
          cause.name === 'NotAllowedError'
        ) {
          setStatus('blocked')
          return
        }
        setStatus('error')
      }
    },
    [releaseAudio],
  )

  const resume = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return false

    try {
      audio.currentTime = 0
      await audio.play()
      setStatus('playing')
      return true
    } catch {
      setStatus('blocked')
      return false
    }
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      releaseAudio()
    },
    [releaseAudio],
  )

  return { status, play, resume }
}
