import { useCallback, useEffect, useState } from 'react'
import { getCurrentRoutines } from '../../api/client'
import type { CurrentRoutinesResponse } from '../../api/types'

const DEFAULT_POLL_INTERVAL_MS = 5_000

interface RoutinePollingState {
  status: 'loading' | 'ready' | 'error'
  data: CurrentRoutinesResponse | null
  error: Error | null
}

const initialState: RoutinePollingState = {
  status: 'loading',
  data: null,
  error: null,
}

export function useRoutinePolling(
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  const [state, setState] = useState<RoutinePollingState>(initialState)
  const [refreshSequence, setRefreshSequence] = useState(0)

  const refresh = useCallback(() => {
    setRefreshSequence((current) => current + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    let polling = false

    async function poll() {
      if (polling || controller.signal.aborted) return
      polling = true
      try {
        const data = await getCurrentRoutines(controller.signal)
        setState({ status: 'ready', data, error: null })
      } catch (cause) {
        if (controller.signal.aborted) return
        const error =
          cause instanceof Error ? cause : new Error('루틴 조회에 실패했습니다.')
        setState((current) => ({
          status: current.data ? 'ready' : 'error',
          data: current.data,
          error,
        }))
      } finally {
        polling = false
        if (!controller.signal.aborted) {
          timer = window.setTimeout(poll, pollIntervalMs)
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (timer !== undefined) window.clearTimeout(timer)
        void poll()
      }
    }

    void poll()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pollIntervalMs, refreshSequence])

  return { ...state, refresh }
}
