import { useState, useCallback, useEffect, useMemo } from 'react'
import { Search, Grid3X3, List, FolderOpen, Upload, RefreshCw, Loader2, Cloud, Folder, File, Image, Film, Trash2, ChevronRight, ChevronDown, ArrowLeft, FolderSync, Play } from 'lucide-react'
import { useProviderStore } from '@/store/useProviderStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useAssetStore } from '@/store/useAssetStore'
import VideoThumbnail from './VideoThumbnail'
import MediaViewer from './MediaViewer'
import type { Asset } from '@/types/asset'

interface OssObject {
  key: string
  name: string
  url: string
  size: number
  lastModified: string
}

function getOssConfig() {
  const provider = useProviderStore.getState().getProvider('oss')
  const endpoint = (provider?.endpoints[0] || {}) as any
  return {
    accessKeyId: endpoint.accessKeyId || '',
    accessKeySecret: endpoint.accessKeySecret || '',
    bucket: endpoint.bucket || '',
    region: endpoint.region || '',
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return Image
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return Film
  return File
}

export default function OssBrowser() {
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [objects, setObjects] = useState<OssObject[]>([])
  const [currentPrefix, setCurrentPrefix] = useState('')
  const [expandedPrefixes, setExpandedPrefixes] = useState<Set<string>>(new Set())
  const [childPrefixes, setChildPrefixes] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [listingPrefix, setListingPrefix] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentFile: '' })
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null)
  const [hoveredObj, setHoveredObj] = useState<string | null>(null)
  const [viewerAsset, setViewerAsset] = useState<Asset | null>(null)

  const config = useMemo(() => getOssConfig(), [])

  const listObjects = useCallback(async (prefix: string) => {
    if (!window.electronAPI?.listOss) return
    setLoading(true)
    setListingPrefix(prefix)
    try {
      const raw = await window.electronAPI.listOss(config, prefix)
      const items: OssObject[] = (raw || []).map((obj: any) => ({
        key: obj.key || obj.name || '',
        name: obj.name || '',
        url: obj.url || '',
        size: obj.size || 0,
        lastModified: obj.lastModified || '',
      }))
      setObjects(items)
    } catch (e: any) {
      console.error('OSS list error:', e)
    } finally {
      setLoading(false)
    }
  }, [config])

  const listPrefixes = useCallback(async (prefix: string) => {
    if (!window.electronAPI?.listOssPrefixes) return
    try {
      const result = await window.electronAPI.listOssPrefixes(config, prefix)
      return result || []
    } catch {
      return []
    }
  }, [config])

  useEffect(() => {
    listPrefixes('').then(p => setPrefixes(p || []))
    listObjects('')
  }, [listPrefixes, listObjects])

  const navigateTo = useCallback(async (prefix: string) => {
    setCurrentPrefix(prefix)
    setSearchQuery('')
    await listObjects(prefix)
  }, [listObjects])

  const toggleExpand = useCallback(async (prefix: string) => {
    const newExpanded = new Set(expandedPrefixes)
    if (newExpanded.has(prefix)) {
      newExpanded.delete(prefix)
      setExpandedPrefixes(newExpanded)
      return
    }
    newExpanded.add(prefix)
    setExpandedPrefixes(newExpanded)
    if (!childPrefixes.has(prefix)) {
      const children = await listPrefixes(prefix)
      setChildPrefixes(prev => new Map(prev).set(prefix, children || []))
    }
  }, [expandedPrefixes, childPrefixes, listPrefixes])

  const renderDirTree = (dirs: string[], parentPrefix: string = '', level: number = 0) => {
    return dirs.map(dir => {
      const displayName = dir.replace(parentPrefix, '').replace(/\/$/, '')
      const isExpanded = expandedPrefixes.has(dir)
      const children = childPrefixes.get(dir) || []
      const isActive = currentPrefix === dir

      return (
        <div key={dir}>
          <div
            className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-xs transition-colors
              ${isActive ? 'bg-accent/20 text-accent' : 'hover:bg-bg-secondary/50 text-text-secondary hover:text-text-primary'}`}
            style={{ paddingLeft: `${8 + level * 12}px` }}
            onClick={async () => {
              if (children.length > 0 || !childPrefixes.has(dir)) {
                await toggleExpand(dir)
              }
              navigateTo(dir)
            }}
          >
            <span className="flex-shrink-0">
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <Folder size={12} className="flex-shrink-0 text-amber-400" />
            <span className="truncate flex-1">{displayName}</span>
          </div>
          {isExpanded && children.length > 0 && (
            renderDirTree(children, dir, level + 1)
          )}
        </div>
      )
    })
  }

  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects
    const q = searchQuery.toLowerCase()
    return objects.filter(o => o.name.toLowerCase().includes(q))
  }, [objects, searchQuery])

  const handleUpload = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,video/*'
    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) return
      if (!window.electronAPI?.uploadOssFile) {
        useNotificationStore.getState().addNotification({ type: 'error', title: '上传失败', message: '仅在桌面端支持上传' })
        return
      }
      setUploading(true)
      let success = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ossKey = currentPrefix ? `${currentPrefix}${file.name}` : file.name
        setSyncProgress({ current: i + 1, total: files.length, currentFile: file.name })
        try {
          const resultStr = await window.electronAPI.uploadOssFile(config, (file as any).path || '', ossKey)
          const result = JSON.parse(resultStr as string)
          if (result.error) {
            useNotificationStore.getState().addNotification({ type: 'error', title: '上传失败', message: `${file.name}: ${result.error}` })
          } else {
            success++
          }
        } catch (e: any) {
          useNotificationStore.getState().addNotification({ type: 'error', title: '上传异常', message: `${file.name}: ${e.message}` })
        }
      }
      setUploading(false)
      if (success > 0) {
        useNotificationStore.getState().addNotification({ type: 'success', title: '上传完成', message: `成功上传 ${success}/${files.length} 个文件` })
        listObjects(currentPrefix)
        listPrefixes(currentPrefix).then(p => {
          if (p && p.length > 0) {
            setChildPrefixes(prev => new Map(prev).set(currentPrefix, p))
          }
        })
      }
    }
    input.click()
  }, [config, currentPrefix, listObjects, listPrefixes])

  const handleSyncLocal = useCallback(async () => {
    const localPath = useAssetStore.getState().defaultLocalPath
    if (!localPath) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '未设置本地路径', message: '请先在素材库中设置默认本地素材路径' })
      return
    }
    if (!window.electronAPI?.scanDirectory || !window.electronAPI?.uploadOssFile) {
      useNotificationStore.getState().addNotification({ type: 'error', title: '同步失败', message: '仅在桌面端支持同步' })
      return
    }
    setSyncing(true)
    try {
      const localAssets = await window.electronAPI.scanDirectory(localPath)
      if (!localAssets || localAssets.length === 0) {
        useNotificationStore.getState().addNotification({ type: 'info', title: '同步完成', message: '本地没有可同步的素材' })
        setSyncing(false)
        return
      }
      const targetPrefix = currentPrefix || 'local-sync/'
      const existingKeys = new Set(objects.map(o => o.key))
      let uploaded = 0
      let skipped = 0
      setSyncProgress({ current: 0, total: localAssets.length, currentFile: '' })

      for (let i = 0; i < localAssets.length; i++) {
        const asset = localAssets[i]
        const ossKey = `${targetPrefix}${asset.name}`
        setSyncProgress({ current: i + 1, total: localAssets.length, currentFile: asset.name })
        if (existingKeys.has(ossKey)) {
          skipped++
          continue
        }
        const filePath = asset.path.startsWith('nbc://')
          ? (() => { try { return decodeURIComponent(new URL(asset.path).searchParams.get('path') || '') } catch { return '' } })()
          : asset.id
        if (!filePath) { skipped++; continue }
        try {
          const resultStr = await window.electronAPI.uploadOssFile(config, filePath, ossKey)
          const result = JSON.parse(resultStr as string)
          if (!result.error) uploaded++
        } catch { /* skip failed */ }
      }
      useNotificationStore.getState().addNotification({
        type: 'success', title: '同步完成',
        message: `上传 ${uploaded} 个，跳过 ${skipped} 个（共 ${localAssets.length} 个）`
      })
      listObjects(currentPrefix)
      listPrefixes(currentPrefix).then(p => {
        if (p && p.length > 0) {
          setChildPrefixes(prev => new Map(prev).set(currentPrefix, p))
        }
      })
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: '同步失败', message: e.message })
    } finally {
      setSyncing(false)
    }
  }, [config, currentPrefix, objects, listObjects, listPrefixes])

  const handleDelete = useCallback(async (key: string) => {
    if (!window.electronAPI?.deleteAnyOss) return
    try {
      const resultStr = await window.electronAPI.deleteAnyOss(config, key)
      const result = JSON.parse(resultStr as string)
      if (result.success) {
        setObjects(prev => prev.filter(o => o.key !== key))
        useNotificationStore.getState().addNotification({ type: 'success', title: '已删除', message: key })
      } else {
        useNotificationStore.getState().addNotification({ type: 'error', title: '删除失败', message: result.error })
      }
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: '删除异常', message: e.message })
    }
    setSelectedForDelete(null)
  }, [config])

  const objToAsset = useCallback((obj: OssObject): Asset => ({
    id: obj.key,
    name: obj.name,
    type: obj.name.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image',
    path: obj.url,
    size: obj.size,
    createdAt: obj.lastModified,
    tags: ['OSS'],
    ossKey: obj.key,
    source: 'oss',
  }), [])

  const viewerAssetList = useMemo(() =>
    objects
      .filter(o => o.name.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|avi)$/i))
      .map(o => objToAsset(o)),
    [objects, objToAsset])

  const handleDoubleClick = useCallback((obj: OssObject) => {
    setViewerAsset(objToAsset(obj))
  }, [objToAsset])

  const handleDragStart = useCallback((e: React.DragEvent, obj: OssObject) => {
    const payload = {
      type: 'asset',
      url: obj.url,
      assetType: obj.name.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' : 'image',
      isLocal: false,
      name: obj.name,
    }
    e.dataTransfer.setData('application/reactflow', JSON.stringify(payload))
    e.dataTransfer.setData('application/asset', JSON.stringify({
      id: obj.key,
      name: obj.name,
      type: payload.assetType,
      path: obj.url,
      tags: ['OSS'],
      createdAt: obj.lastModified,
    }))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const hasConfig = config.accessKeyId && config.accessKeySecret && config.bucket
  const isBusy = loading || uploading || syncing

  return (
    <div className="flex flex-col h-full bg-bg-primary panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-node-border/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-blue-400" />
          <span className="text-xs font-medium">云端素材库</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost p-1"
            title="同步本地素材"
            onClick={handleSyncLocal}
            disabled={isBusy}
          >
            {syncing ? <Loader2 size={14} className="animate-spin text-accent" /> : <FolderSync size={14} />}
          </button>
          <button
            className="btn btn-ghost p-1"
            title="上传文件"
            onClick={handleUpload}
            disabled={isBusy}
          >
            {uploading ? <Loader2 size={14} className="animate-spin text-accent" /> : <Upload size={14} />}
          </button>
          <button
            className="btn btn-ghost p-1"
            title="刷新"
            onClick={() => { listPrefixes('').then(p => setPrefixes(p || [])); listObjects(currentPrefix) }}
            disabled={isBusy}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex ml-1 border border-node-border/20 rounded overflow-hidden">
            <button
              className={`p-1 ${viewMode === 'grid' ? 'bg-accent/30' : 'hover:bg-bg-secondary/50'}`}
              onClick={() => setViewMode('grid')}
            ><Grid3X3 size={12} /></button>
            <button
              className={`p-1 ${viewMode === 'list' ? 'bg-accent/30' : 'hover:bg-bg-secondary/50'}`}
              onClick={() => setViewMode('list')}
            ><List size={12} /></button>
          </div>
        </div>
      </div>

      {(syncing || uploading) && syncProgress.total > 0 && (
        <div className="px-3 py-1.5 bg-accent/10 border-b border-accent/20 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-accent">
            <Loader2 size={12} className="animate-spin" />
            <span className="flex-1 truncate">{syncProgress.currentFile || '处理中...'}</span>
            <span className="text-text-tertiary">{syncProgress.current}/{syncProgress.total}</span>
          </div>
          <div className="mt-1 h-0.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!hasConfig ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-text-tertiary">
            <Cloud size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">请先在设置面板配置阿里云 OSS</p>
            <p className="text-[10px] mt-1 opacity-70">AccessKey ID / Secret / Bucket / Region</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <div className="w-44 border-r border-node-border/20 overflow-y-auto flex-shrink-0 custom-scrollbar py-1">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded text-xs mx-1 transition-colors
                ${currentPrefix === '' ? 'bg-accent/20 text-accent' : 'hover:bg-bg-secondary/50 text-text-secondary hover:text-text-primary'}`}
              onClick={() => {
                setCurrentPrefix('')
                setSearchQuery('')
                listObjects('')
              }}
            >
              <FolderOpen size={12} className="text-blue-400" />
              <span className="truncate font-medium">{config.bucket}</span>
            </div>
            {renderDirTree(prefixes, '', 0)}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-node-border/20 flex-shrink-0">
              {currentPrefix && (
                <button
                  className="btn btn-ghost p-0.5 text-text-tertiary hover:text-text-primary"
                  title="返回上级"
                  onClick={() => {
                    const parent = currentPrefix.replace(/\/$/, '').split('/').slice(0, -1).join('/')
                    const parentPrefix = parent ? parent + '/' : ''
                    navigateTo(parentPrefix)
                  }}
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <div className="flex items-center gap-2 flex-1 px-2 py-0.5 rounded bg-bg-secondary/50">
                <Search size={12} className="text-text-tertiary flex-shrink-0" />
                <input
                  className="bg-transparent text-xs outline-none flex-1 min-w-0"
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {loading && <Loader2 size={12} className="animate-spin text-text-tertiary" />}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {objects.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-1">
                  <FolderOpen size={28} className="opacity-30" />
                  <p className="text-xs">当前目录为空</p>
                  <p className="text-[10px] opacity-70">上传文件或同步本地素材</p>
                </div>
              ) : filteredObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-1">
                  <Search size={28} className="opacity-30" />
                  <p className="text-xs">没有匹配的文件</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-2">
                  {filteredObjects.map(obj => (
                    <div
                      key={obj.key}
                      className="asset-card group relative bg-bg-secondary/30 rounded-lg overflow-hidden cursor-pointer"
                      draggable
                      onDragStart={(e) => handleDragStart(e, obj)}
                      onDoubleClick={() => handleDoubleClick(obj)}
                      onMouseEnter={() => setHoveredObj(obj.key)}
                      onMouseLeave={() => setHoveredObj(null)}
                    >
                      <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white"
                          onClick={(e) => { e.stopPropagation(); setSelectedForDelete(obj.key) }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="aspect-square flex items-center justify-center bg-bg-secondary/50">
                        {obj.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                          <img src={obj.url} alt={obj.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : obj.name.match(/\.(mp4|webm|mov|avi)$/i) ? (
                          <div className="relative w-full h-full">
                            <VideoThumbnail src={obj.url} alt={obj.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                              <Play size={24} className="text-white opacity-80" />
                            </div>
                          </div>
                        ) : (
                          <File size={24} className="text-text-tertiary" />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] truncate text-text-primary leading-tight" title={obj.name}>
                          {obj.name}
                        </p>
                        <p className="text-[9px] text-text-tertiary">{formatSize(obj.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredObjects.map(obj => (
                    <div
                      key={obj.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-secondary/50 cursor-pointer group text-xs"
                      draggable
                      onDragStart={(e) => handleDragStart(e, obj)}
                      onDoubleClick={() => handleDoubleClick(obj)}
                      onMouseEnter={() => setHoveredObj(obj.key)}
                      onMouseLeave={() => setHoveredObj(null)}
                    >
                      <div className="w-8 h-8 rounded bg-bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {obj.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                          <img src={obj.url} alt={obj.name} className="w-full h-full object-cover" />
                        ) : obj.name.match(/\.(mp4|webm|mov|avi)$/i) ? (
                          <VideoThumbnail src={obj.url} alt={obj.name} className="w-full h-full object-cover" />
                        ) : (
                          (() => { const Icon = getFileIcon(obj.name); return <Icon size={14} className="text-text-tertiary" /> })()
                        )}
                      </div>
                      <span className="flex-1 truncate">{obj.name}</span>
                      <span className="text-text-tertiary flex-shrink-0">{formatSize(obj.size)}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-all"
                        onClick={(e) => { e.stopPropagation(); setSelectedForDelete(obj.key) }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedForDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-secondary rounded-lg p-4 w-72 shadow-xl border border-node-border/30">
            <p className="text-sm font-medium mb-1">确认删除</p>
            <p className="text-xs text-text-secondary mb-1 break-all">{selectedForDelete}</p>
            <p className="text-[10px] text-red-400 mb-3">此操作不可撤销</p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost text-xs px-3 py-1" onClick={() => setSelectedForDelete(null)}>取消</button>
              <button className="btn btn-danger text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded" onClick={() => handleDelete(selectedForDelete)}>删除</button>
            </div>
          </div>
        </div>
      )}

      {viewerAsset && (
        <MediaViewer
          asset={viewerAsset}
          assetList={viewerAssetList}
          onClose={() => setViewerAsset(null)}
          onNavigate={(a) => setViewerAsset(a)}
        />
      )}
    </div>
  )
}
