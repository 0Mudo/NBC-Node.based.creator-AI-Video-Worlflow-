import { memo, useState, useCallback, lazy, Suspense } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Map, Maximize2, Loader2 } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import type { NodeData } from '@/types/flow'
import type { Asset } from '@/types/asset'
import { MediaThumb, NodeFrame } from './shared'

const PanoramaViewer = lazy(() => import('@/components/panorama/PanoramaViewer'))

function SceneCardNode({ id, data, selected }: NodeProps<NodeData>) {
  const assetId = data.sceneAssetId as string | undefined
  const assetImage = useAssetStore((s) => assetId ? s.assets.find(a => a.id === assetId)?.thumbnailPath : undefined)
  const refImage = (data.sceneRefImage || assetImage) as string | undefined
  const names = Array.isArray(data.sceneNames) ? data.sceneNames as string[] : []
  const descriptions = Array.isArray(data.sceneDescriptions) ? data.sceneDescriptions as string[] : []
  const images = Array.isArray(data.sceneRefImages) ? data.sceneRefImages as string[] : []
  const sceneNames = names.length ? names : (data.sceneName ? [data.sceneName as string] : [])
  const previewImages = Array.from(new Set([refImage, ...images].filter(Boolean) as string[])).slice(0, 4)

  const [panoramaIndex, setPanoramaIndex] = useState<number | null>(null)

  const handleDoubleClick = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    e.preventDefault()
    const img = previewImages[index]
    if (!img) return
    setPanoramaIndex(index)
  }, [previewImages])

  const handlePanoramaClose = useCallback((capturedThumbnail?: string) => {
    if (panoramaIndex === null) {
      setPanoramaIndex(null)
      return
    }

    const store = useFlowStore.getState()
    const currentNode = store.nodes.find(n => n.id === id)
    const currentData = currentNode?.data || data

    if (capturedThumbnail) {
      if (panoramaIndex === 0) {
        store.updateNodeData(id, { sceneRefImage: capturedThumbnail })
      } else {
        const currentRefImages = Array.isArray(currentData.sceneRefImages)
          ? [...(currentData.sceneRefImages as string[])]
          : []
        const arrayIndex = panoramaIndex - 1
        if (arrayIndex < currentRefImages.length) {
          currentRefImages[arrayIndex] = capturedThumbnail
          store.updateNodeData(id, { sceneRefImages: currentRefImages })
        }
      }
    }

    setPanoramaIndex(null)
  }, [panoramaIndex, id, data])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dataStr = e.dataTransfer.getData('application/asset')
    if (dataStr) {
      try {
        const asset: Asset = JSON.parse(dataStr)
        useFlowStore.getState().updateNodeData(id, { sceneRefImage: asset.path || asset.id })
      } catch (err) { console.warn('Failed to parse asset data', err) }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const activePanoramaUrl = panoramaIndex !== null ? previewImages[panoramaIndex] : null

  return (
    <>
      {activePanoramaUrl && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-white/60" />
          </div>
        }>
          <PanoramaViewer
            imageUrl={activePanoramaUrl}
            onClose={handlePanoramaClose}
          />
        </Suspense>
      )}
      <NodeFrame
        nodeId={id}
        selected={selected}
        borderColor="#f9ca24"
        minWidth={220}
        minHeight={160}
      >
        <div
        className="h-full flex flex-col"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <Handle type="source" position={Position.Right} id="output" />
        <div className="node-header">
          <div className="node-icon" style={{ background: '#f9ca24', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><Map size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
          <span>{data.label || '场景卡'}</span>
          {previewImages.length > 0 && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent font-medium ml-auto" title="双击缩略图浏览360°全景">
              🌐 360°
            </span>
          )}
        </div>
        <div className="node-body flex-1 min-h-0 flex flex-col gap-2">
          <div className={`grid gap-2 ${previewImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} min-h-[88px] flex-1`}>
            {previewImages.length > 0 ? (
              previewImages.map((image, index) => (
                <div
                  key={`${image}_${index}`}
                  className="min-h-[40px] relative group cursor-pointer"
                  onDoubleClick={(e) => handleDoubleClick(e, index)}
                  title="双击浏览360°全景"
                >
                  <MediaThumb src={image} alt={sceneNames[index] || sceneNames[0] || ''} icon={<Map size={20} opacity={0.3} />} />
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Maximize2 size={16} className="text-white drop-shadow-lg" />
                  </div>
                </div>
              ))
            ) : (
              <MediaThumb icon={<Map size={20} opacity={0.3} />} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {sceneNames.length > 0 ? (
              <>
                <div style={{ fontWeight: 600, color: '#f9ca24' }}>
                  {sceneNames.length > 1 ? `${sceneNames.length} 个场景` : sceneNames[0]}
                </div>
                <div className="text-[10px] text-text-secondary leading-relaxed line-clamp-4">
                  {(descriptions.length ? descriptions.join('；') : (data.sceneDescription as string) || '已选择场景').slice(0, 160)}
                </div>
                {sceneNames.length > 1 && (
                  <div className="mt-1 text-[10px] text-text-secondary line-clamp-2">
                    {sceneNames.join('、')}
                  </div>
                )}
              </>
            ) : (
              <span className="text-text-secondary" style={{ fontSize: 11 }}>未设置场景</span>
            )}
            </div>
          </div>
        </div>
      </NodeFrame>
    </>
  )
}
export default memo(SceneCardNode)
