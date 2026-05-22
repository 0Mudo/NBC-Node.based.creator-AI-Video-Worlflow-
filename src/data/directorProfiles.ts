
export interface DirectorProfile {
  key: string
  name: string
  styleDescription: string
  cameraStyle: string
  lightingStyle: string
  colorPalette: string
  visualMotifs: string
  promptSuffix: string
  genres: string[]
}

export const DIRECTOR_PROFILES: DirectorProfile[] = [
  {
    key: 'nolan',
    name: '克里斯托弗·诺兰',
    styleDescription: 'IMAX 大画幅、精密几何对称、时间主题、实拍特效优先',
    cameraStyle: 'IMAX large format, precision geometric symmetry, slow deliberate camera moves, anamorphic widescreen',
    lightingStyle: 'naturalistic with selective dramatic enhancement, practical light sources, desaturated palette',
    colorPalette: 'muted earth tones, selective color accents, deep blacks',
    visualMotifs: 'spinning tops, clocks, mirrors, water, fire, architectural grandeur',
    promptSuffix: 'Christopher Nolan style, IMAX composition, practical effects aesthetic, precise symmetry, desaturated color grade, anamorphic widescreen, cerebral atmosphere',
    genres: ['action', 'sci-fi', 'thriller'],
  },
  {
    key: 'wong_kar_wai',
    name: '王家卫',
    styleDescription: 'step-printing 慢快门、霓虹色彩、浅焦拉焦、画框式构图、时间主题',
    cameraStyle: 'step-printing slow shutter, handheld intimacy, rack focus pulls, frames within frames',
    lightingStyle: 'neon saturation, deep red and green palette, practical Chinese signage, rain-streaked glass reflections',
    colorPalette: 'deep reds, emerald greens, gold yellows, midnight blues',
    visualMotifs: 'clocks, mirrors, rain, narrow corridors, cigarette smoke, jukeboxes, ceiling fans',
    promptSuffix: 'Wong Kar-wai style, step-printing motion blur, neon color palette, shallow focus with rack pulls, frames within frames, melancholic Hong Kong aesthetic, Christopher Doyle cinematography',
    genres: ['romance', 'drama', 'art-house'],
  },
  {
    key: 'zhang_yimou',
    name: '张艺谋',
    styleDescription: '浓郁中国色彩、大型团体调度、武术美学、色彩象征主义',
    cameraStyle: 'sweeping crane shots, large group choreography blocking, epic wide landscapes',
    lightingStyle: 'bold saturated colors, dramatic color shifts between scenes, natural light enhanced',
    colorPalette: 'cinnabar red, imperial yellow, jade green, snow white, ink black',
    visualMotifs: 'fabric in wind, martial arts wire-work, snow, rain, grand architecture, calligraphy',
    promptSuffix: 'Zhang Yimou style, bold saturated Chinese color palette, sweeping crane shots, wuxia aesthetic, fabric and wind effects, poetic visual rhythm',
    genres: ['action', 'drama', 'historical', 'martial-arts'],
  },
  {
    key: 'miyazaki',
    name: '宫崎骏',
    styleDescription: '手绘温暖质感、蓝天白云、欧洲小镇、自然与机械共存',
    cameraStyle: 'gentle panning, floating perspectives, follow shots, emphasis on environment',
    lightingStyle: 'golden hour warmth, brilliant blue skies, soft watercolor light, naturalistic',
    colorPalette: 'sky blues, grass greens, warm golds, soft pastels',
    visualMotifs: 'wind in grass, flying machines, detailed food, soot sprites, lush nature, steam trains',
    promptSuffix: 'Studio Ghibli Miyazaki style, hand-painted animation aesthetic, golden hour lighting, pastoral landscapes, wind effects, attention to small everyday moments',
    genres: ['animation', 'fantasy', 'adventure'],
  },
  {
    key: 'spielberg',
    name: '史蒂文·斯皮尔伯格',
    styleDescription: '背光神明感、长镜头调度、儿童视角、家庭主题',
    cameraStyle: 'long single takes, fluid Steadicam, dramatic push-ins, childrens eye-level perspective',
    lightingStyle: 'signature backlighting creating god-light halos, silhouette flashlight beams, warm family interiors',
    colorPalette: 'warm ambers, deep blues, hopeful golds',
    visualMotifs: 'flashlight beams, reflections in eyes, dinosaurs, sharks, UFOs, suburban America',
    promptSuffix: 'Spielberg style, dramatic backlighting with god-ray halos, fluid camera movement, childlike wonder perspective, warm hopeful color grade',
    genres: ['action', 'sci-fi', 'adventure', 'drama'],
  },
  {
    key: 'hitchcock',
    name: '希区柯克',
    styleDescription: '主观镜头、dolly zoom、麦高芬、楼梯与门框构图',
    cameraStyle: 'subjective POV, dolly zoom / vertigo effect, voyeuristic framing through windows and doors, overhead shots',
    lightingStyle: 'high contrast noir, venetian blind stripe shadows, single practical sources, expressionistic shadow play',
    colorPalette: 'strong blacks, selective colors (red lips, green dress), muted palette',
    visualMotifs: 'staircases, birds, keys, handcuffs, train tunnels, shower drains, voyeuristic windows',
    promptSuffix: 'Hitchcock style, subjective camera, voyeuristic framing, high contrast noir lighting, venetian blind shadows, suspense through spatial composition',
    genres: ['thriller', 'horror', 'psychological', 'mystery'],
  },
  {
    key: 'villeneuve',
    name: '丹尼斯·维伦纽瓦',
    styleDescription: '史诗宽景与亲密特写交替、缓慢推进、压迫感空间',
    cameraStyle: 'alternating epic wides and intimate close-ups, slow deliberate push-ins, encroaching personal space',
    lightingStyle: 'low-key atmospheric, practical sources in vast darkness, dust and atmospheric haze',
    colorPalette: 'sand ochres, deep blues, stark whites, muted earth tones',
    visualMotifs: 'vast landscapes, geometric architecture, dust motes in light, reflective surfaces, scale juxtaposition',
    promptSuffix: 'Villeneuve style, epic scale contrasted with intimacy, slow deliberate camera, atmospheric haze, low-key lighting, geometric composition',
    genres: ['sci-fi', 'thriller', 'drama'],
  },
  {
    key: 'tarantino',
    name: '昆汀·塔伦蒂诺',
    styleDescription: '对话驱动长镜头、非时序叙事、流行文化引用、爆发式暴力',
    cameraStyle: 'long dialogue takes, trunk POV, low-angle tracking, whip pans, split-screen',
    lightingStyle: 'bold practical sources, diner fluorescents, warehouse shaft light, warm interiors',
    colorPalette: 'bold primaries, 1970s film stock warmth, high saturation reds and yellows',
    visualMotifs: 'bare feet, sunglasses, briefcases, diners, vintage cars, samurai swords, blood splatter',
    promptSuffix: 'Tarantino style, bold color saturation, long dialogue takes, low angle hero shots, 1970s grindhouse aesthetic, dynamic whip pans, stylized violence',
    genres: ['action', 'crime', 'thriller'],
  },
]

export function getDirectorByKey(key: string): DirectorProfile | undefined {
  return DIRECTOR_PROFILES.find(d => d.key === key)
}
