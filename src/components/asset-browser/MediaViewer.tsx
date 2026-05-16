import { useState, useCallback, useEffect, useRef } from 'react'
import type { Asset } from '@/types/asset'
import { ASSET_TAG_CN } from '@/types/asset'
import { useAssetStore } from '@/store/useAssetStore'
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX, Download, Copy, Check, Info } from 'lucide-react'

interface MediaViewerProps {
  asset: Asset
  assetList: Asset[]
  onClose: () => void
  onNavigate: (asset: Asset) => void
}

const TAG_CLASS: Record<string, string> = {
  'Character': 'tag-red', 'Scene': 'tag-yellow', 'GPT Image': 'tag-purple',
  'Seedance': 'tag-green', 'Item': 'tag-orange', 'Output': 'tag-blue', 'ZzzMap': 'tag-green',
}

function formatSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso?: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return iso }
}

export default function MediaViewer({ asset, assetList, onClose, onNavigate }: MediaViewerProps) {
  const [showInfo, setShowInfo] = useState(true)
  const [zoomed, setZoomed] = useState(false)
  const [copied, setCopied] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  const [videoCurrent, setVideoCurrent] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  const currentIdx = assetList.findIndex(a => a.id === asset.id)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < assetList.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(assetList[currentIdx - 1])
  }, [hasPrev, currentIdx, assetList, onNavigate])

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(assetList[currentIdx + 1])
  }, [hasNext, currentIdx, assetList, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'i' || e.key === 'I') setShowInfo(v => !v)
      if (e.key === 'f' || e.key === 'F') setZoomed(v => !v)
      if (e.key === ' ' && asset.type === 'video') {
        e.preventDefault()
        const v = videoRef.current
        if (v) v.paused ? v.play() : v.pause()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, goPrev, goNext, asset.type])

  useEffect(() => {
    setZoomed(false)
    setVideoPlaying(false)
    setVideoCurrent(0)
    setVideoDuration(0)
  }, [asset.id])

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrent(videoRef.current.currentTime)
      setVideoDuration(videoRef.current.duration || 0)
    }
  }

  const handleVideoPlay = () => setVideoPlaying(true)
  const handleVideoPause = () => setVideoPlaying(false)
  const handleVideoEnded = () => setVideoPlaying(false)

  const toggleVideoPlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play(); else v.pause()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setVideoMuted(!v.muted)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !videoDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * videoDuration
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    if (asset.path.startsWith('http://') || asset.path.startsWith('https://')) {
      window.open(asset.path, '_blank')
    } else {
      copyToClipboard(asset.path)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-white/90 font-medium truncate max-w-[400px]">{asset.name}</span>
          <span className="text-xs text-white/40">{currentIdx + 1} / {assetList.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors ${showInfo ? 'bg-white/10' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v) }}
            title="信息面板 (I)"
          >
            <Info size={16} />
          </button>
          {asset.type === 'image' && (
            <button
              className={`p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors ${zoomed ? 'bg-white/10' : ''}`}
              onClick={(e) => { e.stopPropagation(); setZoomed(v => !v) }}
              title="全屏/适配 (F)"
            >
              {zoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            title="下载/打开原图"
          >
            <Download size={16} />
          </button>
          <button
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            title="关闭 (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Left navigation area */}
        <div className="flex items-center px-2 z-10">
          {hasPrev && (
            <button
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              title="上一个 (←)"
            >
              <ChevronLeft size={32} />
            </button>
          )}
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {asset.type === 'video' ? (
            <div className="relative max-w-full max-h-full flex flex-col items-center">
              <video
                ref={videoRef}
                src={asset.path}
                className={`max-w-full rounded shadow-2xl cursor-pointer ${zoomed ? 'max-h-[95vh]' : 'max-h-[80vh]'}`}
                onClick={toggleVideoPlay}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
                onLoadedMetadata={handleVideoTimeUpdate}
                autoPlay
                playsInline
              />
              {/* Video controls bar */}
              <div className="mt-3 w-full max-w-[90%] flex items-center gap-3 text-white/80">
                <button onClick={toggleVideoPlay} className="p-1 hover:text-white">
                  {videoPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <span className="text-xs tabular-nums w-[70px]">{formatTime(videoCurrent)}</span>
                <div
                  className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group relative"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-white/80 rounded-full group-hover:bg-accent transition-colors"
                    style={{ width: `${videoDuration ? (videoCurrent / videoDuration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums w-[70px] text-right">{formatTime(videoDuration)}</span>
                <button onClick={toggleMute} className="p-1 hover:text-white">
                  {videoMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          ) : (
            <img
              src={asset.path}
              alt={asset.name}
              className={`rounded shadow-2xl transition-all ${zoomed ? 'max-w-[98vw] max-h-[98vh] object-contain' : 'max-w-[85vw] max-h-[80vh] object-contain'}`}
              onClick={(e) => { e.stopPropagation(); setZoomed(v => !v) }}
            />
          )}
        </div>

        {/* Right navigation area */}
        <div className="flex items-center px-2 z-10">
          {hasNext && (
            <button
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
              onClick={(e) => { e.stopPropagation(); goNext() }}
              title="下一个 (→)"
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>

        {/* Info sidebar */}
        {showInfo && (
          <div className="w-72 bg-black/80 border-l border-white/10 overflow-y-auto shrink-0 p-4 flex flex-col gap-3">
            <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">文件信息</div>

            <InfoRow label="文件名" value={asset.name} />
            <InfoRow label="类型" value={asset.type === 'image' ? '图片' : asset.type === 'video' ? '视频' : asset.type === 'panorama' ? '全景图' : '文本'} />
            {asset.width && asset.height && <InfoRow label="分辨率" value={`${asset.width} × ${asset.height}`} />}
            {asset.size && <InfoRow label="文件大小" value={formatSize(asset.size)} />}
            <InfoRow label="创建时间" value={formatDate(asset.createdAt)} />
            {asset.source && <InfoRow label="来源" value={asset.source} />}

            <div className="text-xs text-white/60 uppercase tracking-wider font-semibold mt-1">路径</div>
            <div className="relative group">
              <div className="text-[10px] text-white/50 bg-white/5 rounded px-2 py-1.5 break-all font-mono leading-relaxed">
                {asset.path}
              </div>
              <button
                className="absolute top-1 right-1 p-0.5 rounded text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(asset.path)}
                title="复制路径"
              >
                {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
              </button>
            </div>
            {asset.ossKey && <InfoRow label="OSS Key" value={asset.ossKey} />}

            <div className="text-xs text-white/60 uppercase tracking-wider font-semibold mt-1">标签</div>
            <div className="flex flex-wrap gap-1">
              {asset.tags.length > 0 ? asset.tags.map(t => (
                <span key={t} className={`tag text-[10px] ${TAG_CLASS[t] || 'tag-blue'}`}>{ASSET_TAG_CN[t] || t}</span>
              )) : <span className="text-[10px] text-white/30">无标签</span>}
            </div>

            {asset.prompt && (
              <>
                <div className="text-xs text-white/60 uppercase tracking-wider font-semibold mt-1">提示词</div>
                <div className="text-[10px] text-white/60 bg-white/5 rounded px-2 py-1.5 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {asset.prompt}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom thumbnail strip */}
      <div className="flex items-center gap-1 px-4 py-2 bg-black/60 border-t border-white/10 overflow-x-auto shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
        {assetList.map((a, i) => (
          <div
            key={a.id}
            className={`shrink-0 w-12 h-12 rounded overflow-hidden cursor-pointer border-2 transition-all ${a.id === asset.id ? 'border-accent scale-110' : 'border-transparent opacity-50 hover:opacity-80 hover:border-white/30'}`}
            onClick={() => onNavigate(a)}
            title={a.name}
          >
            {a.type === 'video' ? (
              <div className="w-full h-full bg-black flex items-center justify-center relative">
                <video src={a.path} className="w-full h-full object-cover pointer-events-none" muted />
                <Play size={10} className="absolute text-white/70 pointer-events-none" />
              </div>
            ) : (
              <img src={a.thumbnailPath || a.path} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[10px] text-white/40 shrink-0">{label}</span>
      <span className="text-[10px] text-white/70 text-right truncate">{value}</span>
    </div>
  )
}
