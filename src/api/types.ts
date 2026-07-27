export type RoutineCategory = 'MEAL' | 'MEDICATION'
export type RoutineState = 'REMINDING' | 'CONFIRMED' | 'NOT_ANSWERED'

export interface RoutinePrompt {
  execution_id: string
  routine_id: string
  name: string
  category: RoutineCategory
  state: RoutineState
  scheduled_at: string
  reminder_count: number
  display_text: string
  spoken_text: string
  confirm_label: string
}

export interface CurrentRoutinesResponse {
  server_time: string
  items: RoutinePrompt[]
}

export interface RoutineExecution {
  execution_id: string
  routine_id: string
  state: RoutineState
  scheduled_at: string
  reminder_count: number
  confirmed_at: string | null
  confirmation_delay_seconds: number | null
  closed_at: string | null
}

export type ConversationSource = 'SCHEDULED' | 'VOLUNTARY'
export type ConversationStatus = 'ACTIVE' | 'COMPLETED'

export interface SpeechText {
  display_text: string
  spoken_text: string
}

export interface ConversationSuggestion {
  suggested: boolean
  scheduled_time: string
  display_text: string | null
  spoken_text: string | null
  start_label: string | null
}

export interface StartConversationRequest {
  source: ConversationSource
  photo_id?: string | null
}

export interface StartConversationResponse {
  session_id: string
  status: ConversationStatus
  photo_id: string | null
  image_url: string | null
  question: SpeechText
}

export interface ConversationTurnResponse {
  turn_id: string
  utterance_chars: number
  turn_duration_seconds: number
  chars_per_second: number | null
  no_response: boolean
  next_question: SpeechText
}

export interface ConversationSummary {
  session_id: string
  status: ConversationStatus
  started_at: string
  completed_at: string | null
  user_turn_count: number
  total_utterance_chars: number
  average_utterance_chars: number | null
  average_turn_duration_seconds: number | null
  no_response_count: number
}

export type AnomalyStatus = 'NORMAL' | 'ANOMALOUS'
export type AnomalyMode = 'COLD_START' | 'PERSONAL_MODEL' | 'INSUFFICIENT_DATA'

export interface DomainEvaluation {
  status: AnomalyStatus
  mode: AnomalyMode
  sample_count: number
  score: number | null
  reasons: string[]
  feature_names: string[]
}

export interface PersonalState {
  evaluated_at: string
  status: AnomalyStatus
  became_anomalous: boolean
  consecutive_anomalous_evaluations: number
  routine: DomainEvaluation
  conversation: DomainEvaluation
}

export interface HealthResponse {
  status: string
}
