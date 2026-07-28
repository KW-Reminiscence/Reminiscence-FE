import type { PhotoMemory } from '../../api/types'

const imageMediaTypePattern = /^image\/[a-z0-9.+-]+$/i

export function photoMemoryImageUrl(photo: PhotoMemory | null) {
  if (!photo) return null

  const mediaType = photo.image_media_type.trim()
  const base64 = photo.image_base64.replace(/\s/g, '')
  if (!imageMediaTypePattern.test(mediaType) || !base64) return null

  return `data:${mediaType};base64,${base64}`
}

export function photoMemoryImageAlt(photo: PhotoMemory | null) {
  const description = photo?.description.trim()
  return description || undefined
}
