import { z } from 'zod'

const dateTime = z.string().datetime({ offset: true })
const nullableDateTime = dateTime.nullable()
const speechText = z.object({
  display_text: z.string(),
  spoken_text: z.string(),
})
const photoMemory = z.object({
  id: z.string(),
  image_base64: z.string(),
  image_media_type: z.string(),
  location: z.string(),
  people: z.array(z.string()),
  event: z.string(),
  description: z.string(),
})
const routineState = z.enum(['REMINDING', 'CONFIRMED', 'NOT_ANSWERED'])
const routinePrompt = z.object({
  execution_id: z.string(),
  routine_id: z.string(),
  name: z.string(),
  category: z.enum(['MEAL', 'MEDICATION']),
  state: routineState,
  scheduled_at: dateTime,
  reminder_count: z.number().int().nonnegative(),
  display_text: z.string(),
  spoken_text: z.string(),
  confirm_label: z.string(),
})
const routineExecution = z.object({
  execution_id: z.string(),
  routine_id: z.string(),
  name: z.string(),
  state: routineState,
  scheduled_at: dateTime,
  reminder_count: z.number().int().nonnegative(),
  confirmed_at: nullableDateTime,
  confirmation_delay_seconds: z.number().int().nonnegative().nullable(),
  closed_at: nullableDateTime,
})
const conversationSuggestion = z.object({
  suggested: z.boolean(),
  scheduled_time: z.string(),
  display_text: z.string().nullable(),
  spoken_text: z.string().nullable(),
  start_label: z.string().nullable(),
})
const completionReason = z.enum([
  'USER_FINISHED',
  'INACTIVITY_TIMEOUT',
  'MAX_DURATION',
  'NAVIGATION',
])
const conversationSummary = z.object({
  session_id: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED']),
  started_at: dateTime,
  completed_at: nullableDateTime,
  completion_reason: completionReason.nullable(),
  user_turn_count: z.number().int().nonnegative(),
  total_utterance_chars: z.number().int().nonnegative(),
  average_utterance_chars: z.number().nonnegative().nullable(),
  average_turn_duration_seconds: z.number().nonnegative().nullable(),
  no_response_count: z.number().int().nonnegative(),
})
const anomalyStatus = z.enum(['NORMAL', 'ANOMALOUS'])
const domainEvaluation = z.object({
  status: anomalyStatus,
  mode: z.enum(['COLD_START', 'ISOLATION_FOREST', 'INSUFFICIENT_DATA']),
  sample_count: z.number().int().nonnegative(),
  score: z.number().nullable(),
  reasons: z.array(z.string()),
  feature_names: z.array(z.string()),
  rule_based_signal: z.boolean(),
  isolation_forest_signal: z.boolean(),
  persistence_signal: z.boolean(),
  signal_count: z.number().int().min(0).max(3),
  observation_key: z.string().nullable(),
})

export const apiSchemas = {
  health: z.object({ status: z.literal('ok') }),
  currentRoutines: z.object({
    server_time: dateTime,
    items: z.array(routinePrompt),
  }),
  routineExecution,
  routineHistory: z.array(routineExecution),
  conversationSuggestion,
  startConversation: z.object({
    session_id: z.string(),
    status: z.enum(['ACTIVE', 'COMPLETED']),
    photo: photoMemory,
    question: speechText,
  }),
  conversationTurn: z.object({
    turn_id: z.string(),
    utterance_chars: z.number().int().nonnegative(),
    turn_duration_seconds: z.number().nonnegative(),
    chars_per_second: z.number().nonnegative().nullable(),
    no_response: z.boolean(),
    speech_detected: z.boolean().nullable(),
    next_question: speechText,
  }),
  conversationSummary,
  conversationHistory: z.array(conversationSummary),
  personalState: z.object({
    evaluated_at: dateTime,
    status: anomalyStatus,
    became_anomalous: z.boolean(),
    consecutive_anomalous_evaluations: z.number().int().nonnegative(),
    routine: domainEvaluation,
    conversation: domainEvaluation,
  }),
  session: z.object({
    role: z.enum(['GUARDIAN', 'TABLET']),
    expires_at: dateTime,
  }),
  tabletState: z.object({
    server_time: dateTime,
    active_routines: z.array(routinePrompt),
    conversation_suggestion: conversationSuggestion,
    photos: z.array(photoMemory),
    active_conversation_session_id: z.string().nullable(),
  }),
}

