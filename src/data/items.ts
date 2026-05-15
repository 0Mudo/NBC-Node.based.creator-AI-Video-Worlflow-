export interface Item {
  id: string
  name: string
  nameEn: string
  description: string
  material: string
  status: string
  tags: string[]
  refImage?: string
}

export const items: Item[] = [
  {
    id: 'health_kit',
    name: '急救包',
    nameEn: 'Health Kit',
    description: '标准战术医疗包。外层由军绿色防水尼龙材质制成，正面有红色十字标识。包含绷带、止血带、自动注射器和各种基础急救药物。',
    material: '防水尼龙，金属拉链',
    status: '全新，未开封',
    tags: ['医疗', '战术', '消耗品', '急救包'],
  },
  {
    id: 'data_drive',
    name: '加密数据盘',
    nameEn: 'Encrypted Data Drive',
    description: '一个黑色的长方形存储设备。外壳是哑光金属，边缘有蓝色LED指示灯。表面有军方标识和磨损痕迹。',
    material: '钛合金，工程塑料',
    status: '轻微磨损，工作正常',
    tags: ['情报', '科技', '存储', '任务目标'],
  },
  {
    id: 'emp_grenade',
    name: 'EMP手雷',
    nameEn: 'EMP Grenade',
    description: '圆柱形电磁脉冲发生器。顶部有安全拉环和引信，中部有发光的蓝色能量核心，启动时会发出轻微的嗡嗡声。',
    material: '合成金属，能量晶体',
    status: '已充能，随时可用',
    tags: ['战术', '武器', '电磁', '投掷物'],
  },
  {
    id: 'keycard',
    name: '高级门禁卡',
    nameEn: 'Level 5 Keycard',
    description: '半透明的智能卡片，内部嵌有复杂的金色电路纹路。卡片正面印有全息安全防伪标识和设施通行级别。',
    material: '聚碳酸酯，智能芯片',
    status: '完好',
    tags: ['门禁', '通行证', '关键物品'],
  },
]
