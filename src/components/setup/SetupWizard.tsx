import { useState } from 'react'
import { Key, Sparkles, Film, Workflow, ChevronRight, Check, ExternalLink } from 'lucide-react'
import { useProviderStore } from '@/store/useProviderStore'

interface Props {
  onComplete: () => void
}

const STEPS = [
  { id: 'welcome', title: '欢迎' },
  { id: 'grsai', title: 'GPT Image 2' },
  { id: 'ark', title: 'Seedance 2.0' },
  { id: 'llm', title: 'AI 提示词优化' },
  { id: 'done', title: '完成' },
]

export default function SetupWizard({ onComplete }: Props) {
  const { updateProvider } = useProviderStore()
  const [step, setStep] = useState(0)
  const [grsaiKey, setGrsaiKey] = useState('')
  const [arkKey, setArkKey] = useState('')
  const [llmKey, setLlmKey] = useState('')
  const [llmUrl, setLlmUrl] = useState('https://api.deepseek.com/v1/chat/completions')

  const handleFinish = () => {
    if (grsaiKey.trim()) {
      updateProvider('gptImage2', {
        endpoints: [{ id: 'default', name: '默认端点', url: 'https://grsai.dakka.com.cn/v1/api/generate', apiKey: grsaiKey.trim(), isDefault: true }],
      })
    }
    if (arkKey.trim()) {
      updateProvider('seedance', {
        endpoints: [{ id: 'default', name: '默认端点', url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generates/tasks', apiKey: arkKey.trim(), isDefault: true }],
      })
    }
    if (llmKey.trim()) {
      updateProvider('llm', {
        endpoints: [{ id: 'default', name: '默认端点', url: llmUrl.trim(), apiKey: llmKey.trim(), isDefault: true }],
      })
    }
    localStorage.setItem('nbc_setup_done', 'true')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem('nbc_setup_done', 'true')
    onComplete()
  }

  return (
    <div className="settings-overlay">
      <div className="w-full max-w-lg bg-bg-secondary rounded-xl border border-node-border shadow-2xl overflow-hidden animate-fade-in">
        {/* Progress */}
        <div className="flex items-center gap-1 px-6 pt-5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-node-border'
              }`} />
            </div>
          ))}
        </div>

        <div className="px-6 py-6">
          {/* Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/20 flex items-center justify-center">
                <Sparkles size={32} className="text-accent" />
              </div>
              <h2 className="text-lg font-bold">欢迎使用 NBC</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                节点式素材创作器 — 用节点画布编排 AI 图像和视频生成工作流。
                <br />让我们先配置 API Key，只需 1 分钟。
              </p>
              <p className="text-xs text-text-secondary opacity-70">你可以随时在设置面板中修改这些配置</p>
            </div>
          )}

          {/* GrsAI Key */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-info" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">GPT Image 2</h3>
                  <p className="text-xs text-text-secondary">AI 图像生成（GrsAI 代理）</p>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1.5">API Key</label>
                <input
                  className="input text-sm"
                  type="password"
                  value={grsaiKey}
                  onChange={(e) => setGrsaiKey(e.target.value)}
                  placeholder="输入 GrsAI API Key"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                从 <span className="text-accent cursor-pointer" onClick={() => window.electronAPI?.openInShell('https://grsai.dakka.com.cn')}>grsai.dakka.com.cn</span> 获取 Key
              </p>
            </div>
          )}

          {/* Ark Key */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <Film size={20} className="text-info" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Seedance 2.0</h3>
                  <p className="text-xs text-text-secondary">AI 视频生成（火山方舟）</p>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1.5">API Key</label>
                <input
                  className="input text-sm"
                  type="password"
                  value={arkKey}
                  onChange={(e) => setArkKey(e.target.value)}
                  placeholder="输入火山方舟 API Key"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                从 <span className="text-accent cursor-pointer" onClick={() => window.electronAPI?.openInShell('https://console.volcengine.com/ark')}>火山方舟控制台</span> 获取 Key
              </p>
            </div>
          )}

          {/* LLM Key */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Workflow size={20} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">AI 提示词优化</h3>
                  <p className="text-xs text-text-secondary">用 LLM 自动优化生成提示词</p>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1.5">API 端点</label>
                <input
                  className="input text-sm"
                  type="url"
                  value={llmUrl}
                  onChange={(e) => setLlmUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1/chat/completions"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-secondary uppercase tracking-wider block mb-1.5">API Key</label>
                <input
                  className="input text-sm"
                  type="password"
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value)}
                  placeholder="sk-..."
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                支持 DeepSeek、OpenAI 等兼容接口。留空则跳过提示词优化功能。
              </p>
            </div>
          )}

          {/* Done */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-success/20 flex items-center justify-center">
                  <Check size={32} className="text-success" />
              </div>
              <h2 className="text-lg font-bold">配置完成</h2>
              <div className="text-sm text-text-secondary space-y-1">
                {grsaiKey && <p>✅ GPT Image 2 已配置</p>}
                {arkKey && <p>✅ Seedance 2.0 已配置</p>}
                {llmKey && <p>✅ AI 提示词优化已配置</p>}
                {!grsaiKey && !arkKey && !llmKey && <p>⏭️ 跳过了所有配置，你可以在设置面板中随时添加</p>}
              </div>
              <p className="text-xs text-text-secondary opacity-70">
                提示：团队成员可以共享 .nbc.json 工作流文件进行协作
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-node-border bg-bg-primary/50">
          {step > 0 && step < 4 ? (
            <button className="btn btn-ghost text-xs" onClick={handleSkip}>跳过全部</button>
          ) : step === 0 ? (
            <button className="btn btn-ghost text-xs" onClick={handleSkip}>跳过配置</button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              className="btn btn-accent text-sm flex items-center gap-1.5"
              onClick={() => setStep(step + 1)}
            >
              {step === 0 ? '开始配置' : '下一步'} <ChevronRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-accent text-sm flex items-center gap-1.5"
              onClick={handleFinish}
            >
              开始使用 <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
