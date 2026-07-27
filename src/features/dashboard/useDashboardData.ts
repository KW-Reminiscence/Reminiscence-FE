import { useCallback, useEffect, useState } from 'react'
import {
  getAnomalyState,
  getConversationHistory,
  getRoutineHistory,
} from '../../api/client'
import type {
  ConversationSummary,
  PersonalState,
  RoutineExecution,
} from '../../api/types'

interface DashboardDataState {
  loading: boolean
  routines: RoutineExecution[]
  conversations: ConversationSummary[]
  personalState: PersonalState | null
  failedSections: string[]
}

const initialState: DashboardDataState = {
  loading: true,
  routines: [],
  conversations: [],
  personalState: null,
  failedSections: [],
}

export function useDashboardData() {
  const [state, setState] = useState(initialState)
  const [refreshSequence, setRefreshSequence] = useState(0)
  const refresh = useCallback(() => {
    setRefreshSequence((current) => current + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setState((current) => ({ ...current, loading: true }))
      const [routines, conversations, personalState] =
        await Promise.allSettled([
          getRoutineHistory(controller.signal),
          getConversationHistory(controller.signal),
          getAnomalyState(controller.signal),
        ])
      if (controller.signal.aborted) return

      const failedSections: string[] = []
      if (routines.status === 'rejected') failedSections.push('일정 이력')
      if (conversations.status === 'rejected') failedSections.push('대화 이력')
      if (personalState.status === 'rejected') failedSections.push('현재 상태')

      setState((current) => ({
        loading: false,
        routines:
          routines.status === 'fulfilled' ? routines.value : current.routines,
        conversations:
          conversations.status === 'fulfilled'
            ? conversations.value
            : current.conversations,
        personalState:
          personalState.status === 'fulfilled'
            ? personalState.value
            : current.personalState,
        failedSections,
      }))
    }

    void load()
    return () => controller.abort()
  }, [refreshSequence])

  return { ...state, refresh }
}
