export interface SeedanceFields {
  shot: string
  environment: string
  narrativePurpose: string
  transition: string
  characterAction: string
  detail: string
  lighting: string
  dialogue: string
  sound: string
}

export function parseSeedanceFields(text: string): SeedanceFields[] {
  const results: SeedanceFields[] = []
  
  const tableRegex = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g
  let match
  while ((match = tableRegex.exec(text)) !== null) {
    const [, shot, environment, narrativePurpose, transition, characterAction, detail, lighting, dialogue, sound] = match
    if (shot.trim().includes('---') || shot.trim().includes('镜头')) continue
    results.push({
      shot: shot.trim(),
      environment: environment.trim(),
      narrativePurpose: narrativePurpose.trim(),
      transition: transition.trim(),
      characterAction: characterAction.trim(),
      detail: detail.trim(),
      lighting: lighting.trim(),
      dialogue: dialogue.trim(),
      sound: sound.trim(),
    })
  }
  
  return results
}

export function seedanceFieldsToPrompt(fields: SeedanceFields): string {
  return [
    `镜头: ${fields.shot}`,
    `环境: ${fields.environment}`,
    `叙事目的: ${fields.narrativePurpose}`,
    `衔接: ${fields.transition}`,
    `角色分动: ${fields.characterAction}`,
    `细节: ${fields.detail}`,
    `光影: ${fields.lighting}`,
    fields.dialogue ? `台词: ${fields.dialogue}` : '',
    fields.sound ? `音效: ${fields.sound}` : '',
  ].filter(Boolean).join('\n')
}

export function extractTagsFromSeedance(text: string): string[] {
  const tagRegex = /@([^\s\]\u4e00-\u9fff，。；：""''！？、]+)/g
  const tags = new Set<string>()
  let match
  while ((match = tagRegex.exec(text)) !== null) {
    tags.add(match[1].trim())
  }
  return Array.from(tags)
}
