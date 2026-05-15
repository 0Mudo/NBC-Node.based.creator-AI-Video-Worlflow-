import { useState, useEffect, useRef } from 'react'
import DockLayout, { LayoutData, TabData } from 'rc-dock'
import "rc-dock/dist/rc-dock.css"

import AssetBrowser from '@/components/asset-browser/AssetBrowser'
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
import { useProjectStore } from '@/store/useProjectStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Settings, Workflow, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

const tabComponents: Record<string, React.ReactNode> = {
  project: <ProjectPanel />,
  workflow: <WorkflowPanel />,
  assets: <AssetBrowser />,
  flow: <FlowEditor />,
  palette: <NodePalette />,
  inspector: <Inspector />,
  queue: <GenerationQueue />,
  logs: <FailureLogPanel />,
  timeline: <TimelineView />,
  chat: <ChatPanel />,
  inspiration: <InspirationEditor />
};

export default function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
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
                { id: 'assets', title: '素材', content: <div/> }
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
                { id: 'palette', title: '节点面板', content: <div/> }
              ]
            },
            {
              size: 500,
              tabs: [
                { id: 'inspector', title: '属性检查器', content: <div/> }
              ]
            }
          ]
        }
      ]
    }
  };

  const loadTab = (tab: TabData) => {
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
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary nbc-dock-theme">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-node-border flex-shrink-0 z-10">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide ml-2">NBC · 节点式素材创作器</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost p-1.5" onClick={() => setTemplateOpen(true)} title="模板市场"><Workflow size={14} /></button>
          <button className="btn btn-ghost p-1.5" onClick={toggleTheme} title="切换主题">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
          <button className="btn btn-ghost p-1.5" onClick={() => setSettingsOpen(true)} title="API 设置"><Settings size={14} /></button>
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

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplateMarket open={templateOpen} onClose={() => setTemplateOpen(false)} />
    </div>
  )
}
