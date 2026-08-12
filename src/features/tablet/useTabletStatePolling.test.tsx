import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import type { TabletStateResponse } from '../../api/types'
import { useTabletStatePolling } from './useTabletStatePolling'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getTabletState: vi.fn(),
}))

const getTabletState = vi.mocked(api.getTabletState)
const tabletState: TabletStateResponse = {
  server_time: '2026-08-13T09:00:00+09:00',
  active_routines: [],
  conversation_suggestion: {
    suggested: false,
    scheduled_time: '14:00:00',
    display_text: null,
    spoken_text: null,
    start_label: null,
  },
  photos: [],
  active_conversation_session_id: null,
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useTabletStatePolling', () => {
  it('marks retained data stale after a later poll fails', async () => {
    vi.useFakeTimers()
    getTabletState
      .mockResolvedValueOnce(tabletState)
      .mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useTabletStatePolling(5_000))

    await act(async () => Promise.resolve())
    expect(result.current.status).toBe('ready')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })

    expect(result.current.status).toBe('stale')
    expect(result.current.data).toEqual(tabletState)
    expect(result.current.error).toContain('최신 상태')
  })

  it('reports an initial failure without fabricating data', async () => {
    getTabletState.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useTabletStatePolling())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
  })
})
