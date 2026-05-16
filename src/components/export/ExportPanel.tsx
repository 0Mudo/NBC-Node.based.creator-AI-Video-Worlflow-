import { useState } from 'react'
import { Download, FolderOpen, Loader2, Check, X, Film } from 'lucide-react'
import { useTimelineStore } from '@/store/useTimelineStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import EmptyState from '@/components/shared/EmptyState'

type ExportFormat = 'mp4'
type ExportResolution = '1080p' | '720p' | '480p'
type ExportFps = 24 | 30

interface ExportSettings {
  format: ExportFormat
  resolution: ExportResolution
  fps: ExportFps
  concatShots: boolean
  burnSubtitles: boolean
  includeVoiceover: boolean
  outputPath: string
}

export default function ExportPanel() {
  const tracks = useTimelineStore((s) => s.tracks)
  const activeProject = useProjectStore((s) => s.getActiveProject())
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    resolution: '1080p',
    fps: 24,
    concatShots: true,
    burnSubtitles: true,
    includeVoiceover: false,
    outputPath: 'H:\\素材库\\export',
  })
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completedPath, setCompletedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoTrack = tracks.find((t) => t.type === 'video')
  const clipCount = videoTrack?.clips.length || 0
  const totalDuration = tracks.reduce((max, t) => {
    for (const c of t.clips) {
      const end = c.startTime + c.duration
      if (end > max) max = end
    }
    return max
  }, 0)

  const handleExport = async () => {
    if (clipCount === 0) {
      useNotificationStore.getState().addNotification({
        type: 'error',
        title: '无素材可导出',
        message: '时间线上没有可用素材',
      })
      return
    }

    setError(null)
    setExporting(true)
    setProgress(0)

    const exportData = {
      projectName: activeProject?.name || '未命名项目',
      format: settings.format,
      resolution: settings.resolution,
      fps: settings.fps,
      concatShots: settings.concatShots,
      burnSubtitles: settings.burnSubtitles,
      includeVoiceover: settings.includeVoiceover,
      outputPath: settings.outputPath,
      clipCount,
      totalDuration,
    }

    if (window.electronAPI?.exportVideo) {
      try {
        const outputPath = await window.electronAPI.exportVideo(exportData)
        setProgress(100)
        setCompletedPath(outputPath || `${settings.outputPath}\\output.mp4`)
        useNotificationStore.getState().addNotification({
          type: 'success',
          title: '导出完成',
          message: `视频已导出至 ${outputPath || settings.outputPath}`,
        })
      } catch (e: any) {
        setError(e.message || '导出失败')
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: '导出失败',
          message: e.message || '未知错误',
        })
      }
    } else {
      // Simulate progress in dev mode
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise((r) => setTimeout(r, 150))
      }
      setCompletedPath(`${settings.outputPath}\\${activeProject?.name || 'output'}.mp4`)
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '导出完成（模拟）',
        message: 'Electron 环境下将使用 ffmpeg 导出',
      })
    }

    setExporting(false)
  }

  const handleOpenFolder = () => {
    if (window.electronAPI?.openInShell) {
      window.electronAPI.openInShell(settings.outputPath)
    }
  }

  const handleReset = () => {
    setCompletedPath(null)
    setProgress(0)
    setError(null)
  }

  const resolutionOptions = [
    { value: '1080p' as const, label: '1080p (1920×1080)' },
    { value: '720p' as const, label: '720p (1280×720)' },
    { value: '480p' as const, label: '480p (854×480)' },
  ]

  const fpsOptions = [
    { value: 24 as const, label: '24 fps' },
    { value: 30 as const, label: '30 fps' },
  ]

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <Download size={14} className="text-accent" /> 视频导出
          {clipCount > 0 && (
            <span className="text-[10px] text-text-tertiary">
              {clipCount}镜 · {totalDuration}秒
            </span>
          )}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {clipCount === 0 ? (
          <EmptyState icon={Film} title="暂无素材" subtitle="在时间线添加素材后可导出" />
        ) : completedPath && !exporting ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-success text-sm">
              <Check size={18} />
              导出完成！
            </div>

            <div className="bg-bg-tertiary/30 rounded-lg p-3 border border-node-border space-y-2">
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">输出路径</div>
              <div className="text-xs text-text-primary font-mono break-all bg-bg-primary rounded px-2 py-1 border border-node-border/50">
                {completedPath}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn btn-accent text-xs flex items-center gap-1.5 flex-1" onClick={handleOpenFolder}>
                <FolderOpen size={14} />
                打开文件夹
              </button>
              <button className="btn btn-secondary text-xs flex items-center gap-1.5 flex-1" onClick={handleReset}>
                继续导出
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5">
                输出格式
              </label>
              <select
                className="input text-xs w-full"
                value={settings.format}
                onChange={(e) => setSettings({ ...settings, format: e.target.value as ExportFormat })}
                disabled={exporting}
              >
                <option value="mp4">MP4 (H.264)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5">
                分辨率
              </label>
              <select
                className="input text-xs w-full"
                value={settings.resolution}
                onChange={(e) =>
                  setSettings({ ...settings, resolution: e.target.value as ExportResolution })
                }
                disabled={exporting}
              >
                {resolutionOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5">
                帧率
              </label>
              <select
                className="input text-xs w-full"
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) as ExportFps })}
                disabled={exporting}
              >
                {fpsOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded accent-accent"
                  checked={settings.concatShots}
                  onChange={(e) => setSettings({ ...settings, concatShots: e.target.checked })}
                  disabled={exporting}
                />
                <span className="text-xs">拼接分镜序列</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded accent-accent"
                  checked={settings.burnSubtitles}
                  onChange={(e) => setSettings({ ...settings, burnSubtitles: e.target.checked })}
                  disabled={exporting}
                />
                <span className="text-xs">烧录字幕</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded accent-accent"
                  checked={settings.includeVoiceover}
                  onChange={(e) => setSettings({ ...settings, includeVoiceover: e.target.checked })}
                  disabled={exporting}
                />
                <span className="text-xs">包含配音</span>
              </label>
            </div>

            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5">
                输出路径
              </label>
              <input
                className="input text-xs w-full font-mono"
                value={settings.outputPath}
                onChange={(e) => setSettings({ ...settings, outputPath: e.target.value })}
                disabled={exporting}
              />
            </div>

            {exporting && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-xs text-text-secondary">导出中... {progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded px-3 py-2 border border-danger/20">
                <X size={14} />
                {error}
              </div>
            )}

            <button
              className="btn btn-accent w-full text-sm flex items-center justify-center gap-2 py-2.5"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  导出
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
