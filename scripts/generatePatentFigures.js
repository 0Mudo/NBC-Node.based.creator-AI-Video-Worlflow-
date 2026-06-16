const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.trae', 'documents', 'patent_figures_html');

const W = 1600;
const H = 900;
const SVG_RENDER_H = 780;
const SVG_VIEW_H = 980;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rect(x, y, w, h, text, opts = {}) {
  const fill = opts.fill || '#ffffff';
  const stroke = opts.stroke || '#2563eb';
  const radius = opts.radius ?? 18;
  const color = opts.color || '#0f172a';
  const size = opts.size || 24;
  const weight = opts.weight || 600;
  const dash = opts.dash ? `stroke-dasharray="${opts.dash}"` : '';
  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = size * 1.35;
  const startY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${x + w / 2}" y="${startY + i * lineHeight}">${esc(line)}</tspan>`
    )
    .join('');
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="3" ${dash} />
    <text text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="Microsoft YaHei, Arial">${tspans}</text>
  `;
}

function capsule(x, y, w, h, text, opts = {}) {
  return rect(x, y, w, h, text, { ...opts, radius: h / 2, size: opts.size || 22 });
}

function line(x1, y1, x2, y2, opts = {}) {
  const stroke = opts.stroke || '#475569';
  const width = opts.width || 3;
  const dash = opts.dash ? `stroke-dasharray="${opts.dash}"` : '';
  const arrowEnd = opts.arrowEnd === false ? '' : 'marker-end="url(#arrow)"';
  const arrowStart = opts.arrowStart ? 'marker-start="url(#arrow)"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash} ${arrowStart} ${arrowEnd} />`;
}

function poly(points, opts = {}) {
  const stroke = opts.stroke || '#475569';
  const width = opts.width || 3;
  const fill = opts.fill || 'none';
  const arrowEnd = opts.arrowEnd === false ? '' : 'marker-end="url(#arrow)"';
  return `<polyline points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${arrowEnd} />`;
}

function text(x, y, value, opts = {}) {
  const size = opts.size || 22;
  const color = opts.color || '#334155';
  const weight = opts.weight || 500;
  const anchor = opts.anchor || 'start';
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="Microsoft YaHei, Arial">${esc(value)}</text>`;
}

function groupBox(x, y, w, h, title, children, opts = {}) {
  const stroke = opts.stroke || '#94a3b8';
  const fill = opts.fill || '#f8fafc';
  const titleFill = opts.titleFill || '#e2e8f0';
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
    <rect x="${x + 18}" y="${y - 20}" width="${Math.max(180, title.length * 26)}" height="44" rx="22" fill="${titleFill}" stroke="${stroke}" stroke-width="2"/>
    <text x="${x + 36}" y="${y + 10}" fill="#0f172a" font-size="24" font-weight="700" font-family="Microsoft YaHei, Arial">${esc(title)}</text>
    ${children}
  `;
}

