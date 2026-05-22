
export const SEEDANCE_FIELDS = [
  { key: 'shot', label: '镜头', description: '景别+运镜方式' },
  { key: 'environment', label: '环境', description: '背景静态描述，道具动态状态标注' },
  { key: 'narrativePurpose', label: '叙事目的', description: '本镜推动故事的核心目标，5-12字' },
  { key: 'transition', label: '衔接', description: '与上一镜的连接方式' },
  { key: 'characterAction', label: '角色分动', description: '@人物N [外观] 正在 [肢体动作]' },
  { key: 'detail', label: '细节', description: '@人物N [微表情与情绪状态]' },
  { key: 'lighting', label: '光影', description: '光源方向+质感+色调' },
  { key: 'dialogue', label: '台词', description: '@人物N,第Xs开口: "台词原文"' },
  { key: 'sound', label: '音效', description: '环境音+声响+BGM' },
] as const

export const NINE_IRON_LAWS = [
  '拒绝抽象：写"眼眶泛红"不写"她很悲伤"，写"手指关节发白"不写"他很紧张"',
  '动词驱动：每个字段必须包含具体动词，"正在"结构不可省略',
  '细节禁区：[细节]字段不得描写道具、环境或他人反应，仅限主体角色的微表情与情绪',
  '台词规则：精确到第几秒开口（≤5s→X=1，6-8s→X=2，9-12s→X=3，以此类推），无台词时省略该字段',
  '物品状态：活跃道具必须在[环境]中声明当前物理状态（如"桌上的杯子被打翻，茶水正流向地板"）',
  '叙事目的：每个镜头必须用5-12字陈述核心推进目标，回答"这一镜为故事推进了什么"',
  '衔接规则：每镜必须解释与前镜的连接逻辑（视觉衔接或因果衔接）',
  '资产一致性：全片@标签统一，同一角色/场景/道具始终使用相同@名称',
  '输出纯度：只输出分镜内容本身，不包含问候语、解释、前言或总结',
] as const

export const SEEDANCE_FORMAT_SYSTEM_PROMPT = `
你必须严格按照以下 9 字段格式输出每一行分镜内容，使用 Markdown 表格格式：

| 镜头 | 环境 | 叙事目的 | 衔接 | 角色分动 | 细节 | 光影 | 台词 | 音效 |
|------|------|----------|------|----------|------|------|------|------|

每个字段的填写规则：
- **镜头**：[景别]+[运镜方式]，如"中景+手持跟拍"
- **环境**：在@图片N [背景静态描述；道具动态状态标注]
- **叙事目的**：[本镜推动故事的核心目标，5-12字]
- **衔接**：[与上一镜的连接方式，视觉或因果]
- **角色分动**：@人物N [外观描述] 正在 [具体肢体动作]
- **细节**：@人物N [微表情与情绪状态]（禁止描写道具和环境）
- **光影**：[光源方向]+[质感]+[色调]，如"右侧窗光+柔漫射+暖金色调"
- **台词**：@人物N,第Xs开口: "台词原文"（无台词则留空）
- **音效**：[环境音]+[声响]+[BGM描述]

${NINE_IRON_LAWS.map((law, i) => `${i + 1}. ${law}`).join('\n')}
`

export function buildSeedanceSystemPrompt(additionalRules?: string[]): string {
  let prompt = SEEDANCE_FORMAT_SYSTEM_PROMPT
  if (additionalRules?.length) {
    prompt += '\n\n额外规则：\n' + additionalRules.map((r, i) => `${i + 1}. ${r}`).join('\n')
  }
  return prompt
}
