import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import DockLayout, { LayoutData, TabData } from 'rc-dock'
import "rc-dock/dist/rc-dock.css"

import AssetBrowser from '@/components/asset-browser/AssetBrowser'
import OssBrowser from '@/components/asset-browser/OssBrowser'
import FlowEditor from '@/components/node-editor/FlowEditor'
import NodePalette from '@/components/node-editor/NodePalette'
import Inspector from '@/components/inspector/Inspector'
import GenerationQueue from '@/components/generation-queue/GenerationQueue'
import FailureLogPanel from '@/components/generation-queue/FailureLogPanel'
import ChatPanel from '@/components/chat/ChatPanel'
import SettingsPanel from '@/components/settings/SettingsPanel'
import ProjectPanel from '@/components/project/ProjectPanel'
import WorkflowPanel from '@/components/workflow/WorkflowPanel'
import TimelineView from '@/components/timeline/TimelineView'
import TemplateMarket from '@/components/templates/TemplateMarket'
import InspirationEditor from '@/components/inspiration-editor/InspirationEditor'
import PromptLibraryPanel from '@/components/prompt-library/PromptLibraryPanel'
import ExportPanel from '@/components/export/ExportPanel'
import AnalyticsPanel from '@/components/analytics/AnalyticsPanel'
import { useProjectStore } from '@/store/useProjectStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Settings, Workflow, Sun, Moon, LayoutDashboard, Download, BarChart3, X, Library } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

