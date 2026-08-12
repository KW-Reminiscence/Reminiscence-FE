import { expect, test, type Page, type Route } from '@playwright/test'

const photo = {
  id: 'family-1',
  image_base64: 'aGVsbG8=',
  image_media_type: 'image/jpeg',
  location: '서울',
  people: ['가족'],
  event: '생일',
  description: '함께 웃는 가족사진',
}

const suggestion = {
  suggested: false,
  scheduled_time: '14:00:00',
  display_text: null,
  spoken_text: null,
  start_label: null,
}

function tabletState(overrides: Record<string, unknown> = {}) {
  return {
    server_time: '2026-08-13T09:00:00+09:00',
    active_routines: [],
    conversation_suggestion: suggestion,
    photos: [photo],
    active_conversation_session_id: null,
    ...overrides,
  }
}

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  })
}

async function installAudioAndMicrophone(page: Page) {
  await page.addInitScript(() => {
    class FakeSource {
      onended: (() => void) | null = null
      connect() {}
      disconnect() {}
      start() { setTimeout(() => this.onended?.(), 0) }
      stop() {}
    }
    class FakeAudioContext {
      state = 'running'
      sampleRate = 16_000
      destination = {}
      audioWorklet = { addModule: async () => undefined }
      createBufferSource() { return new FakeSource() }
      createMediaStreamSource() { return { connect() {}, disconnect() {} } }
      createGain() {
        return { gain: { value: 0 }, connect() {}, disconnect() {} }
      }
      decodeAudioData() { return Promise.resolve({}) }
      resume() { return Promise.resolve() }
      close() { this.state = 'closed'; return Promise.resolve() }
    }
    class FakeAudioWorkletNode {
      port = { onmessage: null }
      connect() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext })
    Object.defineProperty(window, 'AudioWorkletNode', { value: FakeAudioWorkletNode })
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    })
  })
}

test.beforeEach(async ({ page }) => {
  await installAudioAndMicrophone(page)
})

async function installCompletedConversation(
  page: Page,
  state: ReturnType<typeof tabletState>,
) {
  const captured = { source: '' }
  let completed = false
  await page.route('**/api/v1/auth/tablet/session', (route) =>
    fulfillJson(route, { role: 'TABLET', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/tablet/state', (route) =>
    fulfillJson(route, completed ? tabletState() : state),
  )
  await page.route('**/api/v1/conversations/sessions', async (route) => {
    captured.source = (route.request().postDataJSON() as { source: string }).source
    await fulfillJson(route, {
      session_id: 'session-complete',
      status: 'ACTIVE',
      photo,
      question: { display_text: '오늘 기분은 어떠세요?', spoken_text: '오늘 기분은 어떠세요?' },
    }, 201)
  })
  await page.route('**/api/v1/tts/speech', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: 'RIFF' }),
  )
  await page.route('**/api/v1/conversations/sessions/session-complete/turns?*', (route) =>
    fulfillJson(route, {
      turn_id: 'client-turn-complete',
      utterance_chars: 0,
      turn_duration_seconds: 1,
      chars_per_second: null,
      no_response: true,
      speech_detected: false,
      next_question: { display_text: '다음 질문', spoken_text: '다음 질문' },
    }),
  )
  await page.route('**/api/v1/conversations/sessions/session-complete/complete', (route) => {
    completed = true
    return fulfillJson(route, {
      session_id: 'session-complete',
      status: 'COMPLETED',
      started_at: '2026-08-13T09:00:00+09:00',
      completed_at: '2026-08-13T09:01:00+09:00',
      completion_reason: 'USER_FINISHED',
      user_turn_count: 1,
      total_utterance_chars: 0,
      average_utterance_chars: 0,
      average_turn_duration_seconds: 1,
      no_response_count: 1,
    })
  })
  return captured
}

async function finishConversationFromHome(
  page: Page,
  homeActionLabel: string,
) {
  await page.goto('/')
  await page.getByRole('button', { name: homeActionLabel }).click()
  await expect(page).toHaveURL(/\/conversation$/)
  await page.getByRole('button', { name: '대화 시작하기' }).click()
  await expect(page.getByRole('button', { name: '답변 마쳤어요' })).toBeVisible()
  await page.getByRole('button', { name: '대화 끝내기' }).click()
  await expect(page.getByText('오늘 대화를 기록했어요.')).toBeVisible()
  await expect(page).toHaveURL(/\/$/, { timeout: 5_000 })
  await expect(page.getByText('소중한 가족사진이에요.')).toBeVisible()
}

