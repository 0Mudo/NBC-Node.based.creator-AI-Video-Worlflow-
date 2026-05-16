import { useState } from 'react'
import { Library, Star, Copy, Trash2, Plus, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { usePromptLibraryStore } from '@/store/usePromptLibraryStore'
import type { PromptTemplate, PromptCategory } from '@/types/promptTemplate'

const categories: Array<{ key: PromptCategory | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'style', label: '风格' },
  { key: 'shot', label: '镜头' },
  { key: 'lighting', label: '光影' },
  { key: 'character', label: '角色' },
  { key: 'scene', label: '场景' },
  { key: 'item', label: '物品' },
]

const categoryTagColors: Record<PromptCategory, string> = {
  style: 'tag-purple',
  shot: 'tag-blue',
  lighting: 'tag-yellow',
  character: 'tag-red',
  scene: 'tag-green',
  item: 'tag-orange',
}

const categoryLabels: Record<PromptCategory, string> = {
  style: '风格',
  shot: '镜头',
  lighting: '光影',
  character: '角色',
  scene: '场景',
  item: '物品',
}

interface CreateFormData {
  name: string
  category: PromptCategory
  prompt: string
  tags: string
}

const emptyForm: CreateFormData = {
  name: '',
  category: 'style',
  prompt: '',
  tags: '',
}

function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatRating(rating: number): string {
  return '⭐'.repeat(Math.min(rating, 5))
}

export default function PromptLibraryPanel() {
  const {
    templates,
    filterCategory,
    favoriteIds,
    setFilterCategory,
    addTemplate,
    removeTemplate,
    toggleFavorite,
    incrementUsage,
  } = usePromptLibraryStore()

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormData>({ ...emptyForm })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = templates.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (showFavoritesOnly && !favoriteIds.includes(t.id)) return false
    return true
  })

  const handleInsert = async (template: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.prompt)
      incrementUsage(template.id)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: template.prompt })
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      incrementUsage(template.id)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  const handleCreate = () => {
    const name = createForm.name.trim()
    const prompt = createForm.prompt.trim()
    if (!name || !prompt) return

    const tags = createForm.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)

    addTemplate({
      id: generateId(),
      name,
      category: createForm.category,
      prompt,
      tags,
      usageCount: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
    })

    setCreateForm({ ...emptyForm })
    setShowCreateForm(false)
  }

  const isBuiltin = (id: string) => id.startsWith('shot-') || id.startsWith('light-') || id.startsWith('char-')

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <Library size={14} />
          提示词库
        </span>
      </div>

      <div className="px-2 pt-2">
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={`text-[11px] px-2 py-1 rounded transition-colors ${
                filterCategory === cat.key
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-node-border/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-1 text-[10px] transition-colors ${
            showFavoritesOnly ? 'text-yellow-400' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <Star size={11} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          {showFavoritesOnly ? '已收藏' : '收藏'}
        </button>
        <span className="text-[10px] text-text-tertiary">
          {filtered.length} 个模板
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <Library size={24} className="mb-2 opacity-30" />
            <span className="text-[11px]">暂无模板</span>
          </div>
        )}

        {filtered.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            isFavorite={favoriteIds.includes(tpl.id)}
            isCopied={copiedId === tpl.id}
            onInsert={() => handleInsert(tpl)}
            onToggleFavorite={() => toggleFavorite(tpl.id)}
            onDelete={() => removeTemplate(tpl.id)}
            canDelete={!isBuiltin(tpl.id)}
          />
        ))}
      </div>

      <div className="border-t border-node-border px-2 py-2">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-secondary text-xs w-full flex items-center justify-center gap-1"
          >
            <Plus size={13} />
            新建模板
          </button>
        ) : (
          <CreateForm
            form={createForm}
            onChange={setCreateForm}
            onSave={handleCreate}
            onCancel={() => {
              setShowCreateForm(false)
              setCreateForm({ ...emptyForm })
            }}
          />
        )}
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  isFavorite,
  isCopied,
  onInsert,
  onToggleFavorite,
  onDelete,
  canDelete,
}: {
  template: PromptTemplate
  isFavorite: boolean
  isCopied: boolean
  onInsert: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = template.prompt.length > 100 ? template.prompt.slice(0, 100) + '…' : template.prompt

  return (
    <div className="border border-node-border rounded-md overflow-hidden bg-node-bg/30 hover:border-node-border/80 transition-colors">
      <div className="px-2.5 py-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-primary truncate">{template.name}</span>
              <span className={`tag ${categoryTagColors[template.category]} flex-shrink-0`}>
                {categoryLabels[template.category]}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-text-tertiary">
                {formatRating(template.rating || 0)}
              </span>
              <span className="text-[10px] text-text-tertiary">
                使用 {template.usageCount} 次
              </span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            className={`p-0.5 rounded transition-colors flex-shrink-0 ${
              isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-text-tertiary hover:text-yellow-400'
            }`}
            title={isFavorite ? '取消收藏' : '收藏'}
          >
            <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left mt-1.5 group"
        >
          <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2 group-hover:text-text-primary/80 transition-colors">
            {expanded ? template.prompt : preview}
          </p>
          {template.prompt.length > 100 && (
            <span className="text-[9px] text-text-tertiary mt-0.5 inline-flex items-center gap-0.5">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? '收起' : '展开全文'}
            </span>
          )}
        </button>

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded bg-node-border/30 text-text-tertiary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center border-t border-node-border/50">
        <button
          onClick={onInsert}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
            isCopied
              ? 'text-green-400 bg-green-400/10'
              : 'text-accent hover:bg-accent/10'
          }`}
        >
          {isCopied ? <Check size={11} /> : <Copy size={11} />}
          {isCopied ? '已复制' : '插入'}
        </button>

        {canDelete && (
          <button
            onClick={onDelete}
            className="px-2 py-1.5 text-[10px] text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="删除"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

function CreateForm({
  form,
  onChange,
  onSave,
  onCancel,
}: {
  form: CreateFormData
  onChange: (f: CreateFormData) => void
  onSave: () => void
  onCancel: () => void
}) {
  const valid = form.name.trim() && form.prompt.trim()

  return (
    <div className="space-y-2 p-2 border border-node-border rounded-md bg-bg-primary/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-primary">新建提示词模板</span>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary">
          <X size={12} />
        </button>
      </div>

      <input
        className="input text-[11px]"
        placeholder="模板名称"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
      />

      <select
        className="input text-[11px]"
        value={form.category}
        onChange={(e) => onChange({ ...form, category: e.target.value as PromptCategory })}
      >
        {categories.filter((c) => c.key !== 'all').map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      <textarea
        className="input text-[11px]"
        placeholder="提示词内容"
        rows={3}
        value={form.prompt}
        onChange={(e) => onChange({ ...form, prompt: e.target.value })}
      />

      <input
        className="input text-[11px]"
        placeholder="标签（逗号分隔）"
        value={form.tags}
        onChange={(e) => onChange({ ...form, tags: e.target.value })}
      />

      <div className="flex gap-1.5">
        <button onClick={onCancel} className="btn btn-ghost text-[11px] flex-1">
          取消
        </button>
        <button
          onClick={onSave}
          disabled={!valid}
          className="btn btn-primary text-[11px] flex-1"
        >
          <Plus size={12} />
          创建
        </button>
      </div>
    </div>
  )
}
