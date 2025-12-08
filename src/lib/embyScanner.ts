import { fetchEmbyJson, type EmbyConnection } from './embyClient'

const SUPPORTED_COLLECTIONS = new Set(['movies', 'tvshows'])
const FETCH_LIMIT = 1000

export type ScanMode = 'strict' | 'loose'

export interface ScannerLibrary {
  id: string
  name: string
  collectionType: 'movies' | 'tvshows'
  type?: string
}

interface MediaFoldersResponse {
  Items?: Array<{
    Id: string
    Name: string
    CollectionType?: string
    Type?: string
  }>
}

interface EmbyMediaStream {
  Type?: string
  Width?: number
  Height?: number
  Codec?: string
  Language?: string
  Title?: string
  DisplayTitle?: string
  VideoRange?: string
}

interface EmbyMediaSource {
  Id?: string
  Path?: string
  Name?: string
  Size?: number
  Container?: string
  MediaStreams?: EmbyMediaStream[]
}

interface EmbyItem {
  Id: string
  Name: string
  SeriesName?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  ProductionYear?: number
  OriginalLanguage?: string
  ProductionLocations?: string[]
  MediaSources?: EmbyMediaSource[]
  Path?: string
}

interface ItemsResponse {
  Items?: EmbyItem[]
}

export interface DuplicateFileEntry {
  entryId: string
  itemId: string
  mediaSourceId?: string
  fileName: string
  displayName: string
  path: string
  size: number
  sizeLabel: string
  info: string
  year?: number
  season?: number | null
  episode?: number | null
  isRecommendedKeep: boolean
  isRecommendedDelete: boolean
  canDelete: boolean
}

export interface DuplicateGroupResult {
  groupId: string
  libraryId: string
  libraryName: string
  collectionType: 'movies' | 'tvshows'
  reason: string
  keepStrategy: string
  isMergedGroup: boolean
  title: string
  files: DuplicateFileEntry[]
}

export interface LibrarySummary {
  id: string
  name: string
  collectionType: 'movies' | 'tvshows'
  fileCount: number
  totalBytes: number
  duplicateBytes: number
  duplicateGroups: number
  duplicateFiles: number
}

export interface ScannerTotals {
  totalBytes: number
  duplicateBytes: number
  totalFiles: number
  duplicateGroups: number
  duplicateFiles: number
}

export interface ScannerResult {
  mode: ScanMode
  generatedAt: string
  libraries: LibrarySummary[]
  duplicates: DuplicateGroupResult[]
  totals: ScannerTotals
}

export async function listScannerLibraries(connection: EmbyConnection): Promise<ScannerLibrary[]> {
  const data = await fetchEmbyJson<MediaFoldersResponse>(connection, 'Library/MediaFolders')
  const items = data.Items || []
  return items
    .filter(item => item.Id && item.Name && SUPPORTED_COLLECTIONS.has((item.CollectionType || '').toLowerCase()))
    .map(item => ({
      id: item.Id,
      name: item.Name,
      collectionType: (item.CollectionType || 'movies').toLowerCase() as 'movies' | 'tvshows',
      type: item.Type
    }))
}

export async function performDuplicateScan(
  connection: EmbyConnection,
  options: { mode: ScanMode; libraryIds?: string[] }
): Promise<ScannerResult> {
  const { mode } = options
  const targetLibraries = await listScannerLibraries(connection)
  const filteredLibraries = options.libraryIds?.length
    ? targetLibraries.filter(library => options.libraryIds?.includes(library.id))
    : targetLibraries

  if (!filteredLibraries.length) {
    throw new Error('未找到可扫描的媒体库，请确认 Emby 配置是否正确')
  }

  const librarySummaries: LibrarySummary[] = []
  const duplicateGroups: DuplicateGroupResult[] = []

  let totalBytes = 0
  let totalFiles = 0
  let totalDuplicateBytes = 0
  let totalDuplicateGroups = 0
  let totalDuplicateFiles = 0

  for (const library of filteredLibraries) {
    const { summary, groups } = await scanSingleLibrary(connection, library, mode)
    librarySummaries.push(summary)
    duplicateGroups.push(...groups)

    totalBytes += summary.totalBytes
    totalFiles += summary.fileCount
    totalDuplicateBytes += summary.duplicateBytes
    totalDuplicateGroups += summary.duplicateGroups
    totalDuplicateFiles += summary.duplicateFiles
  }

  return {
    mode,
    generatedAt: new Date().toISOString(),
    libraries: librarySummaries,
    duplicates: duplicateGroups,
    totals: {
      totalBytes,
      duplicateBytes: totalDuplicateBytes,
      totalFiles,
      duplicateGroups: totalDuplicateGroups,
      duplicateFiles: totalDuplicateFiles
    }
  }
}

