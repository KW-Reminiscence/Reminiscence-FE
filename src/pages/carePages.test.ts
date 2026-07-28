import { describe, expect, it } from 'vitest'
import {
  carePages,
  findCarePage,
  findRoutineDemoStep,
  routineDemoSteps,
} from './carePages'

describe('care page definitions', () => {
  it('keeps every page path unique and absolute', () => {
    const paths = carePages.map((page) => page.path)

    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every((path) => path.startsWith('/'))).toBe(true)
  })

  it('resolves known pages and safely rejects unknown paths', () => {
    expect(findCarePage('/care/breakfast')?.title).toBe('혹시 아침 드셨나요?')
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
      title: '혹시 아침 드셨나요?',
      description: '아침을 먹고 버튼을 눌러주세요',
      actionLabel: '식사 기록하기',
    })
    expect(findCarePage('/care/medication')).toMatchObject({
      title: '아침약 드실 시간이예요!',
      description: '아침을 먹고 버튼을 눌러주세요',
      actionLabel: '아침약 기록하기',
    })
    expect(findCarePage('/care/breakfast/complete')).toMatchObject({
      title: '기록 되었어요!',
      description: '아침약 드실 시간에 알려드릴게요!',
    })
    expect(findCarePage('/care/medication/complete')).toMatchObject({
      title: '기록 되었어요!',
      description: '아침약 드실 시간에 알려드릴게요!',
    })
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
})
