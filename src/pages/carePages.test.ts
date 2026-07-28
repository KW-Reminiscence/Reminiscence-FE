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
    expect(findCarePage('/care/breakfast')?.title).toBe(
      '아침 식사하실 시간이에요!',
    )
    expect(findCarePage('/care/breakfast/')).toBeUndefined()
    expect(findCarePage('care/breakfast')).toBeUndefined()
    expect(findCarePage('/care/not-real')).toBeUndefined()
  })

  it('defines the requested breakfast-to-conversation demo sequence', () => {
    const breakfast = findRoutineDemoStep('/care/breakfast')
    const breakfastComplete = findRoutineDemoStep('/care/breakfast/complete')
    const medication = findRoutineDemoStep('/care/medication')
    const medicationComplete = findRoutineDemoStep(
      '/care/medication/complete',
    )

    expect(routineDemoSteps).toHaveLength(4)
    expect(breakfast?.page.actionTo).toBe('/care/breakfast/complete')
    expect(breakfastComplete).toMatchObject({
      advanceAfterSpeechTo: '/care/medication',
      advanceDelayMs: 5_000,
    })
    expect(medication?.page.actionTo).toBe('/care/medication/complete')
    expect(medicationComplete?.advanceAfterSpeechTo).toBe(
      '/conversation/start',
    )
    expect(
      routineDemoSteps.every((step) => step.speechText.trim().length > 0),
    ).toBe(true)
  })

  it('only exposes destinations for enabled actions', () => {
    const disabledPages = carePages.filter((page) => page.tone !== 'action')
    const enabledPages = carePages.filter((page) => page.tone === 'action')

    expect(disabledPages.every((page) => page.actionTo === undefined)).toBe(true)
    expect(enabledPages.every((page) => Boolean(page.actionTo))).toBe(true)
  })
})