async function scanSingleLibrary(connection: EmbyConnection, library: ScannerLibrary, mode: ScanMode) {
  const includeType = library.collectionType === 'tvshows' ? 'Episode' : 'Movie'
  const items = await fetchAllItems(connection, library.id, includeType)

  let totalBytes = 0
  let totalFiles = 0
  let duplicateBytes = 0
  const groups: DuplicateGroupResult[] = []

  const buckets = new Map<string, DuplicateGroupResult>()

  for (const item of items) {
    const sources = item.MediaSources || []
    for (const source of sources) {
      const size = source.Size || 0
      if (!size) continue

      totalBytes += size
      totalFiles += 1

      const fileName = getFileName(source.Path || item.Path || '')
      const season = typeof item.ParentIndexNumber === 'number' ? item.ParentIndexNumber : null
      const episode = typeof item.IndexNumber === 'number' ? item.IndexNumber : null

      const key = buildGroupKey(library.collectionType, { item, source, size, mode })
      const title = buildGroupTitle(library.collectionType, item, season, episode)
      const reason = buildGroupReason(library.collectionType, mode)
      const keepStrategy = buildKeepStrategy(library.collectionType, mode)

      const entry: DuplicateFileEntry = {
        entryId: `${item.Id}-${source.Id || 'default'}-${size}-${fileName}`,
        itemId: item.Id,
        mediaSourceId: source.Id,
        fileName,
        displayName: fileName || item.Name,
        path: source.Path || item.Path || '',
        size,
        sizeLabel: formatBytes(size),
        info: buildMediaInfo(item, source),
        year: item.ProductionYear,
        season,
        episode,
        isRecommendedKeep: false,
        isRecommendedDelete: false,
        canDelete: true
      }

      if (!buckets.has(key)) {
        buckets.set(key, {
          groupId: key,
          libraryId: library.id,
          libraryName: library.name,
          collectionType: library.collectionType,
          reason,
          keepStrategy,
          isMergedGroup: false,
          title,
          files: []
        })
      }

      buckets.get(key)!.files.push(entry)
    }
  }

  for (const bucket of buckets.values()) {
    if (bucket.files.length <= 1) continue

    const uniquePaths = new Set(bucket.files.map(file => file.path || file.fileName))
    if (uniquePaths.size <= 1) continue

    const sortedFiles = sortFiles(bucket.files, library.collectionType, mode)
    const keepFile = sortedFiles[0]
    keepFile.isRecommendedKeep = true

    const idSet = new Set(sortedFiles.map(file => file.itemId))
    const isMergedGroup = idSet.size === 1

    bucket.isMergedGroup = isMergedGroup

    sortedFiles.forEach((file, index) => {
      file.entryId = `${bucket.groupId}-${index}-${file.itemId}`
      file.isRecommendedKeep = index === 0
      file.isRecommendedDelete = !file.isRecommendedKeep
      file.canDelete = !isMergedGroup && !file.isRecommendedKeep
      if (file.isRecommendedDelete) {
        duplicateBytes += file.size
      }
    })

    bucket.files = sortedFiles
    groups.push(bucket)
  }

  const summary: LibrarySummary = {
    id: library.id,
    name: library.name,
    collectionType: library.collectionType,
    fileCount: totalFiles,
    totalBytes,
    duplicateBytes,
    duplicateGroups: groups.length,
    duplicateFiles: groups.reduce((sum, group) => sum + group.files.filter(file => file.isRecommendedDelete).length, 0)
  }

  return { summary, groups }
}

async function fetchAllItems(connection: EmbyConnection, libraryId: string, includeType: string) {
  const items: EmbyItem[] = []
  let startIndex = 0

  while (true) {
    const data = await fetchEmbyJson<ItemsResponse>(connection, 'Items', {
      ParentId: libraryId,
      Recursive: 'true',
      IncludeItemTypes: includeType,
      Fields: 'Path,MediaSources,Size,ProductionYear,SeriesName,IndexNumber,ParentIndexNumber,OriginalLanguage,ProductionLocations',
      StartIndex: startIndex,
      Limit: FETCH_LIMIT
    })

    const batch = data.Items || []
    if (!batch.length) break
    items.push(...batch)

    if (batch.length < FETCH_LIMIT) break
    startIndex += FETCH_LIMIT
  }

  return items
}

function buildGroupKey(
  collectionType: 'movies' | 'tvshows',
  params: { item: EmbyItem; source: EmbyMediaSource; size: number; mode: ScanMode }
) {
  const { item, size, mode } = params
  if (collectionType === 'tvshows') {
    const series = (item.SeriesName || item.Name || '').toLowerCase()
    const season = typeof item.ParentIndexNumber === 'number' ? item.ParentIndexNumber : -1
    const episode = typeof item.IndexNumber === 'number' ? item.IndexNumber : -1
    return mode === 'loose'
      ? `${series}|${season}|${episode}`
      : `${series}|${season}|${episode}|${size}`
  }
  return `${size}`
}

