export interface Scene {
  id: string
  name: string
  nameEn: string
  description: string
  lighting: string
  mood: string
  tags: string[]
  refImage?: string
}

export const scenes: Scene[] = [
  {
    id: 'babel',
    name: '巴别塔',
    nameEn: 'Babel Tower',
    description: '垂直结构的巨型建筑内部，多层平台和悬空走廊。工业金属质感，管道交错，昏暗的黄色应急灯光。垂直纵深极大，上下都有战斗区域，中景有中央电梯井和破损的通风管道。',
    lighting: '暖黄色顶灯+局部红色警报灯，氛围昏黄偏暗',
    mood: '压抑、破败、工业末日感',
    tags: ['巴别塔', '室内', '垂直', '工业', '金属'],
  },
  {
    id: 'tide',
    name: '潮汐监狱',
    nameEn: 'Tide Prison',
    description: '海上监狱设施，周围是深蓝灰色海水。混凝土墙壁生满青苔和锈迹，海水反复冲刷平台边缘。铁栅栏和瞭望塔矗立，远处有雷暴云层，偶尔闪电照亮场景。',
    lighting: '阴天自然光+闪电瞬间白光，偏蓝灰色调',
    mood: '阴冷、孤立、绝望感',
    tags: ['潮汐监狱', '室外', '海洋', '混凝土', '暴风雨'],
  },
  {
    id: 'space',
    name: '航天基地',
    nameEn: 'Space Base',
    description: '沙漠中的航天发射基地，巨大的火箭发射架占据天际线。控制室里有成排的老式计算机和监控屏幕。周围是荒芜的红色沙漠和低矮灌木，热浪扭曲远景。',
    lighting: '烈日自然光+控制室内荧光灯，暖橙+冷白混合',
    mood: '荒凉、科技与自然冲突' ,
    tags: ['航天基地', '室外+室内', '沙漠', '科技', '发射架'],
  },
  {
    id: 'keyroom',
    name: '钥匙房',
    nameEn: 'Key Room',
    description: '地下秘密设施的核心控制室。圆形房间，中央是全息战术地图投影，绿色数据流在暗墙上滚动。周围有加固门控制系统和武器柜。灯光昏暗，只有屏幕和投影的绿光照明。',
    lighting: '暗绿色屏幕光+蓝色投影光，整体偏暗的赛博氛围',
    mood: '神秘、紧张、赛博地下感',
    tags: ['钥匙房', '室内', '地下', '赛博', '控制室'],
  },
  {
    id: 'skylight',
    name: '天光仓库',
    nameEn: 'Skylight Warehouse',
    description: '废弃的工业仓库，天花板有破损的天窗，日光从天窗斜射下来形成光束。灰尘在光柱中飘浮，堆满木箱和生锈金属货架。角落有涂鸦墙壁和废弃车辆。',
    lighting: '顶部自然光+散射阴影，冷暖对比强烈',
    mood: '寂静、老旧、末日美感',
    tags: ['仓库', '室内', '天光', '废弃', '涂鸦'],
  },
  {
    id: 'tropical',
    name: '热带雨林',
    nameEn: 'Tropical Forest',
    description: '密林深处，巨大的热带植物和藤蔓覆盖一切。茂密树冠遮挡大部分阳光，只有斑驳光线透下。地面有浅溪流过，雾气弥漫，偶见古老石像和废墟。',
    lighting: '透过树冠的斑驳阳光，绿色漫反射光',
    mood: '原始、神秘、生命力旺盛又暗藏危险',
    tags: ['热带雨林', '室外', '密林', '潮湿', '废墟'],
  },
]
