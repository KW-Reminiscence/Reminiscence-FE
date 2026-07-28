import { describe, expect, it } from 'vitest'
import type { PhotoMemory } from '../../api/types'
import {
  photoMemoryImageAlt,
  photoMemoryImageUrl,
} from './photoMemory'

const photo: PhotoMemory = {
  id: 'photo-1',
  image_base64: 'aGVs bG8=\n',
  image_media_type: ' image/jpeg ',
  location: '서울',
  people: ['어머니'],
  event: '생일',
  description: '생일 케이크 앞에서 웃고 있는 가족',
}

describe('photoMemoryImageUrl', () => {
  it('builds an image data URL from the backend photo payload', () => {
    expect(photoMemoryImageUrl(photo)).toBe('data:image/jpeg;base64,aGVsbG8=')
  })

  it('rejects missing or invalid image payloads', () => {
    expect(photoMemoryImageUrl(null)).toBeNull()
    expect(photoMemoryImageUrl({ ...photo, image_base64: '  ' })).toBeNull()
    expect(
      photoMemoryImageUrl({
        ...photo,
        image_media_type: 'text/html',
      }),
    ).toBeNull()
  })
})

describe('photoMemoryImageAlt', () => {
  it('uses the family-provided photo description', () => {
    expect(photoMemoryImageAlt(photo)).toBe(
      '생일 케이크 앞에서 웃고 있는 가족',
    )
  })

  it('lets the page use its default alt text when description is blank', () => {
    expect(photoMemoryImageAlt({ ...photo, description: ' ' })).toBeUndefined()
    expect(photoMemoryImageAlt(null)).toBeUndefined()
  })
})
