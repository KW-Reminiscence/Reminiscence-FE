import { describe, expect, it } from 'vitest'
import { appBasePath, publicAssetPath } from './paths'

describe('deployment paths', () => {
  it('keeps root deployments rooted at slash', () => {
    expect(appBasePath('/')).toBe('/')
    expect(publicAssetPath('family-photo.png', '/')).toBe(
      '/family-photo.png',
    )
  })

  it('normalizes nested deployment paths', () => {
    expect(appBasePath('/demo/')).toBe('/demo')
    expect(appBasePath('demo')).toBe('/demo')
    expect(publicAssetPath('/family-photo.png', '/demo/')).toBe(
      '/demo/family-photo.png',
    )
  })
})
