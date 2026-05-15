export interface Character {
  id: string
  name: string
  nameEn: string
  appearance: string
  weapons: string
  role: string
  tags: string[]
  refImage?: string
}

export const characters: Character[] = [
  {
    id: 'fade',
    name: '蜂医',
    nameEn: 'Fade',
    appearance: '银色短发女性，面罩半遮脸，穿着黄绿色战术紧身衣搭配黑色护甲。左眼有红色义眼/扫描装置，颈部有呼吸管接口。身材修长，动作敏捷，充满科技感。背景在昏暗工业环境，蓝紫色冷光照明。',
    weapons: '医疗注射枪、冲锋枪',
    role: '医疗兵 / 侦察',
    tags: ['三角洲行动', '医疗', '高速', '女兵', '蜂医'],
  },
  {
    id: 'granny',
    name: '老太',
    nameEn: 'Granny',
    appearance: '年长女性战士，灰色短发，面容沉稳有皱纹。身穿深色长风衣搭配战术腰带和肩挂弹药带。眼神犀利冷静，经验丰富的老兵气质。背景在废弃工厂或暗巷，偏暖色调。',
    weapons: '改装猎枪、手枪',
    role: '狙击手 / 战术支援',
    tags: ['三角洲行动', '老兵', '狙击', '风衣', '老太'],
  },
  {
    id: 'luna',
    name: '露娜',
    nameEn: 'Luna',
    appearance: '年轻女性，浅蓝色长马尾，头戴战术耳机和护目镜。白色为主的轻型作战服搭配浅蓝装饰，设计简洁科技感。表情锐利，动作迅猛，背景为明亮的实验室或白墙空间，冷白色调。',
    weapons: '电磁脉冲枪、手枪',
    role: '电子战 / 支援',
    tags: ['三角洲行动', '电子战', '白蓝', '马尾', '露娜'],
  },
  {
    id: 'rush',
    name: '疾风',
    nameEn: 'Rush',
    appearance: '蒙面男性战士，穿着黑色与红色配色的轻型装甲，配有喷射背包或推进装置。头盔全封闭带红色目镜，身形结实。动作速度快，背景为城市屋顶或高楼边缘，霓虹灯光。',
    weapons: '双持冲锋枪、近战刀',
    role: '突击 / 机动',
    tags: ['三角洲行动', '突击', '高速', '喷射', '疾风'],
  },
  {
    id: 'weilong',
    name: '威龙',
    nameEn: 'Weilong',
    appearance: '中国男性特种兵，黑色短发，面部有迷彩涂装。深绿色重型战术装甲，胸前有龙纹标志。身材魁梧结实，手持重武器，姿态稳重。背景为丛林或军事基地，墨绿色调。',
    weapons: '重机枪、榴弹发射器',
    role: '重型突击 / 火力支援',
    tags: ['三角洲行动', '重装', '重机枪', '龙纹', '威龙'],
  },
]
