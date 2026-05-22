
export const SHOT_SIZES = [
  { value: 'extreme_long', label: '大远景', prompt: 'extreme long shot, vast landscape, tiny figures in grand environment' },
  { value: 'long', label: '远景', prompt: 'long shot / wide shot, full body visible in environment' },
  { value: 'full', label: '全景', prompt: 'full shot, subject from head to toe filling the frame' },
  { value: 'medium', label: '中景', prompt: 'medium shot, subject from waist up' },
  { value: 'medium_close', label: '近景', prompt: 'medium close-up, subject from chest up' },
  { value: 'close_up', label: '特写', prompt: 'close-up, face filling the frame, intimate detail' },
  { value: 'extreme_close', label: '大特写', prompt: 'extreme close-up, eyes or specific detail, macro perspective' },
] as const

export const CAMERA_ANGLES = [
  { value: 'eye_level', label: '平视', prompt: 'eye-level camera angle, natural perspective' },
  { value: 'high_angle', label: '俯拍', prompt: 'high angle shot looking down, diminishing the subject' },
  { value: 'low_angle', label: '仰拍', prompt: 'low angle shot looking up, heroic or imposing perspective' },
  { value: 'birds_eye', label: '鸟瞰', prompt: 'birds eye view / overhead shot, directly above' },
  { value: 'dutch', label: '荷兰角', prompt: 'dutch angle / canted frame, disorientation and unease' },
] as const

export const CAMERA_MOVEMENTS = [
  { value: 'static', label: '固定', prompt: 'static locked-off shot, no camera movement' },
  { value: 'dolly_in', label: '推轨前进', prompt: 'dolly in, camera moving forward toward subject' },
  { value: 'dolly_out', label: '推轨后退', prompt: 'dolly out, camera pulling back from subject' },
  { value: 'pan', label: '横摇', prompt: 'pan, camera rotating horizontally on fixed axis' },
  { value: 'tilt', label: '纵摇', prompt: 'tilt, camera rotating vertically on fixed axis' },
  { value: 'tracking', label: '跟拍', prompt: 'tracking shot, camera following alongside moving subject' },
  { value: 'handheld', label: '手持', prompt: 'handheld camera, subtle organic shake, documentary feel' },
  { value: 'steadicam', label: '斯坦尼康', prompt: 'steadicam, smooth floating camera movement' },
  { value: 'orbit', label: '环绕', prompt: 'orbital camera movement circling around subject' },
  { value: 'crane', label: '摇臂', prompt: 'crane shot, sweeping vertical camera movement' },
  { value: 'drone', label: '无人机', prompt: 'drone shot, aerial perspective with smooth flight' },
  { value: 'pov', label: 'POV主观', prompt: 'POV shot, first-person perspective through characters eyes' },
  { value: 'whip_pan', label: '快速甩镜', prompt: 'whip pan, rapid blur transition between compositions' },
  { value: 'snap_zoom', label: '快速变焦', prompt: 'snap zoom / crash zoom, sudden dramatic focal length change' },
  { value: 'slow_push', label: '缓慢推进', prompt: 'slow push in, creeping camera movement building tension' },
] as const

export const LIGHTING_STYLES = [
  { value: 'golden_hour', label: '黄金时刻', prompt: 'golden hour warm sunlight, long shadows, magical glow' },
  { value: 'blue_hour', label: '蓝调时刻', prompt: 'blue hour twilight, cool ethereal ambient light' },
  { value: 'hard_contrast', label: '硬对比', prompt: 'hard contrast lighting, sharp shadow edges, dramatic chiaroscuro' },
  { value: 'soft_diffused', label: '柔漫射', prompt: 'soft diffused lighting, gentle shadow falloff, wraparound light' },
  { value: 'neon', label: '霓虹', prompt: 'neon lighting, colored artificial light sources, cyberpunk/noir vibe' },
  { value: 'candlelight', label: '烛光', prompt: 'candlelight / firelight, warm flickering illumination, intimate atmosphere' },
  { value: 'rim_backlight', label: '轮廓逆光', prompt: 'rim backlight, edge glow outlining subject, separation from background' },
  { value: 'rembrandt', label: '伦勃朗光', prompt: 'Rembrandt lighting, triangle of light on shadowed cheek, classical portrait' },
  { value: 'silhouette', label: '剪影', prompt: 'silhouette lighting, subject as dark shape against bright background' },
  { value: 'volumetric', label: '体积光', prompt: 'volumetric / god rays, visible light beams through atmosphere' },
  { value: 'practical', label: '单一光源', prompt: 'single practical light source, motivated lighting from visible source' },
  { value: 'overcast', label: '阴天漫射', prompt: 'overcast diffused skylight, soft even illumination, no harsh shadows' },
] as const

export const LENS_TYPES = [
  { value: 'wide', label: '广角', prompt: 'wide angle lens, expanded field of view, spatial distortion' },
  { value: 'normal', label: '标准', prompt: 'normal lens, natural perspective approximating human vision' },
  { value: 'telephoto', label: '长焦', prompt: 'telephoto lens, compressed perspective, shallow depth of field, background compression' },
  { value: 'fisheye', label: '鱼眼', prompt: 'fisheye lens, extreme barrel distortion, surreal perspective' },
  { value: 'macro', label: '微距', prompt: 'macro lens, extreme close-up detail, shallow focus plane' },
  { value: 'anamorphic', label: '变形宽银幕', prompt: 'anamorphic lens, widescreen aspect, oval bokeh, horizontal lens flares' },
] as const

export function getShotSizePrompt(value: string): string {
  return SHOT_SIZES.find(s => s.value === value)?.prompt || ''
}

export function getCameraAnglePrompt(value: string): string {
  return CAMERA_ANGLES.find(a => a.value === value)?.prompt || ''
}

export function getCameraMovementPrompt(value: string): string {
  return CAMERA_MOVEMENTS.find(m => m.value === value)?.prompt || ''
}

export function getLightingPrompt(value: string): string {
  return LIGHTING_STYLES.find(l => l.value === value)?.prompt || ''
}

export function getLensPrompt(value: string): string {
  return LENS_TYPES.find(l => l.value === value)?.prompt || ''
}
