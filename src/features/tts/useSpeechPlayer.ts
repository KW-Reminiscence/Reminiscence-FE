import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeSpeech } from '../../api/client'

export type SpeechPlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'blocked'
  | 'error'

export type SpeechPlaybackResult =
  | 'started'
  | 'ended'
  | 'blocked'
  | 'error'

export function useSpeechPlayer() {
  const [status, setStatus] = useState<SpeechPlayerStatus>('idle')
  const currentKeyRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const resolvePlaybackRef = useRef<
    ((result: SpeechPlaybackResult) => void) | null
  >(null)

  const releaseAudio = useCallback(() => {
    resolvePlaybackRef.current?.('error')
    resolvePlaybackRef.current = null
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

  const playInternal = useCallback(
    async (
      text: string,
      key: string,
      force: boolean,
      waitUntilEnded: boolean,
    ): Promise<SpeechPlaybackResult> => {
      if (!force && currentKeyRef.current === key) return 'ended'

      currentKeyRef.current = key
      abortRef.current?.abort()
      releaseAudio()

      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')

      try {
        const blob = await synthesizeSpeech(text, controller.signal)
        if (controller.signal.aborted) return 'error'

        const objectUrl = URL.createObjectURL(blob)
        objectUrlRef.current = objectUrl
        const audio = new Audio(objectUrl)
        audioRef.current = audio
        let resolvePlayback:
          | ((result: SpeechPlaybackResult) => void)
          | null = null
        const playbackEnded = new Promise<SpeechPlaybackResult>((resolve) => {
          resolvePlayback = resolve
        })
        resolvePlaybackRef.current = resolvePlayback

        audio.onended = () => {
          resolvePlaybackRef.current = null
          setStatus('idle')
          resolvePlayback?.('ended')
        }
        audio.onerror = () => {
          resolvePlaybackRef.current = null
          setStatus('error')
          resolvePlayback?.('error')
        }

        await audio.play()
        setStatus('playing')
        if (waitUntilEnded) return playbackEnded
        return 'started'
      } catch (cause) {
        if (controller.signal.aborted) return 'error'
        if (
          cause instanceof DOMException &&
          cause.name === 'NotAllowedError'
        ) {
          setStatus('blocked')
          return 'blocked'
        }
        setStatus('error')
        return 'error'
      }
    },
    [releaseAudio],
  )

  const play = useCallback(
    (text: string, key: string, force = false) =>
      playInternal(text, key, force, false),
    [playInternal],
  )

  const playAndWait = useCallback(
    (text: string, key: string, force = false) =>
      playInternal(text, key, force, true),
    [playInternal],
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

  const stop = useCallback(() => {
    abortRef.current?.abort()
    currentKeyRef.current = null
    releaseAudio()
    setStatus('idle')
  }, [releaseAudio])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      releaseAudio()
    },
    [releaseAudio],
  )

  return { status, play, playAndWait, resume, stop }
}
