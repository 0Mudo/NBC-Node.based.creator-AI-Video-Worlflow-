import { useState, useRef, useEffect } from 'react'
import { X, Key, Plus, Trash2, ChevronDown, ChevronRight, TestTube, ToggleLeft, ToggleRight, Eye, EyeOff, FolderOpen, Download, Upload, RefreshCw, Clock, Check, Loader2 } from 'lucide-react'
import { useProviderStore } from '@/store/useProviderStore'
import { useAssetStore } from '@/store/useAssetStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { ProviderConfig } from '@/types/provider'
import CardGenSettingsPanel from './CardGenSettingsPanel'

interface Props { open: boolean; onClose: () => void }

function ProviderCard({ provider }: { provider: ProviderConfig }) {
  const { updateProvider, toggleProvider, testConnection, removeProvider } = useProviderStore()
  const [expanded, setExpanded] = useState(false)
  const [testing, setTesting] = useState(false)
  const [localProvider, setLocalProvider] = useState<ProviderConfig>(provider)
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLocalProvider(provider)
  }, [provider])

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
    <div className="border border-node-border/20 rounded-xl overflow-hidden card-lift bg-bg-primary/60 backdrop-blur-sm">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-node-border/15 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
          style={{ backgroundColor: provider.color, boxShadow: `0 0 8px ${provider.color}40` }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold">{provider.name}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {provider.capabilities.join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {provider.connected !== undefined && (
            <div className={`w-2 h-2 rounded-full ${provider.connected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]' : 'bg-red-400'}`} />
          )}
          <button
            className="btn btn-ghost p-0.5"
            onClick={(e) => { e.stopPropagation(); toggleProvider(provider.id) }}
            title={provider.enabled ? '禁用' : '启用'}
          >
            {provider.enabled ? <ToggleRight size={17} className="text-accent" /> : <ToggleLeft size={17} className="text-text-secondary" />}
          </button>
          {expanded ? <ChevronDown size={13} className="text-text-secondary" /> : <ChevronRight size={13} className="text-text-secondary" />}
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

interface SyncConfig {
  feishuAppId: string
  feishuAppSecret: string
  bitableAppToken: string
  bitableTableId: string
  autoSync: boolean
  autoSyncInterval: number
  allowedActions: string[]
}

const SYNC_CONFIG_KEY = 'nbc_feishu_sync_config'

const ALL_EVENT_ACTIONS = [
  { key: 'project:create', label: '项目创建' },
  { key: 'generation:start', label: '生成开始' },
  { key: 'generation:complete', label: '生成完成' },
  { key: 'generation:fail', label: '生成失败' },
]

function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    feishuAppId: '',
    feishuAppSecret: '',
    bitableAppToken: '',
    bitableTableId: '',
    autoSync: false,
    autoSyncInterval: 5,
    allowedActions: ['project:create', 'generation:start', 'generation:complete', 'generation:fail'],
  }
}

function saveSyncConfig(config: SyncConfig) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
}

