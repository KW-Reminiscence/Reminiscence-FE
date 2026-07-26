import { describe, expect, it } from 'vitest'
import { carePages, findCarePage } from './carePages'

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
})
