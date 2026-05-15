import { useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { useFlowStore } from '@/store/useFlowStore'
import { Plus, Pencil, Trash2, Library, Check, X, Download, Upload } from 'lucide-react'
import type { Workflow } from '@/types/workflow'
import type { NbcFile } from '@/types/project'
import EmptyState from '@/components/shared/EmptyState'

export default function WorkflowPanel() {
  const { workflows, activeWorkflowId, saveWorkflow, deleteWorkflow, renameWorkflow, setActiveWorkflow, importWorkflow } = useWorkflowStore()
  const { nodes, edges, loadFromProject } = useFlowStore()
  
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSaveCurrent = () => {
    if (!newName.trim()) return
    saveWorkflow(newName.trim(), nodes, edges, '从项目保存的工作流')
    setShowCreate(false)
    setNewName('')
  }

  const handleApply = (workflow: Workflow) => {
    if (!confirm('确定要将该工作流应用到当前项目吗？这将替换当前画布上的所有节点。')) return
    loadFromProject(workflow.nodes, workflow.edges)
    setActiveWorkflow(workflow.id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定删除该工作流模板？')) return
    deleteWorkflow(id)
  }

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditName(currentName)
  }

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      renameWorkflow(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <div className="flex items-center gap-1.5">
          <Library size={14} className="text-accent" />
          <span className="text-xs font-semibold">工作流库</span>
        </div>
        <button
          className="btn btn-ghost p-1 text-accent hover:bg-accent/10"
          onClick={() => setShowCreate(true)}
          title="将当前画布保存为工作流"
        >
          <Plus size={14} />
        </button>
      </div>

      {showCreate && (
        <div className="px-3 py-2 border-b border-node-border bg-bg-primary/50">
          <div className="text-[11px] text-text-secondary mb-1.5">保存当前工作流</div>
          <div className="flex gap-1.5">
            <input
              className="input flex-1 text-xs"
              placeholder="输入工作流名称..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrent()}
              autoFocus
            />
            <button className="btn btn-accent p-1" onClick={handleSaveCurrent}><Check size={12} /></button>
            <button className="btn btn-ghost p-1" onClick={() => { setShowCreate(false); setNewName('') }}><X size={12} /></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {workflows.length === 0 ? (
          <EmptyState icon={Library} title="没有保存的工作流" subtitle="点击 + 保存当前画布" />
        ) : (
          <div className="p-1.5 space-y-0.5">
            {workflows.map((wf) => {
              const isActive = wf.id === activeWorkflowId
              return (
                <div
                  key={wf.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors hover:bg-node-border border-l-2 ${isActive ? 'border-accent' : 'border-transparent'}`}
                  onClick={() => handleApply(wf)}
                >
                  <div className="flex-1 min-w-0">
                    {editingId === wf.id ? (
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
                        <div className="text-xs font-medium truncate text-text-primary">
                          {wf.name}
                        </div>
                        <div className="text-[10px] text-text-secondary mt-0.5 flex justify-between">
                          <span>{wf.nodeCount} 节点</span>
                          <span>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {editingId !== wf.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent"
                        onClick={(e) => startRename(wf.id, wf.name, e)}
                        title="重命名"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        className="btn btn-ghost p-0.5 text-text-secondary hover:text-red-400"
                        onClick={(e) => handleDelete(wf.id, e)}
                        title="删除"
                      >
                        <Trash2 size={10} />
                      </button>
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
