import { useState } from 'react'
import { Download, Film, Sparkles, Workflow, X, Loader2 } from 'lucide-react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { Workflow as WorkflowType } from '@/types/workflow'
import { basicTemplate, videoTemplate, fullTemplate } from '@/data/templates'

interface Template {
  id: string
  name: string
  description: string
  category: string
  icon: typeof Film
  url: string
  author: string
}

const TEMPLATE_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'image', label: '图像生成' },
  { id: 'video', label: '视频生成' },
  { id: 'workflow', label: '完整工作流' },
]

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'character-scene-basic',
    name: '角色场景基础模板',
    description: '包含角色卡、场景卡、提示词、GPT Image 生成节点的基础工作流',
    category: 'image',
    icon: Sparkles,
    url: '',
    author: 'NBC 内置',
  },
  {
    id: 'video-pipeline',
    name: '视频生成流水线',
    description: '从图像到视频的完整流水线：角色卡→场景卡→提示词→GPT Image→Seedance',
    category: 'video',
    icon: Film,
    url: '',
    author: 'NBC 内置',
  },
  {
    id: 'full-workflow',
    name: '完整创作工作流',
    description: '包含所有节点类型的完整工作流模板，适合团队协作',
    category: 'workflow',
    icon: Workflow,
    url: '',
    author: 'NBC 内置',
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function TemplateMarket({ open, onClose }: Props) {
  const { importWorkflow } = useWorkflowStore()
  const [templates, setTemplates] = useState<Template[]>(BUILT_IN_TEMPLATES)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('all')
  const [importing, setImporting] = useState<string | null>(null)

  const filtered = category === 'all' ? templates : templates.filter((t) => t.category === category)

  const handleUseTemplate = async (template: Template) => {
    setImporting(template.id)

    const applyToCanvas = (nodes: any[], edges: any[]) => {
      // 1. Load into FlowStore (Canvas)
      useFlowStore.getState().loadFromProject(nodes, edges)
      // 2. Save into current active Project if exists
      const projectId = useProjectStore.getState().activeProjectId
      if (projectId) {
        useProjectStore.getState().saveCurrentData(nodes, edges)
      }
      
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '模板导入成功',
        message: `「${template.name}」已加载到画布并覆盖当前项目`,
      })
      onClose()
    }

    if (template.url) {
      try {
        const res = await fetch(template.url)
        if (!res.ok) throw new Error(`下载失败: ${res.status}`)
        const text = await res.text()
        const parsed = JSON.parse(text) as WorkflowType
        importWorkflow(parsed)
        applyToCanvas(parsed.nodes, parsed.edges)
      } catch (e: any) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: '模板导入失败',
          message: e.message,
        })
      }
    } else {
      // Built-in templates
      if (template.id === 'character-scene-basic') {
        applyToCanvas(basicTemplate.nodes, basicTemplate.edges)
      } else if (template.id === 'video-pipeline') {
        applyToCanvas(videoTemplate.nodes, videoTemplate.edges)
      } else if (template.id === 'full-workflow') {
        applyToCanvas(fullTemplate.nodes, fullTemplate.edges)
      }
    }

    setImporting(null)
  }

  if (!open) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-dialog max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Workflow size={16} /> 模板市场
          </h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                category === cat.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-node-border'
              }`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.map((template) => {
            const Icon = template.icon
            return (
              <div
                key={template.id}
                className="border border-node-border rounded-lg p-3 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{template.name}</h3>
                      <span className="text-[10px] text-text-secondary px-1.5 py-0.5 bg-node-border rounded">
                        {template.author}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                  <button
                    className="btn btn-accent text-[11px] flex items-center gap-1 flex-shrink-0"
                    onClick={() => handleUseTemplate(template)}
                    disabled={importing === template.id}
                  >
                    {importing === template.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    使用
                  </button>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center text-text-secondary text-xs py-8">
              暂无模板
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-node-border">
          <p className="text-[10px] text-text-secondary">
            团队成员可通过 OSS 共享自定义模板
          </p>
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
