export function appBasePath(baseUrl = import.meta.env.BASE_URL) {
  if (!baseUrl || baseUrl === '/') return '/'
  return `/${baseUrl.replace(/^\/+|\/+$/g, '')}`
}

export function publicAssetPath(
  assetPath: string,
  baseUrl = import.meta.env.BASE_URL,
) {
  const normalizedBase = appBasePath(baseUrl)
  const normalizedAsset = assetPath.replace(/^\/+/, '')
  return `${normalizedBase === '/' ? '' : normalizedBase}/${normalizedAsset}`
}