export default function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false)
  const dockRef = useRef<DockLayout>(null)

  const { projects, activeProjectId, autoSaveInterval } = useProjectStore()
  const { loadFromProject, newBlank } = useFlowStore()
  const { theme, toggleTheme, setTheme } = useThemeStore()

  // Project auto-save interval logic
  useEffect(() => {
    if (!autoSaveInterval || autoSaveInterval <= 0) return

    const timer = setInterval(() => {
      const activeProject = useProjectStore.getState().getActiveProject()
      if (!activeProject) return

      const fileData = useFlowStore.getState().exportToFile()
      const json = JSON.stringify(fileData, null, 2)
      
      if (window.electronAPI) {
        // Save to auto_saves directory quietly
        const filename = `${activeProject.name}_autosave.nbc.json`.replace(/[\\/:"*?<>|]/g, '_')
        const base64Data = btoa(unescape(encodeURIComponent(json)))
        window.electronAPI.saveFile(filename, base64Data, 'H:\\素材库\\auto_saves')
          .then(() => {
            useNotificationStore.getState().addNotification({
              type: 'info',
              title: '项目自动保存备份',
              message: `项目已自动备份为 ${filename}`
            })
          })
          .catch((e) => console.error('Auto save failed:', e))
      }
    }, autoSaveInterval * 60 * 1000)

    return () => clearInterval(timer)
  }, [autoSaveInterval])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Handle app closing from Electron
  useEffect(() => {
    if (!window.electronAPI?.onAppClosing) return
    
    const cleanup = window.electronAPI.onAppClosing(async () => {
      const activeProject = useProjectStore.getState().getActiveProject()
      if (activeProject) {
        try {
          const fileData = useFlowStore.getState().exportToFile()
          const json = JSON.stringify(fileData, null, 2)
          const filename = `${activeProject.name}_autosave.nbc.json`.replace(/[\\/:"*?<>|]/g, '_')
          const base64Data = btoa(unescape(encodeURIComponent(json)))
          if (window.electronAPI) {
            await window.electronAPI.saveFile(filename, base64Data, 'H:\\素材库\\auto_saves')
          }
        } catch (e) {
          console.error('Failed to save project on close:', e)
        }
      }
      // Tell Electron it's okay to close now
      if (window.electronAPI?.confirmAppClose) {
        window.electronAPI.confirmAppClose()
      }
    })
    
    return cleanup
  }, [])

  useEffect(() => {
    if (projects.length === 0) {
      const id = useProjectStore.getState().createProject('默认项目')
      newBlank()
    } else if (activeProjectId) {
      const data = useProjectStore.getState().loadCurrentData()
      if (data) {
        loadFromProject(data.nodes, data.edges)
      }
    } else {
      const first = projects[0]
      if (first) {
        const data = useProjectStore.getState().switchProject(first.id)
        if (data) loadFromProject(data.nodes, data.edges)
      }
    }
  }, [])

  const defaultLayout: LayoutData = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          mode: 'vertical',
          size: 260,
          children: [
            {
              tabs: [
                { id: 'project', title: '项目', content: <div/> },
                { id: 'workflow', title: '工作流', content: <div/> },
                { id: 'assets', title: '素材', content: <div/> },
                { id: 'oss', title: '云端', content: <div/> }
              ]
            }
          ]
        },
        {
          mode: 'vertical',
          size: 1000,
          children: [
            {
              tabs: [
                { id: 'flow', title: '节点编辑器', closable: false, content: <div/> },
                { id: 'inspiration', title: '灵感编辑器', closable: false, content: <div/> }
              ]
            },
            {
              size: 300,
              tabs: [
                { id: 'timeline', title: '时间线', content: <div/> },
                { id: 'queue', title: '生成队列', content: <div/> },
                { id: 'logs', title: '失败日志', content: <div/> },
                { id: 'chat', title: '通知', content: <div/> }
              ]
            }
          ]
        },
        {
          mode: 'vertical',
          size: 300,
          children: [
            {
              size: 300,
              tabs: [
                { id: 'palette', title: '节点面板', closable: false, content: <div/> }
              ]
            },
            {
              size: 500,
              tabs: [
                { id: 'inspector', title: '属性检查器', closable: false, content: <div/> }
              ]
            }
          ]
        }
      ]
    }
  };

  const handleRestoreLayout = useCallback(() => {
    dockRef.current?.loadLayout(defaultLayout)
  }, [])

  const tabComponents = useMemo<Record<string, React.ReactNode>>(() => ({
    project: <ProjectPanel />,
    workflow: <WorkflowPanel />,
    assets: <AssetBrowser />,
    oss: <OssBrowser />,
    flow: <FlowEditor />,
    palette: <NodePalette />,
    inspector: <Inspector />,
    queue: <GenerationQueue />,
    logs: <FailureLogPanel />,
    timeline: <TimelineView />,
    chat: <ChatPanel />,
    inspiration: <InspirationEditor />,
    promptLibrary: <PromptLibraryPanel />,
    export: <ExportPanel />,
    analytics: <AnalyticsPanel />,
  }), [])

  const loadTab = useCallback((tab: TabData) => {
    const tabIdStr = tab.id as string
    return {
      id: tab.id,
      title: (
        <div className="flex items-center gap-1.5 min-w-0 pr-4">
          <span className="truncate text-xs font-medium">{tab.title}</span>
        </div>
      ),
      closable: tab.closable ?? true,
      content: (
        <div className="h-full w-full overflow-hidden flex flex-col bg-bg-primary text-text-primary rounded-b-lg">
          <ErrorBoundary panelName={tabIdStr}>
            {tabComponents[tabIdStr]}
          </ErrorBoundary>
        </div>
      ),
    };
  }, [tabComponents]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary nbc-dock-theme">
      {/* Toolbar — Noir Studio Glass */}
      <div className="flex items-center justify-between h-12 px-4 toolbar-glass flex-shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-secondary)) 100%)',
                boxShadow: '0 2px 12px rgb(var(--accent) / 0.35)',
              }}
            >
              <span className="text-[11px] font-bold text-bg-primary leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>N</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-bold tracking-tight gradient-text font-display">NBC</span>
              <span className="text-[9px] text-text-tertiary tracking-[0.15em] uppercase">Node‑Based Creator</span>
            </div>
          </div>
          {/* Divider */}
          <div className="w-px h-5 bg-node-border/25" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => setTemplateOpen(true), [])} title="模板市场">
            <Workflow size={16} className="group-hover:text-accent transition-colors" />
          </button>
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => handleRestoreLayout(), [handleRestoreLayout])} title="恢复默认布局">
            <LayoutDashboard size={16} className="group-hover:text-accent transition-colors" />
          </button>
          <button className="btn btn-ghost btn-icon group" onClick={toggleTheme} title="切换主题">
            {theme === 'dark'
              ? <Sun size={16} className="group-hover:text-accent transition-colors" />
              : <Moon size={16} className="group-hover:text-accent transition-colors" />
            }
          </button>
          <div className="w-px h-4 bg-node-border/20 mx-0.5" />
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => setSettingsOpen(true), [])} title="API 设置">
            <Settings size={16} className="group-hover:text-accent transition-colors" />
          </button>
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => setPromptLibraryOpen(true), [])} title="提示词库">
            <Library size={16} className="group-hover:text-accent transition-colors" />
          </button>
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => setExportOpen(true), [])} title="视频导出">
            <Download size={16} className="group-hover:text-accent transition-colors" />
          </button>
          <button className="btn btn-ghost btn-icon group" onClick={useCallback(() => setAnalyticsOpen(true), [])} title="生成分析">
            <BarChart3 size={16} className="group-hover:text-accent transition-colors" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <DockLayout
          ref={dockRef}
          defaultLayout={defaultLayout}
          loadTab={loadTab}
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      </div>

      <SettingsPanel open={settingsOpen} onClose={useCallback(() => setSettingsOpen(false), [])} />
      <TemplateMarket open={templateOpen} onClose={useCallback(() => setTemplateOpen(false), [])} />

      {exportOpen && (
        <div className="settings-overlay animate-fade-in" onClick={useCallback(() => setExportOpen(false), [])}>
          <div className="settings-dialog w-[520px] h-[540px] flex flex-col !p-0 animate-reveal-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-node-border/25 flex-shrink-0">
              <h2 className="text-sm font-semibold flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-secondary)) 100%)' }}>
                  <Download size={15} className="text-bg-primary" />
                </span>
                视频导出
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={useCallback(() => setExportOpen(false), [])}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ExportPanel />
            </div>
          </div>
        </div>
      )}

      {analyticsOpen && (
        <div className="settings-overlay animate-fade-in" onClick={useCallback(() => setAnalyticsOpen(false), [])}>
          <div className="settings-dialog w-[580px] h-[520px] flex flex-col !p-0 animate-reveal-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-node-border/25 flex-shrink-0">
              <h2 className="text-sm font-semibold flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-secondary)) 100%)' }}>
                  <BarChart3 size={15} className="text-bg-primary" />
                </span>
                生成分析
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={useCallback(() => setAnalyticsOpen(false), [])}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      )}

      {promptLibraryOpen && (
        <div className="settings-overlay animate-fade-in" onClick={useCallback(() => setPromptLibraryOpen(false), [])}>
          <div className="settings-dialog w-[540px] h-[600px] flex flex-col !p-0 animate-reveal-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-node-border/25 flex-shrink-0">
              <h2 className="text-sm font-semibold flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-secondary)) 100%)' }}>
                  <Library size={15} className="text-bg-primary" />
                </span>
                提示词库
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={useCallback(() => setPromptLibraryOpen(false), [])}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PromptLibraryPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