test('가족사진 홈에서 Routine을 확인하고 홈으로 복귀한다', async ({ page }) => {
  let active = true
  await page.route('**/api/v1/auth/tablet/session', (route) =>
    fulfillJson(route, { role: 'TABLET', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/tablet/state', (route) =>
    fulfillJson(route, tabletState({
      active_routines: active
        ? [{
            execution_id: 'medication:2026-08-13',
            routine_id: 'medication',
            name: '아침 약',
            category: 'MEDICATION',
            state: 'REMINDING',
            scheduled_at: '2026-08-13T09:00:00+09:00',
            reminder_count: 0,
            display_text: '아침 약 시간입니다.',
            spoken_text: '아침 약 시간입니다.',
            confirm_label: '아침 약 기록하기',
          }]
        : [],
    })),
  )
  await page.route('**/api/v1/tts/speech', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: 'RIFF' }),
  )
  await page.route('**/api/v1/routines/*/confirm', async (route) => {
    active = false
    await fulfillJson(route, {
      execution_id: 'medication:2026-08-13',
      routine_id: 'medication',
      name: '아침 약',
      state: 'CONFIRMED',
      scheduled_at: '2026-08-13T09:00:00+09:00',
      reminder_count: 0,
      confirmed_at: '2026-08-13T09:01:00+09:00',
      confirmation_delay_seconds: 60,
      closed_at: '2026-08-13T09:01:00+09:00',
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: '아침 약 기록하기' }).click()

  await expect(page.getByText('기록 되었어요!')).toBeVisible()
  await expect(page.getByText('소중한 가족사진이에요.')).toBeVisible({ timeout: 5_000 })
})

test('정시 권유 대화를 완료하고 사진 홈으로 복귀한다', async ({ page }) => {
  const captured = await installCompletedConversation(page, tabletState({
    conversation_suggestion: {
      suggested: true,
      scheduled_time: '09:00:00',
      display_text: '이야기할 시간이에요.',
      spoken_text: '이야기할 시간이에요.',
      start_label: '대화 시작하기',
    },
  }))

  await finishConversationFromHome(page, '대화 시작하기')

  expect(captured.source).toBe('SCHEDULED')
})

test('자발적 대화를 완료하고 사진 홈으로 복귀한다', async ({ page }) => {
  const captured = await installCompletedConversation(page, tabletState())

  await finishConversationFromHome(page, '추억 이야기 시작하기')

  expect(captured.source).toBe('VOLUNTARY')
})

test('upload 중 종료해도 complete 요청은 한 번만 보낸다', async ({ page }) => {
  let completeCount = 0
  let releaseTurn: (() => void) | undefined
  const turnGate = new Promise<void>((resolve) => { releaseTurn = resolve })
  await page.route('**/api/v1/auth/tablet/session', (route) =>
    fulfillJson(route, { role: 'TABLET', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/tablet/state', (route) =>
    fulfillJson(route, tabletState()),
  )
  await page.route('**/api/v1/conversations/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfillJson(route, {
        session_id: 'session-1',
        status: 'ACTIVE',
        photo,
        question: { display_text: '오늘 기분은 어떠세요?', spoken_text: '오늘 기분은 어떠세요?' },
      }, 201)
      return
    }
    await route.fallback()
  })
  await page.route('**/api/v1/tts/speech', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: 'RIFF' }),
  )
  await page.route('**/api/v1/conversations/sessions/session-1/turns?*', async (route) => {
    await turnGate
    await fulfillJson(route, {
      turn_id: 'client-turn-1',
      utterance_chars: 0,
      turn_duration_seconds: 1,
      chars_per_second: null,
      no_response: true,
      speech_detected: false,
      next_question: { display_text: '다음 질문', spoken_text: '다음 질문' },
    })
  })
  await page.route('**/api/v1/conversations/sessions/session-1/complete', async (route) => {
    completeCount += 1
    await fulfillJson(route, {
      session_id: 'session-1',
      status: 'COMPLETED',
      started_at: '2026-08-13T09:00:00+09:00',
      completed_at: '2026-08-13T09:01:00+09:00',
      completion_reason: 'USER_FINISHED',
      user_turn_count: 1,
      total_utterance_chars: 0,
      average_utterance_chars: 0,
      average_turn_duration_seconds: 1,
      no_response_count: 1,
    })
  })

  await page.goto('/conversation')
  await page.getByRole('button', { name: '대화 시작하기' }).click()
  await page.getByRole('button', { name: '답변 마쳤어요' }).click()
  await expect(page.getByText('말씀을 잘 들었어요.')).toBeVisible()
  await page.getByRole('button', { name: '대화 끝내기' }).click()
  releaseTurn?.()

  await expect(page.getByText('오늘 대화를 기록했어요.')).toBeVisible()
  expect(completeCount).toBe(1)
})