function buildGroupTitle(collectionType: 'movies' | 'tvshows', item: EmbyItem, season: number | null, episode: number | null) {
  if (collectionType === 'tvshows') {
    const series = item.SeriesName || item.Name
    const seasonLabel = typeof season === 'number' && season >= 0 ? `S${String(season).padStart(2, '0')}` : 'S??'
    const episodeLabel = typeof episode === 'number' && episode >= 0 ? `E${String(episode).padStart(2, '0')}` : 'E??'
    return `${series} ${seasonLabel}${episodeLabel}`
  }
  return `${item.Name}${item.ProductionYear ? ` (${item.ProductionYear})` : ''}`
}

function buildGroupReason(collectionType: 'movies' | 'tvshows', mode: ScanMode) {
  if (collectionType === 'tvshows') {
    return mode === 'loose' ? '同一集出现多个版本' : '同集同体积的重复文件'
  }
  return '文件体积完全一致'
}

function buildKeepStrategy(collectionType: 'movies' | 'tvshows', mode: ScanMode) {
  if (collectionType === 'tvshows' && mode === 'loose') {
    return '保留体积最大、文件名最长的版本'
  }
  if (collectionType === 'movies') {
    return '保留文件名最长的版本'
  }
  return '保留文件名最长的版本'
}

function sortFiles(files: DuplicateFileEntry[], collectionType: 'movies' | 'tvshows', mode: ScanMode) {
  const sorter = (a: DuplicateFileEntry, b: DuplicateFileEntry) => {
    if (collectionType === 'tvshows' && mode === 'loose') {
      if (b.size !== a.size) {
        return b.size - a.size
      }
    }
    const nameLenDiff = (b.fileName?.length || 0) - (a.fileName?.length || 0)
    if (nameLenDiff !== 0) return nameLenDiff
    return b.size - a.size
  }
  return [...files].sort(sorter)
}

function buildMediaInfo(item: EmbyItem, source: EmbyMediaSource) {
  const parts: string[] = []
  const videoStream = source.MediaStreams?.find(stream => stream.Type === 'Video')

  if (videoStream) {
    const { Width, Height, Codec } = videoStream
    if (Width && Height) {
      if (Width >= 3800 || Height >= 2100) parts.push('4K')
      else if (Width >= 1900 || Height >= 1000) parts.push('1080P')
      else if (Width >= 1200 || Height >= 700) parts.push('720P')
      else parts.push('SD')
    }
    if (Codec) parts.push(Codec.toUpperCase())

    const range = (videoStream.VideoRange || '').toUpperCase()
    if (range.includes('HDR')) parts.push('HDR')
    if (range.includes('DOVI') || range.includes('DV')) parts.push('DV')
  }

  if (hasChineseContent(item, source)) {
    parts.push('中字/国语')
  }

  const releaseGroup = extractReleaseGroup(source.Path || item.Path || '')
  if (releaseGroup) {
    parts.push(releaseGroup)
  }

  return parts.join(' | ')
}

function hasChineseContent(item: EmbyItem, source: EmbyMediaSource) {
  const lang = (item.OriginalLanguage || '').toLowerCase()
  if (['zh', 'chi', 'zho', 'yue', 'wuu', 'cn', 'zh-cn', 'zh-tw'].includes(lang)) {
    return true
  }

  const locations = item.ProductionLocations || []
  if (locations.some(loc => ['china', 'hong kong', 'taiwan', "people's republic of china"].includes(loc?.toLowerCase()))) {
    return true
  }

  const keywords = ['chinese', '中文', '简', '繁', 'chs', 'cht', 'hanzi', '中字', 'zh-cn', 'zh-tw', '国语', '普通话', '粤语', 'cantonese', 'mandarin']
  const filenameKeywords = ['国语', '中配', '台配', '粤语', 'chinese', 'cantonese', 'mandarin', 'cmn', 'dubbed']

  const streams = source.MediaStreams || []
  for (const stream of streams) {
    const type = stream.Type
    if (type === 'Subtitle' || type === 'Audio') {
      const streamLang = (stream.Language || '').toLowerCase()
      if (['chi', 'zho', 'chn', 'zh', 'yue', 'wuu'].includes(streamLang)) return true
      const title = `${stream.Title || ''}${stream.DisplayTitle || ''}`.toLowerCase()
      if (keywords.some(kw => title.includes(kw))) return true
    }
  }

  const path = (source.Path || item.Path || '').toLowerCase()
  if (filenameKeywords.some(kw => path.includes(kw))) return true
  if (/[\u4e00-\u9fff]/.test(item.Name)) return true
  return false
}

function extractReleaseGroup(filePath: string) {
  const fileName = getFileName(filePath)
  if (!fileName) return ''
  const base = fileName.replace(/\.[^.]+$/, '')
  if (base.includes('-')) {
    const group = base.split('-').pop()?.trim() || ''
    if (group && group.length > 1 && group.length < 16 && !/^S\d+E\d+/.test(group) && !/^(\d+)$/.test(group)) {
      return group
    }
  }
  return ''
}

function getFileName(filePath: string) {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+$/, '')
  const segments = normalized.split('/')
  return segments[segments.length - 1] || ''
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
