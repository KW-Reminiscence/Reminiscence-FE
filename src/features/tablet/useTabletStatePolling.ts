import { useCallback, useEffect, useRef, useState } from 'react'
import { getTabletState } from '../../api/client'
import type { TabletStateResponse } from '../../api/types'

export type TabletPollingStatus = 'loading' | 'ready' | 'stale' | 'error'

interface TabletPollingState {
  status: TabletPollingStatus
  data: TabletStateResponse | null
  error: string | null
  lastUpdatedAt: number | null
}

const initialState: TabletPollingState = {
  status: 'loading',
  data: null,
  error: null,
  lastUpdatedAt: null,
}

export function useTabletStatePolling(intervalMs = 5_000) {
  const [state, setState] = useState(initialState)
  const [sequence, setSequence] = useState(0)
  const dataRef = useRef<TabletStateResponse | null>(null)
  const refresh = useCallback(() => setSequence((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    const poll = async () => {
      try {
        const data = await getTabletState(controller.signal)
        if (controller.signal.aborted) return
        dataRef.current = data
        setState({
          status: 'ready',
          data,
          error: null,
          lastUpdatedAt: Date.now(),
        })
      } catch {
        if (controller.signal.aborted) return
        setState((current) => ({
          ...current,
          status: dataRef.current ? 'stale' : 'error',
          data: dataRef.current,
          error: '서버의 최신 상태를 확인하지 못했어요.',
        }))
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), intervalMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [intervalMs, sequence])

  return { ...state, refresh }
}