function FeishuSyncSettings() {
  const [config, setConfig] = useState<SyncConfig>(loadSyncConfig)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { addNotification } = useNotificationStore()

  const update = (patch: Partial<SyncConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      saveSyncConfig(next)
      return next
    })
  }

  const toggleAction = (key: string) => {
    setConfig((prev) => {
      const next = prev.allowedActions.includes(key)
        ? { ...prev, allowedActions: prev.allowedActions.filter((a) => a !== key) }
        : { ...prev, allowedActions: [...prev.allowedActions, key] }
      saveSyncConfig(next)
      return next
    })
  }

  const handleSync = async () => {
    if (!config.feishuAppId || !config.feishuAppSecret || !config.bitableAppToken || !config.bitableTableId) {
      addNotification({ type: 'warning', title: '配置不完整', message: '请先填写飞书同步所需的 App ID、App Secret、表格 Token 和 Table ID。' })
      return
    }
    if (config.allowedActions.length === 0) {
      addNotification({ type: 'warning', title: '未选择事件', message: '请至少选择一个要同步的事件类型。' })
      return
    }
    setSyncing(true)
    setLastResult(null)
    try {
      if (window.electronAPI?.runFeishuSync) {
        const result = await window.electronAPI.runFeishuSync({
          feishuAppId: config.feishuAppId,
          feishuAppSecret: config.feishuAppSecret,
          bitableAppToken: config.bitableAppToken,
          bitableTableId: config.bitableTableId,
          allowedActions: config.allowedActions,
        })
        if (result.success) {
          const msg = `同步完成：${result.synced} 条新事件${result.skipped > 0 ? `（已过滤 ${result.skipped} 条）` : ''}`
          setLastResult(msg)
          addNotification({ type: 'success', title: '飞书同步完成', message: msg })
        } else {
          setLastResult(`同步失败：${result.error}`)
          addNotification({ type: 'error', title: '飞书同步失败', message: result.error || '未知错误' })
        }
      } else {
        setLastResult('当前非 Electron 环境，无法运行同步（请启动桌面应用）')
        addNotification({ type: 'warning', title: '无法同步', message: '飞书同步功能需在 Electron 桌面应用中运行。' })
      }
    } catch (e: any) {
      setLastResult(`同步异常：${e.message}`)
      addNotification({ type: 'error', title: '同步异常', message: e.message })
    }
    setSyncing(false)
  }

  // 自动同步定时器管理
  useEffect(() => {
    if (syncTimerRef.current) { clearInterval(syncTimerRef.current); syncTimerRef.current = null }

    if (config.autoSync && config.feishuAppId && config.feishuAppSecret && config.bitableAppToken && config.bitableTableId && config.allowedActions.length > 0) {
      const intervalMs = config.autoSyncInterval * 60 * 1000
      syncTimerRef.current = setInterval(() => {
        if (window.electronAPI?.runFeishuSync) {
          window.electronAPI.runFeishuSync({
            feishuAppId: config.feishuAppId,
            feishuAppSecret: config.feishuAppSecret,
            bitableAppToken: config.bitableAppToken,
            bitableTableId: config.bitableTableId,
            allowedActions: config.allowedActions,
          }).then((result) => {
            if (result.success && result.synced > 0) {
              addNotification({ type: 'info', title: '飞书自动同步', message: `已同步 ${result.synced} 条事件` })
            }
          }).catch(() => {})
        }
      }, intervalMs)
    }

    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current) }
  }, [config.autoSync, config.autoSyncInterval, config.feishuAppId, config.feishuAppSecret, config.bitableAppToken, config.bitableTableId, config.allowedActions.length])

  return (
    <div>
      <h3 className="text-[11px] font-semibold mb-3 text-text-secondary uppercase tracking-wider flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-accent/50" />
        飞书多维表格同步
      </h3>
      <div className="bg-bg-tertiary/50 p-3 rounded-lg border border-node-border space-y-3">
        <p className="text-[10px] text-text-secondary">将 NBC 操作事件（项目创建、生成开始/完成/失败）自动同步到飞书多维表格。</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-secondary block mb-0.5">App ID</label>
            <input className="input text-xs w-full" type="password" value={config.feishuAppId}
              onChange={(e) => update({ feishuAppId: e.target.value })} placeholder="cli_..." />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-0.5">App Secret</label>
            <input className="input text-xs w-full" type="password" value={config.feishuAppSecret}
              onChange={(e) => update({ feishuAppSecret: e.target.value })} placeholder="飞书应用密钥" />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-0.5">多维表格 App Token</label>
            <input className="input text-xs w-full" value={config.bitableAppToken}
              onChange={(e) => update({ bitableAppToken: e.target.value })} placeholder="Wg8Jb..." />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-0.5">表格 Table ID</label>
            <input className="input text-xs w-full" value={config.bitableTableId}
              onChange={(e) => update({ bitableTableId: e.target.value })} placeholder="tblHwf..." />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-text-secondary block mb-1">同步事件类型</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EVENT_ACTIONS.map((act) => (
              <button key={act.key}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${config.allowedActions.includes(act.key) ? 'bg-accent/20 border-accent text-accent' : 'border-node-border text-text-secondary hover:border-accent/50'}`}
                onClick={() => toggleAction(act.key)}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="w-3.5 h-3.5 rounded accent-accent"
                checked={config.autoSync} onChange={(e) => update({ autoSync: e.target.checked })} />
              <span className="text-xs">启用自动同步</span>
            </label>
            {config.autoSync && (
              <select className="input text-[10px] py-0.5 w-32"
                value={config.autoSyncInterval} onChange={(e) => update({ autoSyncInterval: parseInt(e.target.value) || 5 })}>
                <option value={1}>每 1 分钟</option>
                <option value={5}>每 5 分钟</option>
                <option value={10}>每 10 分钟</option>
                <option value={30}>每 30 分钟</option>
                <option value={60}>每 1 小时</option>
              </select>
            )}
          </div>
          <button className="btn btn-accent text-xs flex items-center gap-1.5" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncing ? '同步中...' : '立即同步'}
          </button>
        </div>

        {lastResult && (
          <div className={`text-[10px] px-2 py-1.5 rounded border ${lastResult.includes('失败') || lastResult.includes('异常') ? 'bg-red-500/10 border-red-500/30 text-red-400' : lastResult.includes('无法') ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
            {lastResult}
          </div>
        )}

        {config.autoSync && (
          <div className="text-[9px] text-text-tertiary flex items-center gap-1">
            <Clock size={10} /> 自动同步已开启 · 每 {config.autoSyncInterval} 分钟执行一次
          </div>
        )}
      </div>
    </div>
  )
}

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

    const feishuSyncConfig = loadSyncConfig()
    const feishuSyncExport: Record<string, any> = {
      feishuAppId: feishuSyncConfig.feishuAppId,
      feishuAppSecret: exportIncludeKeys ? feishuSyncConfig.feishuAppSecret : '',
      bitableAppToken: feishuSyncConfig.bitableAppToken,
      bitableTableId: feishuSyncConfig.bitableTableId,
      autoSync: feishuSyncConfig.autoSync,
      autoSyncInterval: feishuSyncConfig.autoSyncInterval,
      allowedActions: feishuSyncConfig.allowedActions,
    }

    const exportData = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      providers: providersExport,
      general: generalSettings,
      feishuSync: feishuSyncExport,
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
        }

        if (isNewFormat && raw.feishuSync) {
          const fs = raw.feishuSync
          const existingSyncConfig = loadSyncConfig()
          const mergedSync: SyncConfig = {
            feishuAppId: fs.feishuAppId || existingSyncConfig.feishuAppId,
            feishuAppSecret: fs.feishuAppSecret || existingSyncConfig.feishuAppSecret,
            bitableAppToken: fs.bitableAppToken || existingSyncConfig.bitableAppToken,
            bitableTableId: fs.bitableTableId || existingSyncConfig.bitableTableId,
            autoSync: typeof fs.autoSync === 'boolean' ? fs.autoSync : existingSyncConfig.autoSync,
            autoSyncInterval: typeof fs.autoSyncInterval === 'number' ? fs.autoSyncInterval : existingSyncConfig.autoSyncInterval,
            allowedActions: Array.isArray(fs.allowedActions) ? fs.allowedActions : existingSyncConfig.allowedActions,
          }
          saveSyncConfig(mergedSync)
        }

        const hasGeneral = isNewFormat && raw.general && typeof raw.general.autoSaveInterval === 'number'
        const hasSync = isNewFormat && raw.feishuSync
        const msgParts: string[] = [`成功导入 ${Object.keys(importedProviders).length} 个 Provider 配置`]
        if (hasGeneral) msgParts.push('通用设置')
        if (hasSync) msgParts.push('飞书同步配置')
        useNotificationStore.getState().addNotification({
          type: 'success',
          title: '配置已导入',
          message: msgParts.join('、') + '。'
        })
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-secondary)) 100%)' }}>
              <Key size={15} className="text-bg-primary" />
            </span>
            设置
          </h2>
          <button className="btn btn-ghost p-1.5" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* General Settings */}
          <div>
            <h3 className="text-[11px] font-semibold mb-3 text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-3 rounded-full bg-accent/50" />
              通用设置
            </h3>
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

          {/* Card Gen Settings */}
          <CardGenSettingsPanel />

          {/* Feishu Sync Settings */}
          <FeishuSyncSettings />

          {/* Provider Settings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-3 rounded-full bg-accent/50" />
                API 配置
              </h3>
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
              导出所有 Provider 配置、通用设置和飞书同步配置。分享给团队成员时，导入方已有的相同 Provider 会合并更新，密钥为空则保留本地值。
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
