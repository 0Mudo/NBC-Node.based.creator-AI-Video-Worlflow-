import { apiFetch } from './client'
import { useProviderStore } from '@/store/useProviderStore'

interface OptimizePromptOptions {
  originalPrompt: string
  characterContext?: string
  sceneContext?: string
  itemContext?: string
  scriptContext?: string
}

interface OptimizePromptResult {
  optimized: string
  error?: string
}

export async function optimizePrompt(options: OptimizePromptOptions): Promise<OptimizePromptResult> {
  const store = useProviderStore.getState()
  const enabledLlmProviders = store.getEnabledProviders().filter(p => p.capabilities.includes('llm'))
  const provider = enabledLlmProviders.find(p => p.endpoints.some(e => !!e.apiKey)) || enabledLlmProviders[0] || store.getProvider('llm')
  
  if (!provider) return { optimized: '', error: '未配置 LLM Provider' }

  const endpoint = provider.endpoints.find((e) => e.isDefault) || provider.endpoints[0]
  if (!endpoint?.apiKey) return { optimized: '', error: `未配置 ${provider.name} 的 API Key，请在设置中添加` }

  // ---- Protect template variables from LLM "optimization" ----
  const tplVars: string[] = []
  const protectedPrompt = options.originalPrompt.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const idx = tplVars.length
    tplVars.push(match)
    return `⟪TPL_${idx}⟫`
  })
  // ---- End protection ----

  const contextParts: string[] = []
  if (options.characterContext) contextParts.push(`角色设定：\n${options.characterContext}`)
  if (options.sceneContext) contextParts.push(`场景设定：\n${options.sceneContext}`)
  if (options.itemContext) contextParts.push(`物品设定：\n${options.itemContext}`)
  if (options.scriptContext) contextParts.push(`剧本/分镜：\n${options.scriptContext}`)

  const systemPrompt = `你是一个专业的AI图像/视频生成提示词优化专家。你的任务是将用户的简短描述优化为高质量的AI生成提示词。

规则：
1. 输出必须是英文
2. 使用超写实风格描述
3. 详细描述光线、构图、氛围
4. 加入摄影术语（如 cinematic lighting, depth of field, photorealistic, 8K 等）
5. 保持用户原始意图不变
6. 如果有角色和场景上下文，要融入这些信息
7. 绝对不能修改或删除文本中的 ⟪TPL_N⟫ 标记（其中N是数字），这些是模板占位符，必须原样保留在输出中
8. 只输出优化后的提示词，不要解释`

  const userParts: string[] = []
  if (contextParts.length) userParts.push(contextParts.join('\n\n'))
  userParts.push(`原始输入：${protectedPrompt}`)
  userParts.push('请将以上描述优化为AI图像生成提示词。注意保留所有 ⟪TPL_N⟫ 标记不变。')

  try {
    // 智能处理 URL：如果用户只填了 Base URL，自动补全 OpenAI 标准的 /chat/completions 路径
    let apiUrl = endpoint.url.trim()
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/+$/, '') + '/chat/completions'
    }

    const res = await apiFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: endpoint.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userParts.join('\n\n') },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      timeoutMs: 30000,
    })

    const data = JSON.parse(res.body)
    const rawContent = data.choices?.[0]?.message?.content?.trim()
    if (!rawContent) return { optimized: '', error: 'LLM 返回为空' }
    // Restore protected template variables
    const restoredContent = tplVars.reduce((acc, original, idx) => {
      return acc.replace(new RegExp(`⟪TPL_${idx}⟫`, 'g'), original)
    }, rawContent)
    return { optimized: restoredContent }
  } catch (e: any) {
    return { optimized: '', error: e.message || '请求失败' }
  }
}
