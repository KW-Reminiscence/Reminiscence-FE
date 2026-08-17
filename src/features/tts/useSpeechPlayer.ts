import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeSpeech } from '../../api/client'
import {
  getSpeechAudioContext,
  unlockSpeechAudio,
} from './speechAudio'

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

type SpeechSynthesizer = (
  text: string,
  signal?: AbortSignal,
) => Promise<Blob>

export function useSpeechPlayer(
  synthesize: SpeechSynthesizer = synthesizeSpeech,
) {
  const [status, setStatus] = useState<SpeechPlayerStatus>('idle')
  const currentKeyRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const decodedAudioRef = useRef<AudioBuffer | null>(null)
  const resolvePlaybackRef = useRef<
    ((result: SpeechPlaybackResult) => void) | null
  >(null)

  const releaseAudio = useCallback(() => {
    resolvePlaybackRef.current?.('error')
    resolvePlaybackRef.current = null
    decodedAudioRef.current = null
    if (sourceRef.current) {
      sourceRef.current.onended = null
      try {
        sourceRef.current.stop()
      } catch {
        // The source already stopped naturally.
      }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
  }, [])

  const startDecodedAudio = useCallback(
    async (waitUntilEnded: boolean): Promise<SpeechPlaybackResult> => {
      const audioBuffer = decodedAudioRef.current
      if (!audioBuffer) {
        setStatus('error')
        return 'error'
      }

      const context = getSpeechAudioContext()
      if (context.state !== 'running') {
        setStatus('blocked')
        return 'blocked'
      }

      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      sourceRef.current = source

      let settlePlayback: (result: SpeechPlaybackResult) => void = () => {}
      const playbackEnded = new Promise<SpeechPlaybackResult>((resolve) => {
        settlePlayback = resolve
      })
      resolvePlaybackRef.current = settlePlayback

      source.onended = () => {
        if (sourceRef.current !== source) return
        source.disconnect()
        sourceRef.current = null
        resolvePlaybackRef.current = null
        setStatus('idle')
        settlePlayback('ended')
      }

      try {
        source.start()
        setStatus('playing')
        if (waitUntilEnded) return playbackEnded
        return 'started'
      } catch {
        source.onended = null
        source.disconnect()
        sourceRef.current = null
        resolvePlaybackRef.current = null
        setStatus('error')
        settlePlayback('error')
        return 'error'
      }
    },
    [],
  )

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
        const blob = await synthesize(text, controller.signal)
        if (controller.signal.aborted) return 'error'

        const encodedAudio = await blob.arrayBuffer()
        if (controller.signal.aborted) return 'error'
        decodedAudioRef.current =
          await getSpeechAudioContext().decodeAudioData(encodedAudio)
        if (controller.signal.aborted) return 'error'

        return startDecodedAudio(waitUntilEnded)
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
    [releaseAudio, startDecodedAudio, synthesize],
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
    const unlocked = await unlockSpeechAudio()
    if (!unlocked) {
      setStatus('blocked')
      return false
    }
    return (await startDecodedAudio(false)) === 'started'
  }, [startDecodedAudio])

  const resumeAndWait = useCallback(async (): Promise<SpeechPlaybackResult> => {
    const unlocked = await unlockSpeechAudio()
    if (!unlocked) {
      setStatus('blocked')
      return 'blocked'
    }
    return startDecodedAudio(true)
  }, [startDecodedAudio])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    currentKeyRef.current = null
    releaseAudio()
    setStatus('idle')
  }, [releaseAudio])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      currentKeyRef.current = null
      releaseAudio()
    },
    [releaseAudio],
  )

  return { status, play, playAndWait, resume, resumeAndWait, stop }
}
