import { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useFlowStore } from '@/store/useFlowStore'
import { Plus, Pencil, Trash2, FolderOpen, Check, X, Upload, Download } from 'lucide-react'

export default function ProjectPanel() {
  const { projects, activeProjectId, createProject, deleteProject, renameProject, switchProject } = useProjectStore()
  const { loadFromProject, newBlank } = useFlowStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    const id = createProject(newName.trim())
    newBlank()
    setShowCreate(false)
    setNewName('')
  }

  const handleSave = () => {
    const { nodes, edges } = useFlowStore.getState()
    useProjectStore.getState().saveCurrentData(nodes, edges)
  }

  const handleExport = () => {
    const fileData = useFlowStore.getState().exportToFile()
    const json = JSON.stringify(fileData, null, 2)
    const activeProject = useProjectStore.getState().getActiveProject()
    
    if (window.electronAPI) {
      window.electronAPI.saveToFile(json, activeProject?.name || 'workflow').then((res: any) => {
        if (res.success) console.log('Saved to:', res.filePath)
      })
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeProject?.name || 'workflow'}.nbc.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSwitch = (id: string) => {
    if (id === activeProjectId) return
    const data = switchProject(id)
    if (data) {
      loadFromProject(data.nodes, data.edges)
    } else {
      newBlank()
    }
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (id === activeProjectId) return
    if (!confirm('确定删除该项目？')) return
    deleteProject(id)
  }

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditName(currentName)
  }

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      renameProject(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-node-border">
        <div className="flex items-center gap-1.5">
          <FolderOpen size={14} className="text-accent" />
          <span className="text-xs font-semibold">项目列表</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className="btn btn-ghost p-1 text-text-secondary hover:text-accent hover:bg-accent/10"
            onClick={handleSave}
            title="保存当前项目"
          >
            <Check size={14} />
          </button>
          <button
            className="btn btn-ghost p-1 text-text-secondary hover:text-accent hover:bg-accent/10"
            onClick={handleExport}
            title="导出工作流 (.nbc.json)"
          >
            <Download size={14} />
          </button>
          <button
            className="btn btn-ghost p-1 text-accent hover:bg-accent/10"
            onClick={() => setShowCreate(true)}
            title="新建项目"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="px-3 py-2 border-b border-node-border bg-bg-primary/50">
          <div className="text-[11px] text-text-secondary mb-1.5">项目名称</div>
          <div className="flex gap-1.5">
            <input
              className="input flex-1 text-xs"
              placeholder="输入项目名称..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-accent p-1" onClick={handleCreate}><Check size={12} /></button>
            <button className="btn btn-ghost p-1" onClick={() => { setShowCreate(false); setNewName('') }}><X size={12} /></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <FolderOpen size={24} className="mb-2 opacity-30" />
            <p className="text-[11px]">还没有项目</p>
            <p className="text-[10px] opacity-60">点击 + 创建第一个项目</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId
              return (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/15 border-l-2 border-accent'
                      : 'hover:bg-node-border border-l-2 border-transparent'
                  }`}
                  onClick={() => handleSwitch(project.id)}
                >
                  <div className="flex-1 min-w-0">
                    {editingId === project.id ? (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="input flex-1 text-xs py-0.5"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename()
                            if (e.key === 'Escape') cancelRename()
                          }}
                          autoFocus
                        />
                        <button className="btn btn-ghost p-0.5" onClick={confirmRename}><Check size={10} /></button>
                        <button className="btn btn-ghost p-0.5" onClick={cancelRename}><X size={10} /></button>
                      </div>
                    ) : (
                      <>
                        <div className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                          {project.name}
                        </div>
                        <div className="text-[10px] text-text-secondary mt-0.5">
                          {project.nodeCount} 节点 · {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                  {editingId !== project.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent"
                        onClick={(e) => startRename(project.id, project.name, e)}
                        title="重命名"
                      >
                        <Pencil size={10} />
                      </button>
                      {!isActive && (
                        <button
                          className="btn btn-ghost p-0.5 text-text-secondary hover:text-danger"
                          onClick={(e) => handleDelete(project.id, e)}
                          title="删除"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
