import { describe, expect, it } from 'vitest'
import {
  carePages,
  createCarePages,
  createRoutineDemoSteps,
  findCarePage,
  findRoutineDemoStep,
  prefixCarePage,
  prefixRoutineDemoStep,
  routineDemoSteps,
} from './carePages'

describe('care page definitions', () => {
  it('keeps every page path unique and absolute', () => {
    const paths = carePages.map((page) => page.path)

    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every((path) => path.startsWith('/'))).toBe(true)
  })

  it('resolves known pages and safely rejects unknown paths', () => {
    expect(findCarePage('/care/breakfast')?.title).toBe(
      '어르신~ 아침 드실 시간이예요~',
    )
    expect(findCarePage('/care/breakfast/')).toBeUndefined()
    expect(findCarePage('care/breakfast')).toBeUndefined()
    expect(findCarePage('/care/not-real')).toBeUndefined()
  })

  it('only exposes destinations for enabled actions', () => {
    const disabledPages = carePages.filter((page) => page.tone !== 'action')
    const enabledPages = carePages.filter((page) => page.tone === 'action')

    expect(disabledPages.every((page) => page.actionTo === undefined)).toBe(true)
    expect(enabledPages.every((page) => Boolean(page.actionTo))).toBe(true)
  })

  it('preserves the original visible copy throughout the routine flow', () => {
    expect(findCarePage('/care/breakfast')).toMatchObject({
      title: '어르신~ 아침 드실 시간이예요~',
      description: '아침 꼭 챙겨드시고 여기 버튼 눌러주세요',
      actionLabel: '식사 기록하기',
    })
    expect(findCarePage('/care/medication')).toMatchObject({
      title: '아침약 드실 시간이예요!',
      description: '아침약을 먹고 버튼을 눌러주세요',
      actionLabel: '아침약 기록하기',
    })
    expect(findCarePage('/care/breakfast/complete')).toMatchObject({
      title: '기록 되었어요!',
      description: '아침약 드실 시간에 알려드릴게요!',
    })
    expect(findCarePage('/care/medication/complete')).toMatchObject({
      title: '기록 되었어요!',
      description: '점심 드실 시간에 알려드릴게요!',
    })
  })

  it('uses the requested elder-friendly routine speech copy', () => {
    expect(findRoutineDemoStep('/care/breakfast')?.speechText).toBe(
      '어르신~ 아침 드실 시간이예요~, 아침 꼭 챙겨드시고 여기 버튼 눌러주세요',
    )
    expect(
      findRoutineDemoStep('/care/breakfast/complete')?.speechText,
    ).toBe('어르신~ 이따가 아침약 드실 시간에 다시 알려드릴게요~')
    expect(findRoutineDemoStep('/care/medication')?.speechText).toBe(
      '어르신~ 아침약 드실 시간이예요~, 귀찮으시더라도 꼭 챙겨 드시고 버튼을 눌러주세요!',
    )
    expect(
      findRoutineDemoStep('/care/medication/complete')?.speechText,
    ).toBe('어르신~ 이따가 점심 드실 시간에 다시 알려드릴게요~')
  })

  it('keeps the breakfast-to-conversation sequence and five-second delay', () => {
    expect(routineDemoSteps).toHaveLength(4)
    expect(findRoutineDemoStep('/care/breakfast')?.page.actionTo).toBe(
      '/care/breakfast/complete',
    )
    expect(findRoutineDemoStep('/care/breakfast/complete')).toMatchObject({
      advanceAfterSpeechTo: '/care/medication',
      advanceDelayMs: 5_000,
    })
    expect(findRoutineDemoStep('/care/medication')?.page.actionTo).toBe(
      '/care/medication/complete',
    )
    expect(
      findRoutineDemoStep('/care/medication/complete')
        ?.advanceAfterSpeechTo,
    ).toBe('/conversation/start')
  })

  it('uses lunch, lunch medication, and dinner copy from Seoul noon', () => {
    const lunchSteps = createRoutineDemoSteps('LUNCH')
    const lunchPages = createCarePages('LUNCH')

    expect(findCarePage('/care/breakfast', lunchPages)).toMatchObject({
      navLabel: '점심 식사 안내',
      title: '어르신~ 점심 드실 시간이예요~',
      description: '점심 꼭 챙겨드시고 여기 버튼 눌러주세요',
    })
    expect(findRoutineDemoStep('/care/breakfast/complete', lunchSteps))
      .toMatchObject({
        page: {
          description: '점심약 드실 시간에 알려드릴게요!',
        },
        speechText:
          '어르신~ 이따가 점심약 드실 시간에 다시 알려드릴게요~',
      })
    expect(findRoutineDemoStep('/care/medication', lunchSteps)).toMatchObject({
      page: {
        title: '점심약 드실 시간이예요!',
        actionLabel: '점심약 기록하기',
      },
    })
    expect(findRoutineDemoStep('/care/medication/complete', lunchSteps))
      .toMatchObject({
        page: {
          description: '저녁 드실 시간에 알려드릴게요!',
        },
        speechText:
          '어르신~ 이따가 저녁 드실 시간에 다시 알려드릴게요~',
      })
  })

  it('prefixes every demo navigation target', () => {
    const step = prefixRoutineDemoStep(
      createRoutineDemoSteps('MORNING')[1],
      '/demo',
    )
    const page = prefixCarePage(
      createCarePages('MORNING').find(({ path }) => path === '/conversation/start')!,
      '/demo',
    )

    expect(step.page.path).toBe('/demo/care/breakfast/complete')
    expect(step.advanceAfterSpeechTo).toBe('/demo/care/medication')
    expect(page.actionTo).toBe('/demo/conversation/active')
  })
})
