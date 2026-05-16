import { apiFetch } from './client'
import { useProviderStore } from '@/store/useProviderStore'
import { ChatMessage } from '@/store/useInspirationStore'

export interface InspirationAgentOptions {
  category: string
  content: string
  messages: ChatMessage[]
  newMessage: string
}

export async function askInspirationAgent(
  options: InspirationAgentOptions,
  onUpdate: (chunk: string) => void
): Promise<{ reply: string; error?: string }> {
  const store = useProviderStore.getState()
  const enabledLlmProviders = store.getEnabledProviders().filter(p => p.capabilities.includes('llm'))
  const provider = enabledLlmProviders.find(p => p.endpoints.some(e => !!e.apiKey)) || enabledLlmProviders[0] || store.getProvider('llm')
  
  if (!provider) return { reply: '', error: '未配置 LLM Provider' }

  const endpoint = provider.endpoints.find((e) => e.isDefault) || provider.endpoints[0]
  if (!endpoint?.apiKey) return { reply: '', error: `未配置 ${provider.name} 的 API Key，请在设置中添加` }

  const categoryNames: Record<string, string> = {
    script: '剧本',
    storyboard: '分镜',
    character: '角色卡',
    scene: '场景卡',
    item: '物品卡',
    extract_cards: '三卡提取'
  }
  const catName = categoryNames[options.category] || options.category

  let extraFormatInstruction = ''
  if (options.category === 'storyboard') {
    extraFormatInstruction = `
特别注意：由于当前迭代的是【分镜】，请务必按照严格的单行格式输出分镜列表，以便系统的“时间线”功能正确解析。
每一行代表一个镜头，必须包含以下要素（用空格分隔）：
镜头[编号]：[画面描述内容] [时长(如:5秒)] [转场(如:硬切/淡入淡出/叠化/擦除/滑入/缩放)] [镜头类型(如:全景/中景/近景/特写/远景/大远景/中近景/大特写)]

示例：
镜头1：蜂医从巴别塔高处跃下 8秒 淡入淡出 全景
镜头2：威龙举起武器瞄准 5秒 硬切 特写

注意：在 <result></result> 标签内，请只输出分镜列表的文本内容，不要包含任何额外的问候、前言或总结。`
  } else if (options.category === 'extract_cards') {
    extraFormatInstruction = `
特别注意：你当前的任务是从给定的剧本和分镜中，提取出所有重要的【角色】、【场景】和【物品】。
请务必返回一个标准的 JSON 对象，格式如下：

<result>
{
  "characters": [
    {
      "name": "角色中文名",
      "alias": "角色代号/英文名",
      "gender": "男/女/其他",
      "age": 25,
      "role": "角色身份/职能",
      "facePrompt": "英文面部描述，超写实风格，详细描述发型/眼睛/面部特征/表情",
      "bodyPrompt": "英文体型着装描述，超写实风格，详细描述服装/装备/体型/姿态",
      "negativePrompt": "生成时需要避免的特征，英文逗号分隔",
      "backstory": "角色背景故事的中文简要描述"
    }
  ],
  "scenes": [
    {
      "name": "场景中文名",
      "nameEn": "场景英文名",
      "sceneType": "室内/室外/城市街道/自然环境/地下设施/太空设施/废墟",
      "timeOfDay": "dawn/morning/afternoon/evening/night/midnight",
      "weather": "晴/阴/雨/雾/雪/暴风",
      "colorPalette": "暖黄/冷蓝/暗绿/赛博霓虹/灰调/高饱和",
      "mood": "紧张/平静/压抑/宏大/神秘/凄美",
      "lightingDescription": "英文光影描述，超写实风格",
      "spatialType": "单间/走廊/大厅/开放空间/多层/洞穴",
      "keyElements": ["关键元素1", "关键元素2"]
    }
  ],
  "items": [
    {
      "name": "物品中文名",
      "nameEn": "物品英文名", 
      "itemType": "武器/道具/科技设备/服装/消耗品/载具/文献",
      "material": "材质描述",
      "color": "颜色描述",
      "dimensions": "尺寸描述",
      "condition": "完好/轻微磨损/明显磨损/损坏/老旧",
      "visualFeatures": "英文视觉特征描述，超写实风格",
      "function": "物品功能的中文描述"
    }
  ]
}
</result>

注意：
1. <result></result> 标签内必须且只能是一个合法的 JSON 字符串
2. facePrompt/bodyPrompt/lightingDescription/visualFeatures 必须为英文
3. 每个角色必须填写完整的 facePrompt 和 bodyPrompt
4. 从剧本和分镜中识别所有出场角色/场景/物品，不要遗漏`
  }

  const systemPrompt = `你是一个专业的文案与策划专家。当前正在协助用户迭代【${catName}】。
请根据用户的要求，以及当前的文本内容，直接提供修改后的全新完整文本。
务必将最终修改后的完整文本放置在 <result></result> 标签中（这是必须的，系统将自动提取该标签内的内容作为新版本）。
在 <result> 标签外，你可以简要说明你的修改思路。
${extraFormatInstruction}

当前的【${catName}】内容如下：
---
${options.content || '(暂无内容)'}
---
`

  // 构造 messages
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...options.messages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: options.newMessage }
  ]

  try {
    let apiUrl = endpoint.url.trim()
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/+$/, '') + '/chat/completions'
    }

    // 这里我们直接用 fetch，但项目中是通过 IPC 代理或者 Vite 代理。
    // apiFetch 暂时不支持流式，如果需要流式可能需要改 apiFetch。
    // 先尝试非流式返回，如果需要再优化为流式。
    const res = await apiFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${endpoint.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: endpoint.model || 'deepseek-v4-pro',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 8192,
        stream: false, // 暂时不支持流式 IPC 代理，直接全量返回
      }),
      timeoutMs: 60000,
    })

    const data = JSON.parse(res.body)
    const content = data.choices?.[0]?.message?.content?.trim()
    
    if (data.error) {
      return { reply: '', error: data.error.message || 'LLM API 报错' }
    }

    if (!content) return { reply: '', error: 'LLM 返回为空' }
    
    onUpdate(content)
    return { reply: content }
  } catch (e: any) {
    return { reply: '', error: e.message || '请求失败' }
  }
}