test('stale 상태를 알리고 reconnect 후 홈을 복구한다', async ({ page }) => {
  let requestCount = 0
  await page.route('**/api/v1/auth/tablet/session', (route) =>
    fulfillJson(route, { role: 'TABLET', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/tablet/state', async (route) => {
    requestCount += 1
    if (requestCount === 2) {
      await route.abort('failed')
      return
    }
    await fulfillJson(route, tabletState())
  })

  await page.goto('/')
  await expect(page.getByText('소중한 가족사진이에요.')).toBeVisible()
  await expect(page.getByText('최신 상태를 확인할 수 없어요.')).toBeVisible({ timeout: 7_000 })
  await page.getByRole('button', { name: '다시 시도하기' }).click()
  await expect(page.getByText('소중한 가족사진이에요.')).toBeVisible()
})

test('초기 offline에서는 과거 데이터 없이 연결 오류를 표시한다', async ({ page }) => {
  await page.route('**/api/v1/auth/tablet/session', (route) =>
    fulfillJson(route, { role: 'TABLET', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/tablet/state', (route) => route.abort('failed'))

  await page.goto('/')

  await expect(page.getByText('최신 상태를 확인할 수 없어요.')).toBeVisible()
  await expect(page.getByRole('button', { name: '다시 시도하기' })).toBeVisible()
  await expect(page.getByText('소중한 가족사진이에요.')).not.toBeVisible()
})

test('Guardian 오입력·로그인·새로고침·로그아웃과 direct route를 검증한다', async ({ page }) => {
  let authenticated = false
  let failedLogin = true
  await page.route('**/api/v1/auth/guardian/session', (route) =>
    fulfillJson(
      route,
      authenticated
        ? { role: 'GUARDIAN', expires_at: '2026-08-14T09:00:00+09:00' }
        : { detail: 'not authenticated' },
      authenticated ? 200 : 401,
    ),
  )
  await page.route('**/api/v1/auth/guardian/login', async (route) => {
    if (failedLogin) {
      failedLogin = false
      await fulfillJson(route, { detail: 'invalid password' }, 401)
      return
    }
    authenticated = true
    await fulfillJson(route, { role: 'GUARDIAN', expires_at: '2026-08-14T09:00:00+09:00' })
  })
  await page.route('**/api/v1/auth/guardian/logout', async (route) => {
    authenticated = false
    await route.fulfill({ status: 204 })
  })
  await page.route('**/api/v1/routines/history', (route) => fulfillJson(route, []))
  await page.route('**/api/v1/conversations/sessions', (route) => fulfillJson(route, []))
  await page.route('**/api/v1/anomaly/state', (route) => fulfillJson(route, {
    evaluated_at: '2026-08-13T09:00:00+09:00',
    status: 'NORMAL',
    became_anomalous: false,
    consecutive_anomalous_evaluations: 0,
    routine: {
      status: 'NORMAL', mode: 'COLD_START', sample_count: 1, score: null,
      reasons: [], feature_names: [], rule_based_signal: false,
      isolation_forest_signal: false, persistence_signal: false,
      signal_count: 0, observation_key: '2026-08-12',
    },
    conversation: {
      status: 'NORMAL', mode: 'INSUFFICIENT_DATA', sample_count: 0, score: null,
      reasons: [], feature_names: [], rule_based_signal: false,
      isolation_forest_signal: false, persistence_signal: false,
      signal_count: 0, observation_key: null,
    },
  }))

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard\/login$/)
  await page.getByLabel('보호자 비밀번호').fill('wrong-password')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('보호자 비밀번호').fill('guardian-password')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByText('우리 가족의 돌봄 기록')).toBeVisible()
  await page.reload()
  await expect(page.getByText('우리 가족의 돌봄 기록')).toBeVisible()
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page).toHaveURL(/\/dashboard\/login$/)
})

test('Guardian session 만료 시 보호 화면을 즉시 제거한다', async ({ page }) => {
  let expireHistory = false
  await page.route('**/api/v1/auth/guardian/session', (route) =>
    fulfillJson(route, { role: 'GUARDIAN', expires_at: '2026-08-14T09:00:00+09:00' }),
  )
  await page.route('**/api/v1/routines/history', (route) => {
    if (expireHistory) {
      return fulfillJson(route, { detail: 'expired' }, 401)
    }
    expireHistory = true
    return fulfillJson(route, [])
  })
  await page.route('**/api/v1/conversations/sessions', (route) => fulfillJson(route, []))
  await page.route('**/api/v1/anomaly/state', (route) => fulfillJson(route, {
    evaluated_at: '2026-08-13T09:00:00+09:00',
    status: 'NORMAL',
    became_anomalous: false,
    consecutive_anomalous_evaluations: 0,
    routine: {
      status: 'NORMAL', mode: 'COLD_START', sample_count: 1, score: null,
      reasons: [], feature_names: [], rule_based_signal: false,
      isolation_forest_signal: false, persistence_signal: false,
      signal_count: 0, observation_key: '2026-08-12',
    },
    conversation: {
      status: 'NORMAL', mode: 'INSUFFICIENT_DATA', sample_count: 0, score: null,
      reasons: [], feature_names: [], rule_based_signal: false,
      isolation_forest_signal: false, persistence_signal: false,
      signal_count: 0, observation_key: null,
    },
  }))

  await page.goto('/dashboard')
  await expect(page.getByText('우리 가족의 돌봄 기록')).toBeVisible()
  await page.getByRole('button', { name: '새로고침' }).click()

  await expect(page).toHaveURL(/\/dashboard\/login$/)
  await expect(page.getByText('우리 가족의 돌봄 기록')).not.toBeVisible()
})
