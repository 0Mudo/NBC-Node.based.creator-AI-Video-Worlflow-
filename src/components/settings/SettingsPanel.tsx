import { useState, useRef } from 'react'
import { X, Key, Plus, Trash2, ChevronDown, ChevronRight, TestTube, ToggleLeft, ToggleRight, Eye, EyeOff, FolderOpen, Download, Upload } from 'lucide-react'
import { useProviderStore } from '@/store/useProviderStore'
import { useAssetStore } from '@/store/useAssetStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { ProviderConfig } from '@/types/provider'

interface Props { open: boolean; onClose: () => void }

function ProviderCard({ provider }: { provider: ProviderConfig }) {
  const { updateProvider, toggleProvider, testConnection, removeProvider } = useProviderStore()
  const [expanded, setExpanded] = useState(false)
  const [testing, setTesting] = useState(false)
  const [localProvider, setLocalProvider] = useState<ProviderConfig>(provider)
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({})

  const handleParamChange = (key: string, value: string) => {
    setLocalProvider((prev) => {
      const endpoints = [...prev.endpoints]
      const endpoint = { ...endpoints[0] } as any
      endpoint[key] = value
      endpoints[0] = endpoint
      return { ...prev, endpoints }
    })
  }

  const handleSave = () => {
    updateProvider(provider.id, localProvider)
  }

  const handleTest = async () => {
    setTesting(true)
    await testConnection(provider.id)
    setTesting(false)
  }

  const defaultEndpoint = localProvider.endpoints.find((e) => e.isDefault) || localProvider.endpoints[0]

  return (
    <div className="border border-node-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-node-border/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">{provider.name}</div>
          <div className="text-[10px] text-text-secondary">
            {provider.capabilities.join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {provider.connected !== undefined && (
            <div className={`w-1.5 h-1.5 rounded-full ${provider.connected ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
          <button
            className="btn btn-ghost p-0.5"
            onClick={(e) => { e.stopPropagation(); toggleProvider(provider.id) }}
            title={provider.enabled ? '禁用' : '启用'}
          >
            {provider.enabled ? <ToggleRight size={16} className="text-accent" /> : <ToggleLeft size={16} className="text-text-secondary" />}
          </button>
          {expanded ? <ChevronDown size={12} className="text-text-secondary" /> : <ChevronRight size={12} className="text-text-secondary" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-node-border/50 pt-3">
          {provider.params.map((param) => {
            const isPassword = param.type === 'password'
            const showPassword = showPasswordMap[param.key] || false
            return (
              <div key={param.key}>
                <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1">
                  {param.label} {param.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    className="input text-xs w-full pr-8"
                    type={isPassword ? (showPassword ? 'text' : 'password') : param.type === 'url' ? 'url' : 'text'}
                    value={(defaultEndpoint as any)?.[param.key] || ''}
                    onChange={(e) => handleParamChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                  />
                  {isPassword && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      onClick={() => setShowPasswordMap(prev => ({ ...prev, [param.key]: !showPassword }))}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {defaultEndpoint && (
            <div>
              <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1">端点 URL</label>
              <input
                className="input text-xs"
                type="url"
                value={defaultEndpoint.url}
                onChange={(e) => handleParamChange('url', e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button className="btn btn-secondary text-xs flex items-center gap-1" onClick={handleTest} disabled={testing}>
              <TestTube size={10} /> {testing ? '测试中...' : '测试连接'}
            </button>
            <button className="btn btn-accent text-xs flex items-center gap-1" onClick={handleSave}>
              保存配置
            </button>
            <div className="flex-1" />
            <button
              className="btn btn-ghost text-xs flex items-center gap-1 text-red-400 hover:text-red-300"
              onClick={() => { if (confirm(`确定移除 ${provider.name}？`)) removeProvider(provider.id) }}
            >
              <Trash2 size={10} /> 移除
            </button>
          </div>

          {provider.lastTested && (
            <div className="text-[10px] text-text-secondary">
              上次测试: {new Date(provider.lastTested).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddProviderForm({ onClose }: { onClose: () => void }) {
  const { addProvider } = useProviderStore()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>(['text-to-image'])

  const capOptions = [
    { value: 'text-to-image', label: '文生图' },
    { value: 'image-to-image', label: '图生图' },
    { value: 'text-to-video', label: '文生视频' },
    { value: 'image-to-video', label: '图生视频' },
    { value: 'video-edit', label: '视频编辑' },
    { value: 'workflow', label: '工作流' },
    { value: 'llm', label: 'LLM 文本' },
  ]

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return
    const id = name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
    addProvider({
      id,
      name: name.trim(),
      capabilities: capabilities as ProviderConfig['capabilities'],
      icon: 'Plug',
      color: '#a29bfe',
      params: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '输入 API Key', required: true },
        ...(capabilities.includes('llm') ? [{ key: 'model', label: '模型名称', type: 'text' as const, placeholder: '例如: gpt-4o', required: true }] : [])
      ],
      endpoints: [
        { id: 'default', name: '默认端点', url: url.trim(), apiKey: apiKey.trim(), isDefault: true },
      ],
      enabled: true,
    })
    onClose()
  }

  return (
    <div className="border border-accent/30 rounded-lg p-3 space-y-3 bg-accent/5">
      <div className="text-xs font-medium flex items-center gap-1.5"><Plus size={12} /> 添加自定义 Provider</div>
      <div>
        <label className="text-[11px] text-text-secondary block mb-1">名称</label>
        <input className="input text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如: My Custom API" />
      </div>
      <div>
        <label className="text-[11px] text-text-secondary block mb-1">端点 URL</label>
        <input className="input text-xs" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1" />
      </div>
      <div>
        <label className="text-[11px] text-text-secondary block mb-1">API Key</label>
        <input className="input text-xs" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
      </div>
      <div>
        <label className="text-[11px] text-text-secondary block mb-1">能力类型</label>
        <div className="flex flex-wrap gap-1.5">
          {capOptions.map((opt) => (
            <button
              key={opt.value}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                capabilities.includes(opt.value)
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'border-node-border text-text-secondary hover:border-accent/50'
              }`}
              onClick={() => {
                setCapabilities((prev) =>
                  prev.includes(opt.value) ? prev.filter((c) => c !== opt.value) : [...prev, opt.value]
                )
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-accent text-xs" onClick={handleAdd}>添加</button>
        <button className="btn btn-secondary text-xs" onClick={onClose}>取消</button>
      </div>
    </div>
  )
}

import { useProjectStore } from '@/store/useProjectStore'

export default function SettingsPanel({ open, onClose }: Props) {
  const { providers, updateProvider } = useProviderStore()
  const { defaultLocalPath, setDefaultLocalPath } = useAssetStore()
  const { autoSaveInterval, setAutoSaveInterval } = useProjectStore()
  const [showAdd, setShowAdd] = useState(false)
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('nbc_operator_name') || '')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportIncludeKeys, setExportIncludeKeys] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const providerList = Object.values(providers)

  const handleExportConfig = () => {
    const providersExport: Record<string, any> = {}
    for (const [id, provider] of Object.entries(providers)) {
      if (exportIncludeKeys) {
        providersExport[id] = JSON.parse(JSON.stringify(provider))
      } else {
        const cleaned = JSON.parse(JSON.stringify(provider))
        cleaned.endpoints = cleaned.endpoints.map((ep: any) => {
          const { apiKey, accessKeySecret, appSecret, ...rest } = ep
          return rest
        })
        providersExport[id] = cleaned
      }
    }

    const generalSettings = {
      autoSaveInterval: autoSaveInterval,
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      providers: providersExport,
      general: generalSettings,
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nbc_config_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExportModalOpen(false)
  }

  const handleImportConfig = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)

        const isNewFormat = raw.providers !== undefined
        const importedProviders: Record<string, any> = isNewFormat ? raw.providers : raw

        const { providers: currentProviders } = useProviderStore.getState()
        const merged = { ...currentProviders }

        for (const [id, data] of Object.entries(importedProviders)) {
          if (currentProviders[id]) {
            const existing = currentProviders[id]
            const importedEndpoints = (data as any).endpoints || []
            const existingEndpoints = existing.endpoints

            const mergedEndpoints = importedEndpoints.map((impEp: any) => {
              const existEp = existingEndpoints.find((e: any) => e.id === impEp.id)
              if (existEp) {
                const mergedEp = { ...existEp, ...impEp }
                if (!impEp.apiKey && !impEp.accessKeySecret && !impEp.appSecret) {
                  ;(mergedEp as any).apiKey = existEp.apiKey
                  ;(mergedEp as any).accessKeySecret = existEp.accessKeySecret
                  ;(mergedEp as any).appSecret = existEp.appSecret
                }
                return mergedEp
              }
              return impEp
            })

            merged[id] = {
              ...existing,
              ...(data as any),
              endpoints: mergedEndpoints
            }
          } else {
            merged[id] = data as any
          }
        }

        useProviderStore.setState({ providers: merged })
        localStorage.setItem('nbc_providers', JSON.stringify(merged))

        if (isNewFormat && raw.general) {
          const g = raw.general
          if (typeof g.autoSaveInterval === 'number') {
            useProjectStore.getState().setAutoSaveInterval(g.autoSaveInterval)
          }
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: '配置已导入',
            message: `成功导入 ${Object.keys(importedProviders).length} 个 Provider 配置和通用设置。`
          })
        } else {
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: '配置已导入',
            message: `成功导入 ${Object.keys(importedProviders).length} 个 Provider 配置。`
          })
        }
      } catch (err) {
        alert('导入失败：文件格式不正确。')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSelectDefaultPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openDirectory()
      if (path) setDefaultLocalPath(path)
    }
  }

  const handleOperatorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setOperatorName(val)
    localStorage.setItem('nbc_operator_name', val)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Key size={16} /> 设置</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* General Settings */}
          <div>
            <h3 className="text-xs font-semibold mb-2 text-text-secondary">通用设置</h3>
            <div className="bg-bg-tertiary p-3 rounded-lg border border-node-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">默认本地素材目录 / 输出位置</div>
                  <div className="text-[10px] text-text-secondary mt-0.5 max-w-[200px] truncate" title={defaultLocalPath || '未设置 (默认：H:\\素材库)'}>
                    {defaultLocalPath || '未设置 (默认：H:\\素材库)'}
                  </div>
                </div>
                <button className="btn btn-secondary text-xs" onClick={handleSelectDefaultPath}>
                  <FolderOpen size={12} className="mr-1 inline" /> 选择目录
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">操作人用户名</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    用于记录生成日志和飞书状态同步
                  </div>
                </div>
                <input 
                  type="text" 
                  className="input text-xs w-40" 
                  placeholder="如: NBC User" 
                  value={operatorName} 
                  onChange={handleOperatorNameChange} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">项目自动保存备份</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    定时将项目及灵感数据导出为 .nbc.json 文件
                  </div>
                </div>
                <select 
                  className="input text-xs w-40"
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                >
                  <option value={0}>关闭自动备份</option>
                  <option value={5}>每 5 分钟</option>
                  <option value={10}>每 10 分钟</option>
                  <option value={30}>每 30 分钟</option>
                  <option value={60}>每 1 小时</option>
                </select>
              </div>
            </div>
          </div>

          {/* Provider Settings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-text-secondary">API 配置</h3>
              <div className="flex items-center gap-1.5">
                <button
                  className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border hover:border-accent/50 transition-colors"
                  onClick={handleImportConfig}
                  title="从 JSON 文件导入 Provider 配置"
                >
                  <Upload size={10} /> 导入
                </button>
                <button
                  className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border hover:border-accent/50 transition-colors"
                  onClick={() => setExportModalOpen(true)}
                  title="导出 Provider 配置为 JSON 文件"
                >
                  <Download size={10} /> 导出
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {providerList.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}

              {showAdd ? (
                <AddProviderForm onClose={() => setShowAdd(false)} />
              ) : (
                <button
                  className="w-full border border-dashed border-node-border rounded-lg py-3 text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1.5"
                  onClick={() => setShowAdd(true)}
                >
                  <Plus size={12} /> 添加自定义 Provider
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-3 border-t border-node-border">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {exportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setExportModalOpen(false)}>
          <div className="bg-bg-primary border border-node-border rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Download size={16} /> 导出全部配置
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              导出所有 Provider 配置和自动备份间隔设置。分享给团队成员时，导入方已有的相同 Provider 会合并更新。
            </p>
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={exportIncludeKeys}
                onChange={(e) => setExportIncludeKeys(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <div>
                <div className="text-xs font-medium">包含 API Key 等密钥</div>
                <div className="text-[10px] text-text-secondary">分享给他人时请关闭，密钥将以空白字段导出</div>
              </div>
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary text-xs" onClick={() => setExportModalOpen(false)}>取消</button>
              <button className="btn btn-accent text-xs" onClick={handleExportConfig}>
                <Download size={12} className="mr-1 inline" /> 导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
