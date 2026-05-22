
export interface ArtStylePreset {
  key: string
  name: string
  description: string
  imagePrompt: string
  videoPrompt: string
  colorPalette: string
  refImageUrl: string
}

export const ART_STYLE_PRESETS: ArtStylePreset[] = [
  {
    key: 'cartoon_3d',
    name: '卡通3D',
    description: '高品质3D卡通动画风格，精细3D渲染，夸张且富有表现力的角色比例，柔和全局光照与体积光',
    imagePrompt: 'high quality 3D cartoon animation style, exquisite 3D rendering, exaggerated and expressive character proportions, soft global illumination and volumetric light, subsurface scattering for translucent skin, delicate hair and fabric textures, bright and warm color palette, cinematic composition, shallow depth of field, Octane Render quality, charming and vivid character design',
    videoPrompt: '3D cartoon animation, smooth character motion, squash and stretch animation principles, vibrant colors, playful camera movements',
    colorPalette: '#FF6B6B,#4ECDC4,#FFE66D,#A8E6CF,#FF8A5C',
    refImageUrl: 'preset://artstyle/cartoon_3d',
  },
  {
    key: 'cg',
    name: 'CG动画',
    description: '顶级次世代CG动画风格，超高精度3D模型，基于物理的渲染（PBR），史诗级宏大场景，电影级光线追踪',
    imagePrompt: 'top-tier next-gen CG animation style, ultra high-precision 3D models, physics-based rendering (PBR), epic grand scenes, cinematic ray tracing, complex particle effects (magic, dust, sparks), detailed skin micro-texture and hard surface reflections, strong chiaroscuro with dramatic lighting, ambient occlusion (AO), 8K ultra high resolution, extreme visual impact and epic scale',
    videoPrompt: 'cinematic CG animation, dynamic camera movements, epic scale environments, particle effects, dramatic lighting transitions, film-grade compositing',
    colorPalette: '#1A1A2E,#16213E,#0F3460,#E94560,#533483',
    refImageUrl: 'preset://artstyle/cg',
  },
  {
    key: 'realistic',
    name: '写实',
    description: '好莱坞电影级写实摄影，超写实主义，35mm电影镜头，f/1.8大光圈极浅景深，专业电影级打光',
    imagePrompt: 'Hollywood cinematic photorealism, hyperrealistic, shot on 35mm film lens, f/1.8 wide aperture with extremely shallow depth of field, professional cinematic lighting (Rembrandt lighting, rim backlight), anamorphic lens flare, premium film grain texture, professional color grading (teal and orange), extremely sharp facial pores and macro texture, 8K resolution, incredibly realistic real-world lighting',
    videoPrompt: 'live-action cinematic, natural camera movement, realistic lighting, subtle handheld motion, film grain, 24fps cinematic motion blur',
    colorPalette: '#2C3E50,#E74C3C,#F39C12,#3498DB,#ECF0F1',
    refImageUrl: 'preset://artstyle/realistic',
  },
  {
    key: 'anime_jp',
    name: '日漫',
    description: '高品质2D日式动画风格，赛璐璐涂装，清晰细腻轮廓线稿，平涂上色与层次分明硬边缘阴影',
    imagePrompt: 'high quality 2D Japanese anime style, cel shading, crisp and detailed outline lineart, flat coloring with layered hard-edge shadows, highly saturated pure anime colors, expressive character expressions and dynamic poses, beautiful atmospheric lighting with aerial perspective, Tyndall effect, exquisite hand-drawn 2D background art, high-quality anime screenshot aesthetic, classic anime glow and aesthetic filter',
    videoPrompt: '2D anime animation, limited frame animation aesthetic, dynamic action lines, background parallax, expressive character animation, anime lighting effects',
    colorPalette: '#FF6B9D,#C44D8C,#87CEEB,#FFD700,#98FB98',
    refImageUrl: 'preset://artstyle/anime_jp',
  },
  {
    key: 'anime_cn',
    name: '国漫',
    description: '新国风高级动画风格，融合中国传统水墨画与现代数字插画技法，写意与工笔结合',
    imagePrompt: 'new Chinese national style premium animation, blending traditional Chinese ink wash painting with modern digital illustration techniques, freehand brushwork combined with meticulous gongbi style, flowing elegant lines with dynamic ink wash bleeding effects, traditional oriental color aesthetics (vermillion, azurite, gamboge), wuxia and eastern fantasy atmosphere, strong sense of rhythmic vitality, rough brush stroke texture, mysterious and ethereal classical lighting, 2D and 3D combined premium hand-painted quality',
    videoPrompt: 'Chinese donghua animation style, flowing fabric and hair animation, ink wash effects, dynamic martial arts choreography, traditional color palette transitions',
    colorPalette: '#C41E3A,#D4A574,#2E4A2E,#8B4513,#F5DEB3',
    refImageUrl: 'preset://artstyle/anime_cn',
  },
  {
    key: 'comic_us',
    name: '美漫',
    description: '现代美式漫画与前卫动作动画风格，极强视觉张力，粗犷动感黑色轮廓线条',
    imagePrompt: 'modern American comic and avant-garde action animation style, extreme visual tension, bold dynamic black outline strokes, dramatically exaggerated perspective composition with explosive impact, high-contrast pop art colors, halftone dot pattern effects, chromatic aberration, glitch art visual artifacts and afterimages, extremely hardcore stylized motion blur, heavy ink shading, graphic novel aesthetic',
    videoPrompt: 'American comic book animation, dynamic panel transitions, bold graphic motion, ink splatter effects, halftone patterns, punchy action sequences',
    colorPalette: '#FF0000,#FFD700,#0066CC,#FF4500,#1A1A1A',
    refImageUrl: 'preset://artstyle/comic_us',
  },
  {
    key: 'cyberpunk',
    name: '赛博朋克',
    description: '赛博朋克风格，霓虹灯光，高科技低生活，雨夜都市，全息投影，机械义体',
    imagePrompt: 'cyberpunk aesthetic, neon-drenched nocturnal cityscape, high-tech low-life atmosphere, holographic projections and AR overlays, cybernetic augmentations visible, rain-slicked streets reflecting neon signs, volumetric fog with colored lighting, chrome and steel architecture, Blade Runner inspired cinematography, purple and cyan complementary color scheme, lens flares and light bleed, 8K hyperdetailed',
    videoPrompt: 'cyberpunk sci-fi, neon flicker effects, holographic glitches, rain particle effects, drone camera movements through urban canyons, server room blinking lights',
    colorPalette: '#FF00FF,#00FFFF,#FF6600,#1A0033,#0D0221',
    refImageUrl: 'preset://artstyle/cyberpunk',
  },
  {
    key: 'noir',
    name: '黑色电影',
    description: '经典黑色电影风格，高对比度光影， Venetian blinds 条纹光，潮湿街道，烟雾缭绕',
    imagePrompt: 'classic film noir, high-contrast chiaroscuro lighting with deep blacks and bright highlights, Venetian blinds casting stripe shadows across faces and walls, rain-slicked asphalt reflecting streetlamps, cigarette smoke curling in dim interiors, fedora and trench coat silhouettes, dutch angles, venetian blind gobo effects, expressionistic shadow play, 1940s period aesthetic, black and white with subtle sepia undertones, detective office with ceiling fan shadows',
    videoPrompt: 'film noir cinematic, slow tracking shots, dramatic shadow play, smoke atmosphere, black and white high contrast, period-appropriate camera language',
    colorPalette: '#1A1A1A,#2D2D2D,#8B8378,#4A4A4A,#C4A882',
    refImageUrl: 'preset://artstyle/noir',
  },
  {
    key: 'wong_kar_wai',
    name: '王家卫',
    description: '王家卫风格，step-printing 慢快门，霓虹色彩，浅焦拉焦，画框式构图',
    imagePrompt: 'Wong Kar-wai cinematic style, step-printing slow shutter motion blur, neon-saturated color palette of deep reds and emerald greens, extremely shallow depth of field with rack focus pulls, characters framed behind glass windows and metal grilles, rain-streaked surfaces, clock and time motifs, narrow alleyways and cramped interiors, saturated film stock, melancholic atmosphere, 1990s Hong Kong aesthetic, Christopher Doyle cinematography',
    videoPrompt: 'Wong Kar-wai style, step-printing motion blur, slow-motion sequences, focus racking, neon reflections, intimate close-ups with shallow focus, melancholic pacing',
    colorPalette: '#CC0000,#006442,#FFD700,#1B3A2D,#8B0000',
    refImageUrl: 'preset://artstyle/wong_kar_wai',
  },
  {
    key: 'miyazaki',
    name: '宫崎骏',
    description: '吉卜力/宫崎骏风格，温暖手绘，蓝天白云，欧洲小镇，自然与机械共存',
    imagePrompt: 'Studio Ghibli Hayao Miyazaki style, warm hand-drawn animation aesthetic, brilliant blue skies with volumetric clouds, European-inspired pastoral townscapes, lush green nature coexisting with steampunk machinery, soft watercolor background washes, gentle character designs with expressive eyes, food illustrated with loving detail, wind-swept grass fields, golden hour lighting, nostalgic and hopeful atmosphere, attention to small everyday moments',
    videoPrompt: 'Ghibli animation style, gentle character movements, wind effects on grass and hair, floating and flying sequences, detailed food animation, pastoral landscape pans',
    colorPalette: '#87CEEB,#98FB98,#FFB347,#8FBC8F,#F5DEB3',
    refImageUrl: 'preset://artstyle/miyazaki',
  },
  {
    key: 'nolan',
    name: '诺兰史诗',
    description: '克里斯托弗·诺兰风格，IMAX 构图，宏大场景实拍，精密交叉剪辑，汉斯·季默配乐感',
    imagePrompt: 'Christopher Nolan cinematic style, IMAX large-format composition, practical effects and real locations, grandiose architectural scale, precise geometric symmetry, desaturated color palette with selective color accents, temporal distortion visual metaphors, swirling particle effects (dust, smoke, water droplets), anamorphic widescreen aspect ratio, practical stunts and miniatures, cerebral atmosphere, Wally Pfister / Hoyte van Hoytema cinematography',
    videoPrompt: 'Nolan-style epic, large format camera movements, practical effects, cross-cutting between timelines, slow-motion pivotal moments, Hans Zimmer-inspired rhythmic editing, rising tension through visual scale',
    colorPalette: '#1A2332,#4A6B8A,#8B7355,#C4A882,#2E4053',
    refImageUrl: 'preset://artstyle/nolan',
  },
  {
    key: 'zhang_yimou',
    name: '张艺谋',
    description: '张艺谋风格，浓郁中国色彩，大型团体调度，武术美学，色彩象征主义',
    imagePrompt: 'Zhang Yimou cinematic style, bold saturated Chinese color palette (cinnabar red, imperial yellow, jade green, snow white), large-scale group choreography and blocking, wuxia martial arts aesthetic, color symbolism throughout composition, sweeping wide shots of grand architecture and landscapes, fabric and costume texture in rich detail, rain, snow and wind as dramatic elements, shallow focus on faces against elaborate backgrounds, poetic rhythm in visual storytelling, 5th generation Chinese cinema look',
    videoPrompt: 'Zhang Yimou style, sweeping crane shots, large group choreography, dramatic color shifts between scenes, slow-motion martial arts, fabric and wind effects, wuxia wire-work',
    colorPalette: '#C41E3A,#FFD700,#2E8B57,#FFFFFF,#1A1A2E',
    refImageUrl: 'preset://artstyle/zhang_yimou',
  },
]

export function getArtStyleByKey(key: string): ArtStylePreset | undefined {
  return ART_STYLE_PRESETS.find(s => s.key === key)
}