function html(title, subtitle, body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: "Microsoft YaHei", Arial, sans-serif;
    }
    .page {
      width: ${W}px;
      min-height: ${H}px;
      padding: 28px 32px 24px;
      background: #ffffff;
    }
    .title {
      text-align: center;
      font-size: 34px;
      font-weight: 800;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .subtitle {
      text-align: center;
      font-size: 18px;
      color: #475569;
      margin: 8px 0 16px;
    }
    svg { width: 100%; height: ${SVG_RENDER_H}px; display: block; }
  </style>
</head>
<body>
  <div class="page">
    <h1 class="title">${esc(title)}</h1>
    <div class="subtitle">${esc(subtitle)}</div>
    <svg viewBox="0 0 ${W} ${SVG_VIEW_H}" width="${W}" height="${SVG_RENDER_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
        </marker>
      </defs>
      ${body}
    </svg>
  </div>
</body>
</html>`;
}

const figures = [
  {
    name: 'fig01_architecture',
    title: '图1 系统整体架构图',
    subtitle: '渲染进程、预加载桥、主进程及外部服务之间的调用关系',
    body: () => `
      ${groupBox(70, 90, 1460, 160, '渲染进程（React + Zustand + ReactFlow）', `
        ${rect(120, 150, 230, 72, ['节点编辑器', 'FlowEditor'], { fill: '#dbeafe', stroke: '#2563eb' })}
        ${rect(390, 150, 230, 72, ['属性面板 / 提示词优化'], { fill: '#e0f2fe', stroke: '#0284c7' })}
        ${rect(660, 150, 230, 72, ['执行引擎', 'useExecutionEngine'], { fill: '#dcfce7', stroke: '#16a34a' })}
        ${rect(930, 150, 230, 72, ['素材库 / 时间线 / 通知'], { fill: '#f5d0fe', stroke: '#a21caf' })}
        ${rect(1200, 150, 250, 72, ['项目持久化', 'useProjectStore'], { fill: '#fde68a', stroke: '#d97706' })}
      `, { stroke: '#2563eb', titleFill: '#dbeafe' })}
      ${groupBox(220, 315, 1160, 110, '安全桥（preload / contextBridge）', `
        ${rect(350, 345, 300, 52, 'electronAPI.* IPC 接口暴露', { fill: '#eff6ff', stroke: '#3b82f6', radius: 14 })}
        ${rect(780, 345, 430, 52, 'api:fetch / fs:readFile / save:* / project:*', { fill: '#f8fafc', stroke: '#64748b', radius: 14, size: 20 })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(70, 500, 1460, 160, 'Electron 主进程', `
        ${rect(120, 560, 220, 72, ['窗口管理', 'BrowserWindow'], { fill: '#fef3c7', stroke: '#d97706' })}
        ${rect(380, 560, 220, 72, ['IPC 处理器', 'main.ts'], { fill: '#fde68a', stroke: '#ca8a04' })}
        ${rect(640, 560, 220, 72, ['协议服务', 'nbc://'], { fill: '#fee2e2', stroke: '#dc2626' })}
        ${rect(900, 560, 220, 72, ['网络代理', 'net.request'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${rect(1160, 560, 300, 72, ['本地文件与导出导入', 'dialog / fs / shell'], { fill: '#ecfccb', stroke: '#65a30d' })}
      `, { stroke: '#d97706', titleFill: '#fef3c7' })}
      ${groupBox(130, 720, 1330, 80, '外部模型与存储服务', `
        ${capsule(170, 738, 230, 44, 'GPT Image / Seedance', { fill: '#eff6ff', stroke: '#3b82f6' })}
        ${capsule(460, 738, 170, 44, 'ComfyUI', { fill: '#f3e8ff', stroke: '#9333ea' })}
        ${capsule(690, 738, 180, 44, '本地文件系统', { fill: '#ecfccb', stroke: '#65a30d' })}
        ${capsule(930, 738, 150, 44, 'OSS', { fill: '#dcfce7', stroke: '#16a34a' })}
        ${capsule(1140, 738, 220, 44, '飞书 JSONL 队列', { fill: '#fef3c7', stroke: '#d97706' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(800, 250, 800, 315)}
      ${line(800, 425, 800, 500)}
      ${line(800, 660, 800, 720)}
    `,
  },
  {
    name: 'fig02_overall_flow',
    title: '图2 方法总体流程图',
    subtitle: '从图构建到结果保存和时间线联动的完整执行流程',
    body: () => `
      ${capsule(660, 50, 280, 58, '开始', { fill: '#dbeafe', stroke: '#2563eb', size: 26 })}
      ${rect(585, 145, 430, 78, ['S1 构建工作流有向无环图', '节点：素材 / 角色 / 场景 / 提示词 / 生成 / 输出'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${rect(585, 270, 430, 78, ['S2 拓扑排序', '采用 Kahn 算法生成执行序列'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${rect(585, 395, 430, 78, ['S3 收集上游节点并构建执行上下文', '提取素材、角色、场景、剧本、提示词数据'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(585, 520, 430, 78, ['S4 模板变量替换', 'character / scene / 图片参考N / 视频参考N'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${rect(585, 645, 430, 78, ['S5 调用生成器适配器执行 AI 生成', '匹配 GPT 图像 / 视频 / ComfyUI 等能力'], { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${rect(150, 645, 320, 78, ['节点组独立运行', '按选中节点过滤后构建子图'], { fill: '#fee2e2', stroke: '#dc2626' })}
      ${rect(1110, 645, 340, 78, ['前端实时素材标签', '同步显示 图片参考N / 视频参考N'], { fill: '#cffafe', stroke: '#0891b2' })}
      ${rect(585, 770, 430, 78, ['S6 三路保存 + S7 时间线联动', '写入本地 / OSS / 飞书，并自动填充分镜槽位'], { fill: '#ecfccb', stroke: '#65a30d' })}
      ${capsule(660, 870, 280, 58, '结束', { fill: '#dbeafe', stroke: '#2563eb', size: 26 })}
      ${line(800, 108, 800, 145)}
      ${line(800, 223, 800, 270)}
      ${line(800, 348, 800, 395)}
      ${line(800, 473, 800, 520)}
      ${line(800, 598, 800, 645)}
      ${line(800, 723, 800, 770)}
      ${line(800, 848, 800, 870)}
      ${poly('470,684 528,684 528,684 585,684', { arrowEnd: true })}
      ${poly('1015,684 1062,684 1062,684 1110,684', { arrowEnd: true })}
    `,
  },
  {
    name: 'fig03_topological_sort',
    title: '图3 拓扑排序引擎算法流程图',
    subtitle: 'Kahn 算法实现执行顺序规划的流程',
    body: () => `
      ${capsule(660, 40, 280, 56, '开始', { fill: '#dbeafe', stroke: '#2563eb' })}
      ${rect(560, 125, 480, 70, ['读取当前节点集合与边集合', '初始化各节点入度计数器'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${rect(560, 235, 480, 70, ['遍历所有边', '统计每个目标节点的入度'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${rect(560, 345, 480, 70, ['将所有入度为 0 的节点加入队列', '同时初始化排序结果数组'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(560, 455, 480, 70, ['循环出队当前节点', '加入排序结果'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${rect(560, 565, 480, 70, ['遍历当前节点的邻居', '邻居入度减 1，若为 0 则入队'], { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${rect(220, 685, 320, 72, ['队列是否为空？'], { fill: '#fee2e2', stroke: '#dc2626' })}
      ${rect(760, 685, 340, 72, ['对排序序列中的生成节点执行模型调用', '非生成节点仅保留顺序'], { fill: '#cffafe', stroke: '#0891b2' })}
      ${capsule(810, 800, 240, 56, '输出拓扑序列', { fill: '#ecfccb', stroke: '#65a30d' })}
      ${line(800, 96, 800, 125)}
      ${line(800, 195, 800, 235)}
      ${line(800, 305, 800, 345)}
      ${line(800, 415, 800, 455)}
      ${line(800, 525, 800, 565)}
      ${poly('800,635 800,720 540,720', { arrowEnd: true })}
      ${poly('540,720 540,600 560,600', { arrowEnd: true })}
      ${text(470, 670, '否', { size: 20, color: '#dc2626', weight: 700 })}
      ${poly('540,720 760,720', { arrowEnd: true })}
      ${text(640, 705, '是', { size: 20, color: '#16a34a', weight: 700 })}
      ${line(930, 757, 930, 800)}
    `,
  },
  {
    name: 'fig04_execution_context',
    title: '图4 执行上下文构建流程图',
    subtitle: '以目标生成节点为中心收集并整合上游语义与媒体信息',
    body: () => `
      ${rect(635, 45, 330, 70, ['目标 AI 生成节点', '如 GPT 图像生成节点'], { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${line(800, 115, 800, 165)}
      ${rect(535, 165, 530, 76, ['反向递归查找所有上游节点', 'findUpstream(nodeId, nodes, edges)'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${line(800, 241, 800, 290)}
      ${groupBox(70, 300, 1460, 250, '按节点类型分类提取信息', `
        ${rect(110, 360, 200, 120, ['素材输入节点', 'assetId', '图片/视频分类'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(350, 360, 220, 120, ['角色设定节点', '角色名 / 外观描述', '一致性约束 / 种子'], { fill: '#dcfce7', stroke: '#16a34a' })}
        ${rect(610, 360, 200, 120, ['场景设定节点', '场景名 / 场景描述'], { fill: '#fef3c7', stroke: '#d97706' })}
        ${rect(850, 360, 200, 120, ['剧本 / 分镜节点', '脚本文本 / 镜头描述'], { fill: '#fee2e2', stroke: '#dc2626' })}
        ${rect(1090, 360, 220, 120, ['提示词节点', '原始提示词', '模板变量待替换'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${rect(1350, 360, 130, 120, ['物品卡', '物品名 / 描述'], { fill: '#f3e8ff', stroke: '#9333ea', size: 22 })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(800, 550, 800, 610)}
      ${rect(500, 610, 600, 92, ['合并为执行上下文对象', '完整提示词 + 图片参考列表 + 视频参考列表 + 负面提示词 + 种子 + 参数'], { fill: '#ecfccb', stroke: '#65a30d' })}
      ${line(800, 702, 800, 760)}
      ${capsule(570, 760, 460, 58, '传入生成器适配器执行 AI 模型调用', { fill: '#dbeafe', stroke: '#2563eb' })}
    `,
  },
  {
    name: 'fig05_template_replace',
    title: '图5 模板变量替换流程图',
    subtitle: '标准变量与媒体变量的统一替换机制',
    body: () => `
      ${rect(80, 120, 420, 90, ['输入提示词文本', '{{character}}在{{scene}}中执行任务，参考{{图片参考1}}'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${rect(590, 70, 420, 90, ['标准变量解析', 'character / scene / item / description'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(590, 220, 420, 90, ['媒体变量解析', '{{图片参考N}} / {{视频参考N}}', '同时支持纯文本变量'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${rect(1100, 70, 380, 90, ['上游结构化语义数据', '角色名、场景名、描述信息'], { fill: '#ecfccb', stroke: '#65a30d' })}
      ${rect(1100, 220, 380, 90, ['分类排序后的媒体引用列表', 'imageRefs[] / videoRefs[]'], { fill: '#cffafe', stroke: '#0891b2' })}
      ${rect(420, 410, 760, 120, ['生成替换后的完整提示词', '角色「蜂医」在场景「航天基地」中执行任务，参考 H:\\素材库\\角色参考图.png'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${capsule(620, 620, 360, 60, '输出给执行引擎', { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${line(500, 165, 590, 115)}
      ${line(500, 165, 590, 265)}
      ${line(1010, 115, 1100, 115)}
      ${line(1010, 265, 1100, 265)}
      ${poly('800,160 800,360 800,360 800,410', { arrowEnd: true })}
      ${poly('800,310 800,360 800,360 800,410', { arrowEnd: true })}
      ${line(800, 530, 800, 620)}
    `,
  },
  {
    name: 'fig06_media_binding',
    title: '图6 多源素材变量自动绑定机制图',
    subtitle: '素材分类、排序、编号与提示词映射的联动关系',
    body: () => `
      ${groupBox(60, 120, 520, 520, '上游素材节点集合', `
        ${rect(120, 200, 160, 90, ['素材节点 A', '角色参考图'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(340, 200, 160, 90, ['素材节点 B', '风格参考图'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(230, 370, 180, 90, ['素材节点 C', '氛围视频'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${text(120, 520, '1. 读取 asset.type 精确判断图片/视频', { size: 24 })}
        ${text(120, 560, '2. 若无 Asset 记录，则按文件后缀回退判断', { size: 24 })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(640, 120, 380, 520, '分类与排序', `
        ${rect(700, 200, 260, 90, ['图片组', '按画布坐标先 Y 后 X 排序'], { fill: '#dcfce7', stroke: '#16a34a' })}
        ${rect(700, 360, 260, 90, ['视频组', '按画布坐标先 Y 后 X 排序'], { fill: '#fef3c7', stroke: '#d97706' })}
        ${capsule(720, 500, 220, 46, '图片参考1 / 图片参考2', { fill: '#ecfeff', stroke: '#0891b2', size: 20 })}
        ${capsule(760, 560, 140, 46, '视频参考1', { fill: '#f3e8ff', stroke: '#9333ea', size: 20 })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(1080, 120, 450, 520, '提示词节点引用区', `
        ${rect(1130, 205, 350, 90, ['可点击标签按钮', '+图1  +图2  +视1'], { fill: '#eff6ff', stroke: '#3b82f6' })}
        ${rect(1130, 360, 350, 110, ['插入变量模板', '{{图片参考1}} / {{图片参考2}} / {{视频参考1}}'], { fill: '#f8fafc', stroke: '#64748b' })}
        ${rect(1130, 520, 350, 80, ['在文本框当前光标位置插入', '并恢复 selectionStart / selectionEnd'], { fill: '#fee2e2', stroke: '#dc2626' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(580, 380, 640, 380)}
      ${line(1020, 380, 1080, 380)}
    `,
  },
  {
    name: 'fig07_group_execution',
    title: '图7 节点组独立运行流程图',
    subtitle: '节点组创建、包围盒渲染、子图过滤与独立执行过程',
    body: () => `
      ${capsule(650, 50, 300, 58, '用户框选或累积选择多个节点', { fill: '#dbeafe', stroke: '#2563eb' })}
      ${rect(575, 150, 450, 78, ['创建节点组对象', 'groupId / groupName / nodeIds / color'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${rect(575, 270, 450, 78, ['计算组成员包围盒', 'minX / minY / maxX / maxY + padding'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(575, 390, 450, 78, ['依据 viewport 缩放和平移', '转换为屏幕坐标并渲染可视框'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${rect(575, 510, 450, 78, ['接收组运行指令', '点击运行按钮或双击组标签'], { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${rect(575, 630, 450, 78, ['按 nodeIds 过滤全图节点和边', '仅构建组内子图'], { fill: '#fee2e2', stroke: '#dc2626' })}
      ${rect(575, 750, 450, 78, ['对子图执行拓扑排序并运行组内生成节点', '同步保存到 localStorage 与 .nbc.json'], { fill: '#ecfccb', stroke: '#65a30d' })}
      ${line(800, 108, 800, 150)}
      ${line(800, 228, 800, 270)}
      ${line(800, 348, 800, 390)}
      ${line(800, 468, 800, 510)}
      ${line(800, 588, 800, 630)}
      ${line(800, 708, 800, 750)}
      ${rect(1100, 390, 310, 138, ['界面可视元素', '虚线边框', '半透明背景', '组名 / 数量 / 运行 / 解散'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${line(1025, 430, 1100, 430)}
    `,
  },
  {
    name: 'fig08_ref_label',
    title: '图8 前端素材变量标签实时计算与展示流程图',
    subtitle: '素材节点和提示词节点的实时反馈联动',
    body: () => `
      ${groupBox(70, 120, 500, 540, '素材输入节点侧', `
        ${rect(120, 200, 400, 80, ['遍历所有提示词节点', '查找当前素材节点是否属于其上游集合'], { fill: '#eff6ff', stroke: '#3b82f6' })}
        ${rect(120, 330, 400, 80, ['若属于上游集合', '按图片组 / 视频组分类排序'], { fill: '#dcfce7', stroke: '#16a34a' })}
        ${rect(120, 460, 400, 100, ['生成标题栏标签', '图片参考N 或 视频参考N', '连线后即时显示，断线后即时消失'], { fill: '#fef3c7', stroke: '#d97706' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(650, 120, 500, 540, '提示词节点侧', `
        ${rect(700, 200, 400, 80, ['实时收集所有上游媒体引用', 'collectMediaRefsFromUpstream'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${rect(700, 330, 400, 80, ['渲染 +图1 / +图2 / +视1 标签按钮', '图标区分图片与视频'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(700, 460, 400, 100, ['点击标签后', '在文本框光标位置插入变量模板字符串'], { fill: '#ecfccb', stroke: '#65a30d' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(1230, 210, 280, 360, '共享状态', `
        ${rect(1270, 290, 200, 80, ['nodes / edges Store', '响应式变更触发重算'], { fill: '#f8fafc', stroke: '#64748b' })}
        ${rect(1270, 410, 200, 80, ['变量编号结果', '驱动 UI 实时刷新'], { fill: '#fee2e2', stroke: '#dc2626' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(570, 390, 650, 390)}
      ${line(1150, 390, 1230, 390)}
    `,
  },
  {
    name: 'fig09_timeline',
    title: '图9 时间线分镜系统的数据结构与数据流图',
    subtitle: '生成结果自动绑定到对应分镜行槽位的过程',
    body: () => `
      ${groupBox(70, 120, 360, 480, '执行上下文', `
        ${rect(120, 220, 260, 90, ['timelineRowId', 'timelineMediaType'], { fill: '#eff6ff', stroke: '#3b82f6' })}
        ${rect(120, 380, 260, 110, ['生成结果', '本地路径 / 云端 URL / 缩略图 / 元数据'], { fill: '#dcfce7', stroke: '#16a34a' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(520, 120, 520, 480, '时间线存储 useTimelineStore', `
        ${rect(580, 200, 400, 90, ['rows[]', '分镜行、槽位、排序、绑定关系'], { fill: '#fef3c7', stroke: '#d97706' })}
        ${rect(580, 350, 400, 90, ['bindMediaToRow()', '按 rowId + mediaType 写入结果素材'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${rect(580, 500, 400, 70, ['setRowGenerating()', '生成中状态同步'], { fill: '#f8fafc', stroke: '#64748b' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(1130, 120, 380, 480, '时间线界面', `
        ${rect(1180, 220, 280, 90, ['分镜行槽位', '图片槽位 / 视频槽位'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(1180, 380, 280, 110, ['自动显示绑定素材', '支持激活、替换、删除、拖拽'], { fill: '#ecfccb', stroke: '#65a30d' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(430, 360, 520, 360)}
      ${line(1040, 360, 1130, 360)}
      ${text(690, 660, '生成完成后根据 timelineRowId 自动填充对应分镜行，减少手工导入和对齐操作', { size: 24, anchor: 'middle', color: '#334155', weight: 600 })}
    `,
  },
  {
    name: 'fig10_asset_cache',
    title: '图10 素材库多源加载与缩略图双层缓存示意图',
    subtitle: '本地、OSS、云盘素材统一加载，以及视频缩略图缓存机制',
    body: () => `
      ${groupBox(60, 140, 420, 500, '素材来源', `
        ${capsule(110, 220, 320, 52, '本地文件夹扫描', { fill: '#eff6ff', stroke: '#3b82f6' })}
        ${capsule(110, 320, 320, 52, 'OSS manifest 加载', { fill: '#dcfce7', stroke: '#16a34a' })}
        ${capsule(110, 420, 320, 52, '协作平台云盘素材列表', { fill: '#fef3c7', stroke: '#d97706' })}
        ${rect(110, 520, 320, 90, ['统一写入素材管理状态', 'name / path / type / thumbnail'], { fill: '#f8fafc', stroke: '#64748b' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(560, 140, 460, 500, '视频缩略图生成与双层缓存', `
        ${rect(620, 210, 340, 72, ['创建隐藏 video 元素并加载 metadata'], { fill: '#ede9fe', stroke: '#7c3aed' })}
        ${rect(620, 320, 340, 72, ['seek 到预设时间点并截帧', 'Canvas 绘制为 JPEG DataURL'], { fill: '#cffafe', stroke: '#0891b2' })}
        ${rect(620, 430, 160, 92, ['内存缓存', 'frameCache Map'], { fill: '#dcfce7', stroke: '#16a34a' })}
        ${rect(800, 430, 160, 92, ['sessionStorage', 'nbc_vthumb_*'], { fill: '#ecfccb', stroke: '#65a30d' })}
        ${rect(620, 560, 340, 60, ['渲染时按 frameCache → sessionStorage → 重新截帧 顺序命中'], { fill: '#f8fafc', stroke: '#64748b', size: 20 })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${groupBox(1100, 140, 430, 500, '素材浏览器界面', `
        ${rect(1160, 220, 310, 90, ['图片素材直接展示缩略图', '视频素材展示缓存帧预览'], { fill: '#fee2e2', stroke: '#dc2626' })}
        ${rect(1160, 370, 310, 90, ['支持拖入画布与时间线槽位', '减少重复加载和卡顿'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      `, { stroke: '#64748b', titleFill: '#e2e8f0' })}
      ${line(480, 390, 560, 390)}
      ${line(1020, 390, 1100, 390)}
    `,
  },
  {
    name: 'fig11_canvas_ui',
    title: '图11 节点编辑器画布界面示例图',
    subtitle: '完整工作流在节点编辑器中的典型布局示意',
    body: () => `
      <rect x="40" y="60" width="1520" height="680" rx="26" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
      <rect x="40" y="60" width="1520" height="56" rx="26" fill="#1e293b" />
      ${text(80, 95, 'NBC 节点式素材创作器', { size: 24, color: '#ffffff', weight: 700 })}
      <rect x="40" y="116" width="240" height="624" fill="#e2e8f0"/>
      <rect x="1280" y="116" width="280" height="624" fill="#e2e8f0"/>
      ${text(80, 155, '素材 / 项目面板', { size: 22, weight: 700 })}
      ${text(1310, 155, '节点面板 / 属性检查器', { size: 22, weight: 700 })}
      <rect x="280" y="116" width="1000" height="624" fill="#f1f5f9"/>
      ${rect(340, 260, 170, 96, ['素材输入', '角色参考图'], { fill: '#cffafe', stroke: '#0891b2', size: 22 })}
      ${rect(340, 430, 170, 96, ['角色卡', '蜂医'], { fill: '#dcfce7', stroke: '#16a34a', size: 22 })}
      ${rect(340, 600, 170, 96, ['场景卡', '航天基地'], { fill: '#fef3c7', stroke: '#d97706', size: 22 })}
      ${rect(650, 430, 220, 120, ['提示词节点', '{{character}} 在 {{scene}} 中', '参考 {{图片参考1}}'], { fill: '#ede9fe', stroke: '#7c3aed', size: 20 })}
      ${rect(1000, 340, 200, 110, ['GPT 图像生成', '质量 / 比例 / 参考图'], { fill: '#fee2e2', stroke: '#dc2626', size: 20 })}
      ${rect(1000, 550, 200, 110, ['Seedance 视频生成', '时长 / 分辨率'], { fill: '#f3e8ff', stroke: '#9333ea', size: 20 })}
      ${rect(1290, 340, 150, 90, ['输出', '图像'], { fill: '#ecfccb', stroke: '#65a30d', size: 22 })}
      ${rect(1290, 560, 150, 90, ['输出', '视频'], { fill: '#ecfccb', stroke: '#65a30d', size: 22 })}
      ${line(510, 308, 650, 470)}
      ${line(510, 478, 650, 490)}
      ${line(510, 648, 650, 510)}
      ${line(870, 485, 1000, 395)}
      ${line(870, 505, 1000, 605)}
      ${line(1200, 395, 1290, 385)}
      ${line(1200, 605, 1290, 605)}
      ${rect(1320, 220, 200, 86, ['检查器', '当前节点参数与状态'], { fill: '#ffffff', stroke: '#94a3b8', size: 18 })}
      ${rect(80, 200, 160, 72, ['素材库', '图片 / 视频'], { fill: '#ffffff', stroke: '#94a3b8', size: 18 })}
      ${rect(80, 300, 160, 72, ['项目列表', '导入 / 导出'], { fill: '#ffffff', stroke: '#94a3b8', size: 18 })}
    `,
  },
  {
    name: 'fig12_group_overlay_ui',
    title: '图12 节点组视觉叠加层界面示例图',
    subtitle: '节点组包围盒、标题栏与运行控制在画布中的显示效果',
    body: () => `
      <rect x="60" y="90" width="1480" height="660" rx="26" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
      <rect x="60" y="90" width="1480" height="56" rx="26" fill="#1e293b" />
      ${text(90, 125, '节点画布 - 组运行示意', { size: 24, color: '#ffffff', weight: 700 })}
      <rect x="300" y="210" width="780" height="360" rx="28" fill="#8b5cf51a" stroke="#8b5cf5" stroke-width="4" stroke-dasharray="12 10"/>
      <rect x="320" y="186" width="380" height="42" rx="18" fill="#8b5cf522" stroke="#8b5cf5" stroke-width="2"/>
      ${text(350, 214, '第一段镜头组   (4)   运行   解散', { size: 22, color: '#6d28d9', weight: 700 })}
      ${rect(360, 280, 160, 90, ['角色卡', '蜂医'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(360, 430, 160, 90, ['场景卡', '航天基地'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${rect(620, 350, 200, 100, ['提示词节点', '角色出场镜头'], { fill: '#ede9fe', stroke: '#7c3aed' })}
      ${rect(900, 350, 140, 100, ['GPT 图像生成'], { fill: '#fee2e2', stroke: '#dc2626', size: 22 })}
      ${line(520, 325, 620, 385)}
      ${line(520, 475, 620, 415)}
      ${line(820, 400, 900, 400)}
      ${rect(1120, 240, 220, 90, ['组外节点', '不参与本次独立运行'], { fill: '#ffffff', stroke: '#94a3b8', dash: '8 8' })}
      ${rect(1120, 420, 220, 90, ['另一组节点', '可单独再建组'], { fill: '#ffffff', stroke: '#94a3b8', dash: '8 8' })}
      ${text(780, 660, '虚线边框和半透明背景用于标识逻辑子流程，标题栏可直接触发独立运行', { size: 24, anchor: 'middle', weight: 600 })}
    `,
  },
  {
    name: 'fig13_prompt_ui',
    title: '图13 提示词节点的素材引用标签界面示例图',
    subtitle: '提示词节点中媒体引用按钮和变量插入的交互效果',
    body: () => `
      <rect x="340" y="110" width="920" height="560" rx="28" fill="#ffffff" stroke="#7c3aed" stroke-width="4"/>
      <rect x="340" y="110" width="920" height="60" rx="28" fill="#ede9fe"/>
      ${text(390, 148, '提示词节点', { size: 26, color: '#5b21b6', weight: 800 })}
      <rect x="410" y="210" width="180" height="34" rx="16" fill="#e0f2fe" stroke="#0891b2" stroke-width="2"/>
      <rect x="605" y="210" width="180" height="34" rx="16" fill="#e0f2fe" stroke="#0891b2" stroke-width="2"/>
      <rect x="800" y="210" width="180" height="34" rx="16" fill="#f3e8ff" stroke="#9333ea" stroke-width="2"/>
      ${text(500, 232, '+图1', { size: 20, anchor: 'middle', color: '#0f766e', weight: 700 })}
      ${text(695, 232, '+图2', { size: 20, anchor: 'middle', color: '#0f766e', weight: 700 })}
      ${text(890, 232, '+视1', { size: 20, anchor: 'middle', color: '#7e22ce', weight: 700 })}
      <rect x="410" y="280" width="780" height="280" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/>
      ${text(440, 330, '角色「蜂医」在场景「航天基地」中执行任务，参考', { size: 24, color: '#334155' })}
      ${text(440, 380, '{{图片参考1}}', { size: 24, color: '#0f766e', weight: 700 })}
      ${text(610, 380, '与', { size: 24, color: '#334155' })}
      ${text(660, 380, '{{视频参考1}}', { size: 24, color: '#7e22ce', weight: 700 })}
      ${text(850, 380, '构造动态镜头。', { size: 24, color: '#334155' })}
      <line x1="760" y1="405" x2="760" y2="438" stroke="#dc2626" stroke-width="3"/>
      <polygon points="760,438 752,424 768,424" fill="#dc2626"/>
      ${text(790, 435, '当前光标位置', { size: 20, color: '#dc2626', weight: 700 })}
      <rect x="410" y="590" width="190" height="42" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
      <rect x="620" y="590" width="190" height="42" rx="14" fill="#ede9fe" stroke="#7c3aed" stroke-width="2"/>
      ${text(505, 618, '刷新状态', { size: 20, anchor: 'middle' })}
      ${text(715, 618, 'AI 优化', { size: 20, anchor: 'middle', color: '#5b21b6', weight: 700 })}
    `,
  },
  {
    name: 'fig14_save_pipeline',
    title: '图14 三路保存协调器的数据流图',
    subtitle: '生成结果在本地、云端和协作平台间的协调保存过程',
    body: () => `
      ${capsule(620, 80, 360, 60, '生成结果 Result Asset', { fill: '#dbeafe', stroke: '#2563eb' })}
      ${line(800, 140, 800, 220)}
      ${rect(540, 220, 520, 92, ['saveManager / resultPipeline', '统一协调保存策略、命名规则、状态回传'], { fill: '#eff6ff', stroke: '#3b82f6' })}
      ${line(800, 312, 800, 380)}
      ${rect(160, 380, 300, 120, ['本地文件系统通道', 'save:local', '文档\\NBC素材'], { fill: '#ecfccb', stroke: '#65a30d' })}
      ${rect(650, 380, 300, 120, ['对象存储服务通道', 'save:oss', 'staging / manifest'], { fill: '#dcfce7', stroke: '#16a34a' })}
      ${rect(1140, 380, 300, 120, ['协作平台队列通道', 'save:feishu', 'JSONL 同步队列'], { fill: '#fef3c7', stroke: '#d97706' })}
      ${line(800, 380, 310, 380)}
      ${line(800, 380, 650, 380)}
      ${line(950, 380, 1140, 380)}
      ${rect(160, 590, 300, 90, ['返回本地路径', '供界面展示和时间线绑定'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${rect(650, 590, 300, 90, ['返回 URL / objectKey', '供素材库与分享使用'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${rect(1140, 590, 300, 90, ['供外部 Agent 定时消费', '异步同步到飞书'], { fill: '#f8fafc', stroke: '#64748b' })}
      ${line(310, 500, 310, 590)}
      ${line(800, 500, 800, 590)}
      ${line(1290, 500, 1290, 590)}
    `,
  },
];

ensureDir(outDir);

for (const figure of figures) {
  const file = path.join(outDir, `${figure.name}.html`);
  fs.writeFileSync(file, html(figure.title, figure.subtitle, figure.body()), 'utf8');
}

console.log(`Generated ${figures.length} patent figure HTML files in ${outDir}`);
