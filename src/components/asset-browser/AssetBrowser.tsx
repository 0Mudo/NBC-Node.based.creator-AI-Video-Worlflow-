import { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import { Search, Grid3X3, List, FolderOpen, Upload, LayoutGrid, Folders, Loader2, Image, Film, FileText, Globe, Trash2, CheckSquare, Square, Pencil, CloudOff, X, Eye } from 'lucide-react'
import { useAssetStore } from '@/store/useAssetStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { Asset, AssetTag } from '@/types/asset'
import { ALL_FILTER_TAGS, ASSET_TAG_CN } from '@/types/asset'
import AssetCard from './AssetCard'
import AssetDetail from './AssetDetail'
import TagEditor from './TagEditor'
import MediaViewer from './MediaViewer'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'

import { useProviderStore } from '@/store/useProviderStore'
import { useNotificationStore } from '@/store/useNotificationStore'

const OSS_MANIFEST_URL = 'https://yukkio.oss-cn-shenzhen.aliyuncs.com/assets-manifest.json'

const SAMPLE_ASSETS: Asset[] = [
  { id: 'sample_gpt_01', name: 'gptimage2_proper_t2i.png', type: 'image', path: 'https://yukkio.oss-cn-shenzhen.aliyuncs.com/gpt-image/gptimage2_proper_t2i.png', size: 1740000, createdAt: '2026-05-05T13:59:31Z', tags: ['GPT Image'], width: 1024, height: 1024 },
  { id: 'sample_seedance_01', name: 'seedance_test.mp4', type: 'video', path: 'https://yukkio.oss-cn-shenzhen.aliyuncs.com/seedance/seedance_test.mp4', size: 1850000, createdAt: '2026-05-05T12:50:00Z', tags: ['Seedance'] },
]

export default function AssetBrowser() {
  const store = useAssetStore()
  const { assets, selectedAssetId, searchQuery, indexMode, filterTag, filterProject, viewMode, isMultiSelectMode, selectedAssetIds, selectAsset, removeAsset, removeAssets, setSearch, setIndexMode, setFilterTag, setFilterProject, setViewMode, setAssets, defaultLocalPath, updateAssetTags, toggleMultiSelectMode, toggleAssetSelection, selectAllFiltered, clearSelection } = store
  const { projects } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loadingOss, setLoadingOss] = useState(false)
  const [loadingFeishu, setLoadingFeishu] = useState(false)
  const [tagEditAsset, setTagEditAsset] = useState<Asset | null>(null)
  const [ossDeleteAsset, setOssDeleteAsset] = useState<Asset | null>(null)
  const [ossDeleting, setOssDeleting] = useState(false)
  const [viewerAsset, setViewerAsset] = useState<Asset | null>(null)
  const [deleteDialogAsset, setDeleteDialogAsset] = useState<Asset | null>(null)

  const assetProjectMap = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach(p => {
      try {
        const rawTimeline = localStorage.getItem(`nbc_timeline_${p.id}`)
        if (rawTimeline) {
          const { clips } = JSON.parse(rawTimeline)
          if (Array.isArray(clips)) {
            clips.forEach((c: any) => map.set(c.url, p.id))
          }
        }
        const rawProject = localStorage.getItem(`nbc_project_${p.id}`)
        if (rawProject) {
          const { nodes } = JSON.parse(rawProject)
          if (Array.isArray(nodes)) {
            nodes.forEach((n: any) => {
              if (n.data?._resultUrl) map.set(n.data._resultUrl, p.id)
              if (n.data?._localPath) map.set(n.data._localPath, p.id)
              if (n.data?._ossUrl) map.set(n.data._ossUrl, p.id)
            })
          }
        }
      } catch {}
    })
    return map
  }, [projects, assets])

  const assetsWithProjects = useMemo(() => {
    return assets.map(a => ({
      ...a,
      projectId: a.projectId || assetProjectMap.get(a.path) || assetProjectMap.get(a.id)
    }))
  }, [assets, assetProjectMap])

  const filtered = assetsWithProjects.filter((a) => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    
    if (indexMode === 'category') {
      if (filterTag !== 'All' && !a.tags.includes(filterTag)) return false
    } else {
      if (filterProject === 'Unassigned') {
        if (a.projectId) return false
      } else if (filterProject !== 'All') {
        if (a.projectId !== filterProject) return false
      }
    }
    
    return true
  })

  const scanDirectoryPath = useCallback(async (dirPath: string) => {
    if (!window.electronAPI?.scanDirectory) return
    try {
      const newAssetsRaw = await window.electronAPI.scanDirectory(dirPath)
      if (newAssetsRaw && newAssetsRaw.length > 0) {
        const newAssets = (newAssetsRaw as Asset[]).map(a => ({ ...a, source: 'local' as const }))
        const existingIds = new Set(assets.map(a => a.id))
        const added = newAssets.filter(a => !existingIds.has(a.id))
        if (added.length > 0) {
          setAssets([...assets, ...added])
        }
      }
    } catch (e: any) {
      console.error('Failed to scan directory:', e)
    }
  }, [setAssets, assets])

  useEffect(() => {
    if (defaultLocalPath && window.electronAPI?.scanDirectory) {
      scanDirectoryPath(defaultLocalPath)
    }
  }, [defaultLocalPath, scanDirectoryPath])

  const loadFromOSS = useCallback(async () => {
    try {
      setLoadingOss(true)
      if (window.electronAPI?.listOss) {
        const provider = useProviderStore.getState().getProvider('oss')
        const endpoint = (provider?.endpoints[0] || {}) as any
        if (!endpoint.accessKeyId || !endpoint.accessKeySecret || !endpoint.bucket) {
          useNotificationStore.getState().addNotification({ type: 'warning', title: '未配置 OSS', message: '请先在设置中配置阿里云 OSS 的 AccessKey 和 Bucket' })
          setLoadingOss(false)
          return
        }
        const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
        useNotificationStore.getState().addNotification({ type: 'info', title: '正在拉取 OSS 素材...', message: '正在获取远程素材列表' })
        
        const ossObjects = await window.electronAPI.listOss(config as any, '')
        const newAssets: Asset[] = ossObjects.map((obj: any) => {
          const ext = '.' + obj.name.split('.').pop()?.toLowerCase()
          const isVideo = ['.mp4','.webm','.mov','.avi'].includes(ext)
          const isPanorama = obj.name.toLowerCase().includes('pano') || obj.name.toLowerCase().includes('360')
          return {
            id: obj.key,
            name: obj.name,
            type: isPanorama ? 'panorama' : isVideo ? 'video' : 'image',
            path: obj.url,
            size: obj.size,
            createdAt: obj.lastModified,
            tags: ['OSS'],
            ossKey: obj.key,
            source: 'oss',
          } as Asset
        })
        if (newAssets.length > 0) {
          const existingIds = new Set(assets.map(a => a.id))
          const added = newAssets.filter(a => !existingIds.has(a.id))
          setAssets([...assets, ...added])
          useNotificationStore.getState().addNotification({ type: 'success', title: 'OSS 加载成功', message: `新增加载了 ${added.length} 个远程素材` })
        } else {
          useNotificationStore.getState().addNotification({ type: 'info', title: '无新素材', message: 'OSS 上没有找到新的素材' })
        }
      } else {
        const resp = await fetch(OSS_MANIFEST_URL)
        if (resp.ok) { const data = await resp.json(); setAssets(data) }
      }
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: 'OSS 加载失败', message: e.message })
    } finally {
      setLoadingOss(false)
    }
  }, [setAssets, assets])

  const loadFromFeishu = useCallback(async () => {
    try {
      setLoadingFeishu(true)
      if (window.electronAPI?.listFeishu) {
        const provider = useProviderStore.getState().getProvider('feishuDrive')
        const endpoint = (provider?.endpoints[0] || {}) as any
        const appId = endpoint.appId || ''
        const appSecret = endpoint.appSecret || ''
        const folderToken = endpoint.folderToken || ''

        if (!appId || !appSecret || !folderToken) {
          useNotificationStore.getState().addNotification({ type: 'warning', title: '未配置飞书云盘', message: '请先在设置中配置飞书云盘的 App ID、App Secret 和文件夹 Token' })
          setLoadingFeishu(false)
          return
        }
        
        useNotificationStore.getState().addNotification({ type: 'info', title: '正在拉取飞书素材...', message: '正在同步远程文件到本地缓存...' })
        
        const config = { appId, appSecret, folderToken }
        const feishuObjects = await window.electronAPI.listFeishu(config as any)
        
        if (feishuObjects && feishuObjects.length > 0) {
          const feishuAssets = feishuObjects.map((a: any) => ({ ...a, source: 'feishu' as const }))
          const existingIds = new Set(assets.map(a => a.id))
          const added = feishuAssets.filter((a: any) => !existingIds.has(a.id))
          
          if (added.length > 0) {
            setAssets([...assets, ...added])
            useNotificationStore.getState().addNotification({ type: 'success', title: '飞书云盘加载成功', message: `新增加载了 ${added.length} 个远程素材` })
          } else {
            useNotificationStore.getState().addNotification({ type: 'info', title: '无新素材', message: '飞书云盘上没有找到新的素材' })
          }
        } else {
          useNotificationStore.getState().addNotification({ type: 'info', title: '无新素材', message: '飞书云盘为空或没有支持的素材' })
        }
      }
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: '飞书加载失败', message: e.message })
    } finally {
      setLoadingFeishu(false)
    }
  }, [setAssets, assets])

  const handleLocalScan = useCallback(() => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.webkitdirectory = true
    inp.onchange = () => {
      const files = Array.from(inp.files || [])
      const validExts = ['.png','.jpg','.jpeg','.gif','.webp','.mp4','.webm','.mov','.avi']
      const newAssets: Asset[] = files
        .filter(f => validExts.includes('.' + f.name.split('.').pop()?.toLowerCase()))
        .map(f => {
          const ext = '.' + f.name.split('.').pop()?.toLowerCase()
          const isVideo = ['.mp4','.webm','.mov','.avi'].includes(ext)
          const isPanorama = f.name.toLowerCase().includes('pano') || f.name.toLowerCase().includes('360')
          const objectUrl = URL.createObjectURL(f)
          return {
            id: objectUrl,
            name: f.name,
            type: isPanorama ? 'panorama' : isVideo ? 'video' : 'image',
            path: objectUrl,
            size: f.size,
            createdAt: new Date().toISOString(),
            tags: ['本地'],
            thumbnailPath: f.type.startsWith('image/') ? objectUrl : undefined,
            source: 'local',
          } as Asset
        })
      setAssets([...assets, ...newAssets])
    }
    inp.click()
  }, [assets, setAssets])

  const handleDeleteOss = useCallback(async () => {
    if (!ossDeleteAsset) return
    setOssDeleting(true)
    try {
      if (window.electronAPI?.deleteOss) {
        const provider = useProviderStore.getState().getProvider('oss')
        const endpoint = (provider?.endpoints[0] || {}) as any
        const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
        const key = ossDeleteAsset.ossKey || ossDeleteAsset.id
        const resultStr = await window.electronAPI.deleteOss(config as any, key)
        const result = JSON.parse(resultStr)
        if (result.success) {
          removeAsset(ossDeleteAsset.id)
          useNotificationStore.getState().addNotification({ type: 'success', title: 'OSS 删除成功', message: `已从 OSS 删除 "${ossDeleteAsset.name}"` })
        } else {
          useNotificationStore.getState().addNotification({ type: 'error', title: 'OSS 删除失败', message: result.error || '未知错误' })
        }
      }
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: 'OSS 删除失败', message: e.message })
    } finally {
      setOssDeleting(false)
      setOssDeleteAsset(null)
    }
  }, [ossDeleteAsset, removeAsset])

  const handleRemoveOnly = useCallback((asset: Asset) => {
    removeAsset(asset.id)
    setDeleteDialogAsset(null)
    useNotificationStore.getState().addNotification({ type: 'info', title: '已移除', message: `"${asset.name}" 已从素材库移除，本地文件保留。` })
  }, [removeAsset])

  const handleDeleteFile = useCallback(async (asset: Asset) => {
    if (asset.source === 'oss') {
      if (window.electronAPI?.deleteAnyOss) {
        const provider = useProviderStore.getState().getProvider('oss')
        const endpoint = (provider?.endpoints[0] || {}) as any
        const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
        const key = asset.ossKey || asset.id
        const resultStr = await window.electronAPI.deleteAnyOss(config as any, key)
        const result = JSON.parse(resultStr)
        if (result.success) {
          removeAsset(asset.id)
          useNotificationStore.getState().addNotification({ type: 'success', title: '已删除', message: `已从 OSS 删除 "${asset.name}"` })
        } else {
          useNotificationStore.getState().addNotification({ type: 'error', title: '删除失败', message: result.error || '未知错误' })
        }
      }
      setDeleteDialogAsset(null)
      return
    }
    if (asset.path.startsWith('nbc://')) {
      try {
        const url = new URL(asset.path)
        const filePath = decodeURIComponent(url.searchParams.get('path') || '')
        if (filePath && window.electronAPI?.trashFile) {
          const resultStr = await window.electronAPI.trashFile(filePath)
          const result = JSON.parse(resultStr)
          if (result.success) {
            removeAsset(asset.id)
            useNotificationStore.getState().addNotification({ type: 'success', title: '已删除', message: `"${asset.name}" 已放入回收站` })
          } else {
            useNotificationStore.getState().addNotification({ type: 'error', title: '删除失败', message: result.error || '无法放入回收站' })
            removeAsset(asset.id)
          }
        } else {
          removeAsset(asset.id)
        }
      } catch {
        removeAsset(asset.id)
      }
    } else {
      removeAsset(asset.id)
    }
    setDeleteDialogAsset(null)
  }, [removeAsset])

  const handleBatchDeleteOss = useCallback(async () => {
    const ossAssets = assetsWithProjects.filter(a => selectedAssetIds.includes(a.id) && (a.source === 'oss' || a.ossKey))
    if (ossAssets.length === 0) {
      removeAssets(selectedAssetIds)
      clearSelection()
      return
    }
    const names = ossAssets.slice(0, 5).map(a => a.name).join(', ')
    const more = ossAssets.length > 5 ? ` 等 ${ossAssets.length} 个文件` : ''
    if (!window.confirm(`确定要批量从 OSS 永久删除以下素材吗？\n\n${names}${more}\n\n此操作不可撤销。`)) return

    try {
      if (window.electronAPI?.deleteMultiOss) {
        const provider = useProviderStore.getState().getProvider('oss')
        const endpoint = (provider?.endpoints[0] || {}) as any
        const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
        const keys = ossAssets.map(a => a.ossKey || a.id)
        const resultStr = await window.electronAPI.deleteMultiOss(config as any, keys)
        const result = JSON.parse(resultStr)
        if (result.success) {
          removeAssets(ossAssets.map(a => a.id))
          useNotificationStore.getState().addNotification({ type: 'success', title: '批量删除成功', message: `已从 OSS 删除 ${ossAssets.length} 个素材` })
        } else {
          useNotificationStore.getState().addNotification({ type: 'error', title: '批量删除失败', message: result.error || '未知错误' })
        }
      }
    } catch (e: any) {
      useNotificationStore.getState().addNotification({ type: 'error', title: '批量删除失败', message: e.message })
    }
    // Also remove non-OSS selected assets from library
    const nonOssIds = selectedAssetIds.filter(id => !ossAssets.find(a => a.id === id))
    if (nonOssIds.length > 0) removeAssets(nonOssIds)
    clearSelection()
  }, [selectedAssetIds, assetsWithProjects, removeAssets, clearSelection])

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filtered.length) {
      selectAllFiltered([])
    } else {
      selectAllFiltered(filtered.map(a => a.id))
    }
  }

  const handleTagSave = useCallback(async (id: string, tags: AssetTag[]) => {
    updateAssetTags(id, tags)
    setTagEditAsset(null)
    const asset = assets.find(a => a.id === id)
    if (asset?.source === 'oss' && window.electronAPI?.setOssMeta) {
      try {
        const provider = useProviderStore.getState().getProvider('oss')
        const endpoint = (provider?.endpoints[0] || {}) as any
        if (endpoint.accessKeyId && endpoint.accessKeySecret && endpoint.bucket) {
          const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
          const key = asset.ossKey || asset.id
          await window.electronAPI.setOssMeta(config as any, key, { tags: tags.join(',') })
        }
      } catch {
        // Tag sync to OSS metadata is best-effort; silently ignore failures
      }
    }
  }, [assets, updateAssetTags])

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header flex flex-col items-stretch px-0 pb-0 gap-2 border-b border-node-border">
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="flex items-center gap-1.5 font-semibold text-[13px] text-text-primary truncate">
            <FolderOpen size={15} className="shrink-0 text-text-secondary" /> 素材库
          </span>
          <div className="flex items-center gap-1.5">
            <button
              className={`p-1 rounded-[3px] transition-colors text-[11px] ${isMultiSelectMode ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}
              onClick={toggleMultiSelectMode}
              title="批量选择"
            >
              <CheckSquare size={14} />
            </button>
            <div className="flex items-center bg-bg-tertiary p-0.5 rounded border border-node-border/50 shrink-0">
              <button 
                className={`p-1 rounded-[3px] transition-colors ${viewMode === 'grid' ? 'bg-bg-primary text-accent shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`} 
                onClick={() => setViewMode('grid')}
                title="网格视图"
              >
                <Grid3X3 size={14} />
              </button>
              <button 
                className={`p-1 rounded-[3px] transition-colors ${viewMode === 'list' ? 'bg-bg-primary text-accent shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`} 
                onClick={() => setViewMode('list')}
                title="列表视图"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Multi-select batch toolbar */}
        {isMultiSelectMode && selectedAssetIds.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border-b border-accent/20">
            <span className="text-[11px] text-accent font-medium">已选 {selectedAssetIds.length} 项</span>
            <div className="flex-1" />
            <button
              className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1"
              onClick={handleBatchDeleteOss}
            >
              <Trash2 size={11} /> 删除
            </button>
            <button
              className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary hover:bg-node-border transition-colors flex items-center gap-1"
              onClick={clearSelection}
            >
              <X size={11} /> 取消
            </button>
          </div>
        )}

        <div className="flex bg-bg-tertiary p-1 gap-1 mx-3 mb-3 mt-1 rounded-md shadow-inner border border-node-border/50">
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-[12px] font-medium transition-all duration-200 rounded-sm ${indexMode === 'category' ? 'bg-bg-primary text-accent shadow-sm scale-100' : 'text-text-secondary hover:text-text-primary scale-[0.98]'}`}
            onClick={() => setIndexMode('category')}
          >
            <LayoutGrid size={14} /> <span>按分类</span>
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-[12px] font-medium transition-all duration-200 rounded-sm ${indexMode === 'project' ? 'bg-bg-primary text-accent shadow-sm scale-100' : 'text-text-secondary hover:text-text-primary scale-[0.98]'}`}
            onClick={() => setIndexMode('project')}
          >
            <Folders size={14} /> <span>按项目</span>
          </button>
        </div>
      </div>

      <div className="p-3 pb-1">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="input pl-8 w-full py-1.5 bg-bg-secondary" placeholder="搜索素材..." value={searchQuery} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5 mt-1">
        {indexMode === 'category' ? (
          ALL_FILTER_TAGS.map((tag) => (
            <button key={tag} className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filterTag === tag ? 'bg-accent text-white shadow-sm' : 'bg-bg-tertiary text-text-secondary hover:bg-node-border hover:text-text-primary'}`} onClick={() => setFilterTag(tag as AssetTag | 'All')}>{tag === 'All' ? '全部' : ASSET_TAG_CN[tag] || tag}</button>
          ))
        ) : (
          <>
            <button className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filterProject === 'All' ? 'bg-accent text-white shadow-sm' : 'bg-bg-tertiary text-text-secondary hover:bg-node-border hover:text-text-primary'}`} onClick={() => setFilterProject('All')}>全部</button>
            <button className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filterProject === 'Unassigned' ? 'bg-accent text-white shadow-sm' : 'bg-bg-tertiary text-text-secondary hover:bg-node-border hover:text-text-primary'}`} onClick={() => setFilterProject('Unassigned')}>未分配</button>
            {projects.map((p) => (
              <button key={p.id} className={`text-[11px] px-2.5 py-1 rounded transition-colors ${filterProject === p.id ? 'bg-accent text-white shadow-sm' : 'bg-bg-tertiary text-text-secondary hover:bg-node-border hover:text-text-primary'}`} onClick={() => setFilterProject(p.id)} title={p.name}>
                {p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 mt-1 space-y-2 border-b border-node-border/50">
        <button className="btn btn-secondary text-[11px] font-medium w-full py-2 border-dashed" onClick={handleLocalScan}>
          <Upload size={14} className="mr-1.5 inline" /> 扫描本地文件夹
        </button>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-[11px] font-medium flex-1 py-1.5 bg-bg-secondary hover:bg-bg-tertiary" onClick={loadFromOSS} disabled={loadingOss}>
            {loadingOss ? <Loader2 size={14} className="inline animate-spin mr-1" /> : '☁️ '}
            {loadingOss ? '加载中...' : '阿里云 OSS'}
          </button>
          <button className="btn btn-secondary text-[11px] font-medium flex-1 py-1.5 bg-bg-secondary hover:bg-bg-tertiary" onClick={loadFromFeishu} disabled={loadingFeishu}>
            {loadingFeishu ? <Loader2 size={14} className="inline animate-spin mr-1" /> : '☁️ '}
            {loadingFeishu ? '拉取中...' : '飞书云盘'}
          </button>
        </div>
        {/* Select all checkbox in multi-select mode */}
        {isMultiSelectMode && filtered.length > 0 && (
          <button
            className="text-[10px] text-text-secondary hover:text-text-primary flex items-center gap-1"
            onClick={handleSelectAll}
          >
            {selectedAssetIds.length === filtered.length ? <CheckSquare size={13} className="text-accent" /> : <Square size={13} />}
            {selectedAssetIds.length === filtered.length ? '取消全选' : '全选当前'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 pt-3">
        {assets.length === 0 ? (
          <EmptyState icon={FolderOpen} title="暂无素材" subtitle="点击「扫描本地文件夹」或「加载 OSS 素材」" />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-xs">没有匹配的素材</div>
        ) : viewMode === 'grid' ? (
          <div className="asset-grid">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedAssetId === asset.id}
                onClick={() => selectAsset(asset.id)}
                onView={(a) => setViewerAsset(a)}
                onDelete={setDeleteDialogAsset}
                onEditTags={(a) => setTagEditAsset(a)}
                onDeleteOss={(a) => setDeleteDialogAsset(a)}
                isMultiSelect={isMultiSelectMode}
                isChecked={selectedAssetIds.includes(asset.id)}
                onToggleSelect={toggleAssetSelection}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {filtered.map((asset) => (
              <div 
                key={asset.id} 
                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs group ${selectedAssetId === asset.id ? 'bg-accent/20' : 'hover:bg-node-border'}`} 
                onClick={() => isMultiSelectMode ? toggleAssetSelection(asset.id) : selectAsset(asset.id)}
                draggable={!isMultiSelectMode}
                onDragStart={!isMultiSelectMode ? (e) => {
                  const payload = {
                    type: 'asset',
                    url: asset.path,
                    assetType: asset.type,
                    isLocal: asset.path.startsWith('blob:') || asset.path.startsWith('nbc://'),
                    name: asset.name,
                    prompt: asset.prompt
                  }
                  e.dataTransfer.setData('application/reactflow', JSON.stringify(payload))
                  e.dataTransfer.setData('application/asset', JSON.stringify(asset))
                  e.dataTransfer.effectAllowed = 'move'
                } : undefined}
              >
                {isMultiSelectMode && (
                  <button
                    className="p-0.5 rounded text-accent"
                    onClick={(e) => { e.stopPropagation(); toggleAssetSelection(asset.id) }}
                  >
                    {selectedAssetIds.includes(asset.id) ? <CheckSquare size={14} /> : <Square size={14} className="text-text-tertiary" />}
                  </button>
                )}
                <span className="text-text-secondary">{asset.type === 'image' ? <Image size={14} /> : asset.type === 'video' ? <Film size={14} /> : asset.type === 'text' ? <FileText size={14} /> : <Globe size={14} />}</span>
                <span className="flex-1 truncate">{asset.name}</span>
                <span className="text-text-secondary text-[10px]">{ASSET_TAG_CN[asset.tags[0]] || asset.tags[0]}</span>
                {!isMultiSelectMode && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(asset.type === 'image' || asset.type === 'video') && (
                      <button
                        className="p-0.5 rounded text-text-secondary hover:text-accent hover:bg-accent/10"
                        onClick={(e) => { e.stopPropagation(); setViewerAsset(asset) }}
                        title="查看大图/播放视频"
                      >
                        <Eye size={11} />
                      </button>
                    )}
                    <button
                      className="p-0.5 rounded text-text-secondary hover:text-accent hover:bg-accent/10"
                      onClick={(e) => { e.stopPropagation(); setTagEditAsset(asset) }}
                      title="编辑标签"
                    >
                      <Pencil size={11} />
                    </button>
                    {asset.source === 'oss' && (
                      <button
                        className="p-0.5 rounded text-text-secondary hover:text-orange-500 hover:bg-orange-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteDialogAsset(asset) }}
                        title="删除"
                      >
                        <CloudOff size={11} />
                      </button>
                    )}
                    <button
                      className="p-0.5 rounded text-text-secondary hover:text-red-500 hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteDialogAsset(asset) }}
                      title="从素材库移除"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAssetId && <AssetDetail />}

      {tagEditAsset && (
        <TagEditor
          asset={tagEditAsset}
          onSave={handleTagSave}
          onClose={() => setTagEditAsset(null)}
        />
      )}

      {/* OSS delete confirmation dialog */}
      {ossDeleteAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !ossDeleting && setOssDeleteAsset(null)}>
          <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl w-[360px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-node-border">
              <span className="text-sm font-semibold text-red-500">确认删除 OSS 文件</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-text-secondary mb-2">确定要永久删除以下 OSS 文件吗？</p>
              <p className="text-xs font-medium mb-1 truncate">{ossDeleteAsset.name}</p>
              <p className="text-[10px] text-text-tertiary mb-3">Key: {ossDeleteAsset.ossKey || ossDeleteAsset.id}</p>
              <p className="text-[10px] text-red-400/80 font-medium">⚠️ 此操作不可撤销</p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-node-border">
              <button className="btn btn-ghost text-xs" onClick={() => setOssDeleteAsset(null)} disabled={ossDeleting}>取消</button>
              <button className="btn bg-red-500 text-white text-xs hover:bg-red-600" onClick={handleDeleteOss} disabled={ossDeleting}>
                {ossDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogAsset && (
        <DeleteConfirmDialog
          asset={deleteDialogAsset}
          onClose={() => setDeleteDialogAsset(null)}
          onRemoveOnly={handleRemoveOnly}
          onDeleteFile={handleDeleteFile}
        />
      )}

      <input ref={fileInputRef} type="file" className="hidden" multiple />

      {viewerAsset && (
        <MediaViewer
          asset={viewerAsset}
          assetList={filtered.filter(a => a.type === 'image' || a.type === 'video')}
          onClose={() => setViewerAsset(null)}
          onNavigate={(a) => setViewerAsset(a)}
        />
      )}
    </div>
  )
}
