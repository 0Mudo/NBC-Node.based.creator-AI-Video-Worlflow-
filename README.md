
# 🎬 NBC · 节点式素材创作器

#### Node-Based Creator — AI 视频 / 图像创作工作流

[![Version](https://img.shields.io/badge/version-1.0.4--beta-blue)](https://github.com/0Mudo/NBC-Node.based.creator-AI-Video-Worlflow-/releases)
[![Electron](https://img.shields.io/badge/Electron-29-47848f?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📖 简介

NBC 是一款 **基于节点的 AI 创作工作流桌面应用**。通过拖拽连线的方式组合「角色卡」「场景卡」「剧本」「提示词」等节点，一键驱动 **GPT Image 2**、**Seedance 2.0**、**Banana** 等 AI 服务完成图像和视频生成。内置灵感编辑器、时间线分镜系统、提示词库、生成分析和三路素材保存（本地 / OSS / 飞书），覆盖从创意构思到最终输出的完整管线。

---

## ✨ 核心功能

### 🎛️ 节点式工作流

| 节点类型 | 说明 |
|----------|------|
| 📥 **素材输入** | 从素材库绑定图片/视频作为生成输入 |
| 👤 **角色卡** | 角色设定（支持逗号分隔多角色） |
| 🏙️ **场景卡** | 场景描述与环境设定 |
| 📦 **物品卡** | 关键道具/物品设定 |
| 📝 **剧本** | 剧本与分镜文本 |
| 💬 **提示词** | 支持 `{{角色卡}}` `{{场景卡}}` 模板变量，自动收集上游节点数据 |
| 🖼️ **GPT Image 2** | 文生图 / 图生图（完整参数：比例、质量、参考图） |
| 🎥 **Seedance 2.0** | 文生视频 / 图生视频（模型/模式/分辨率/时长/首尾帧/有声） |
| 🍌 **Banana** | Banana 图像生成 |
| 📤 **输出** | 控制保存策略（本地/OSS/飞书），显示结果 URL |

> **工作流执行引擎**：拓扑排序 → 上游节点数据收集 → 模板变量解析 → API 并发调用 → 结果分发到输出节点

### ⏱️ 时间线分镜

- 坑位式分镜管理，支持**从剧本一键自动导入分镜**
- 素材池拖拽填充坑位
- 空坑标记提醒
- 支持按顺序/场景分组
- 批量生成 + 导出（MP4 H.264，支持分辨率/帧率/字幕/配音配置）

### 💡 灵感编辑器

- 三步骤创作流程：**剧本 → 分镜 → 三卡**
- **AI 迭代助手**：右侧聊天面板对话式迭代优化文本，单一对话上下文贯穿全流程
- **Diff 文本对比**：左右双栏展示上一版与当前版（`diff-match-patch`），编辑后实时更新
- **结构化编辑**：角色/场景/物品卡片支持表单式结构化编辑，自动解析自由文本填充
- **一键提取三卡**：AI 自动从剧本/分镜中提取所有角色、场景、物品，保存到素材库
- **一键生成角色参考表**：为角色卡批量排队生成形象图（调用 GPT Image 2）
- 自动版本记录 + 手动存档 + 版本切换
- 对话历史管理：保存/切换/删除历史会话

### 🗂️ 素材浏览器

- **按分类索引**：GPT Image、Seedance、Banana、Character、Scene、Item 等标签过滤
- **按项目索引**：按关联项目分组，支持查看未分配素材
- 📋 **预设模板**：内置 5 角色 + 6 场景 + 若干物品预设数据
- 本地文件夹扫描（`H:\素材库`） + **阿里云 OSS** + **飞书云盘** 三通道加载
- 拖拽素材到画布或时间线坑位
- **媒体查看器**：图片/视频预览放大
- **标签编辑器**：增删改素材标签
- **删除功能**：网格/列表/详情面板均支持一键删除素材
- 双视图切换：网格 / 列表

### 📊 生成分析

- 总生成数 / 成功率 / 成功数 统计卡片
- 按节点类型分布柱状图（GPT Image / Seedance / Banana）
- 失败原因分类分析（角色失配/构图差/风格偏差/API错误/其他）
- 生成最多镜头排行（Top 5）
- **AI 优化建议**：根据失败模式自动生成改进方案

### 📚 提示词库

- 6 大分类浏览：风格/镜头/光影/角色/场景/物品
- 内置海量专业提示词模板
- 收藏夹快速筛选
- 一键复制插入到提示词节点
- 支持用户新建自定义模板、删除/评分
- 使用次数统计

### 🔧 Provider 配置系统

- 7 种内置 Provider：GPT Image 2 / Banana / Seedance 2.0 / LLM / OSS / 飞书云盘 / 风格预设
- 每个 Provider 独立配置 API Key + Endpoint
- **配置导入/导出**：一键备份或分享（默认不含密钥）
- 自定义 Provider 注册

### 📦 三路保存

生成结果自动分发到三个通道：

| 通道 | 说明 |
|------|------|
| 💾 **本地** | 保存到素材库目录（`H:\素材库` 或自定义路径） |
| ☁️ **阿里云 OSS** | 上传到 yukkio bucket，自动匹配 MIME 类型 |
| 📋 **飞书** | 写入同步队列（JSONL），由定时脚本上传到飞书多维表格 + 云盘 |

### 🎬 视频导出

- MP4 H.264 格式导出
- 分辨率选择：1080p / 720p / 480p
- 帧率选择：24fps / 30fps
- 支持拼接分镜序列、烧录字幕、包含配音
- 导出进度条 + 输出路径自定义
- 完成后一键打开文件夹

### 🏗️ 恢复默认布局

所有关键面板（节点编辑器、灵感编辑器、节点面板、属性检查器）设为不可关闭。工具栏提供 **恢复默认布局** 按钮，一键复原全部面板到初始排列。

---

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 29 + electron-builder |
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 5 |
| 样式方案 | TailwindCSS 3 |
| 节点编辑器 | ReactFlow 11 |
| 状态管理 | Zustand 4（14 个 Store） |
| 布局系统 | rc-dock（可拖拽停靠面板） |
| 图标 | Lucide React |
| 文本差异 | diff-match-patch |
| OSS SDK | ali-oss 6 |

---

## 📥 安装与使用

### 下载

从 [Releases](https://github.com/0Mudo/NBC-Node.based.creator-AI-Video-Worlflow-/releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `NBC 节点式素材创作器 Setup x.x.x.exe` | NSIS 安装程序（可选路径，桌面快捷方式） |
| `NBC 节点式素材创作器 x.x.x.exe` | 便携版（免安装直接运行） |

> 🪟 当前仅支持 Windows x64

### 首次启动

1. 启动后弹出**配置向导**，填写各项 API Key
2. 可随时通过工具栏 **⚙️ 设置 → API 配置** 修改
3. 支持从 JSON 文件**一键导入**所有 Provider 配置

### 基础工作流

```
1. 新建项目（左侧面板 → 项目）
2. 从节点面板拖拽节点到画布
3. 连线建立数据流
4. 点击节点 → 右侧属性面板编辑参数
5. 点击节点上的 ▶ 按钮执行
6. 在通知面板 / 生成队列查看进度
7. 在生成分析面板查看统计与优化建议
```

---

## 🛠️ 开发

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 命令

```bash
# 安装依赖
npm install

# 开发模式（纯 Web，Vite HMR）
npm run dev                    # → http://localhost:5173/

# 开发模式（Electron 桌面应用）
npm run electron:dev           # 启动 Vite + Electron 窗口

# 构建并运行
npm run electron:prod          # 构建 Vite → 启动 Electron

# 构建
npm run build                  # Vite 构建到 dist/

# 打包（国内需设置镜像）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run electron:build
```

### 项目结构

```
node-based-creator/
├── electron/
│   ├── main.ts          # Electron 主进程（IPC handlers、nbc:// 协议、窗口管理）
│   └── preload.ts       # contextBridge 安全桥
├── src/
│   ├── api/             # API 客户端
│   │   ├── client.ts        # 双通道客户端（Vite 代理 / Electron IPC）
│   │   ├── gptImage2.ts     # GPT Image 2 生成
│   │   ├── seedance.ts      # Seedance 2.0 视频生成
│   │   ├── oss.ts           # OSS URL 构造与 manifest
│   │   ├── saveManager.ts   # 三路保存协调器（本地/OSS/飞书）
│   │   ├── inspirationAgent.ts # 灵感编辑器 AI 代理
│   │   └── promptOptimize.ts   # AI 提示词优化
│   ├── store/           # Zustand 状态管理（14 个 Store）
│   ├── types/           # TypeScript 类型定义
│   ├── nodes/           # 节点组件（10 种类型）
│   ├── components/      # UI 组件
│   │   ├── analytics/         # 生成分析面板
│   │   ├── asset-browser/     # 素材浏览器 + 卡片 + 详情 + 媒体查看器
│   │   ├── chat/              # Agent 通知面板
│   │   ├── export/            # 视频导出面板
│   │   ├── generation-queue/  # 生成队列 + 失败日志
│   │   ├── inspector/         # 属性检查器 + 提示词优化
│   │   ├── inspiration-editor/# 灵感编辑器（剧本/分镜/三卡 + 结构化表单）
│   │   ├── layout/            # 主布局
│   │   ├── node-editor/       # 画布 + 节点面板
│   │   ├── project/           # 项目管理
│   │   ├── prompt-library/    # 提示词库
│   │   ├── settings/          # API 配置面板
│   │   ├── setup/             # 首次启动配置向导
│   │   ├── templates/         # 模板市场
│   │   ├── timeline/          # 时间线分镜视图
│   │   └── workflow/          # 工作流管理
│   ├── data/            # 预设数据（角色/场景/物品/提示词/风格）
│   ├── engine/          # 执行引擎
│   ├── hooks/           # 自定义 hooks（useDeepLink）
│   └── utils/           # 工具函数
├── scripts/             # 辅助脚本（飞书同步）
├── package.json
├── vite.config.ts
├── vite.electron.config.ts
└── tailwind.config.js
```

### Zustand Store 清单

| Store | 职责 |
|-------|------|
| `useFlowStore` | 画布节点/连线 CRUD、自动保存 |
| `useProjectStore` | 项目管理、localStorage 持久化 |
| `useExecutionEngine` | 拓扑排序、prompt 模板变量收集、API 调用编排 |
| `useGenerationStore` | 生成任务队列、进度跟踪 |
| `useLogStore` | 失败日志记录、localStorage 持久化 |
| `useAssetStore` | 素材库状态（本地扫描 + OSS manifest + 预设） |
| `useProviderStore` | API Provider 配置 |
| `useWorkflowStore` | 工作流导入/导出 |
| `useNotificationStore` | Agent 通知面板 |
| `useTimelineStore` | 时间线分镜坑位 + 素材池 |
| `useInspirationStore` | 灵感编辑器状态（三步骤/版本/AI对话） |
| `usePromptLibraryStore` | 提示词模板库（收藏/新增/使用统计） |
| `useStyleStore` | 风格预设管理 |
| `useThemeStore` | 主题切换（深色/浅色） |

---

## 🔌 IPC 通道

| 通道 | 用途 |
|------|------|
| `dialog:openDirectory` | 目录选择对话框 |
| `fs:scanDirectory` | 扫描目录中媒体文件 |
| `fs:readFile` | 读取文件为 base64 |
| `api:fetch` | 代理外部 API 请求（解决 CORS） |
| `api:downloadBase64` | 下载远程资源为 base64（带 301 重定向跟随） |
| `save:local` | 保存到本地磁盘 |
| `save:oss` | 上传到阿里云 OSS（endpoint 模式） |
| `oss:list` | 列出 OSS Bucket 中文件 |
| `save:feishu` | 写入飞书同步队列 |
| `feishu:list` | 列出飞书云盘文件并缓存到本地 |
| `feishu:upload` | 上传文件到飞书云盘 |
| `project:saveToFile` | 导出 `.nbc.json` |
| `project:loadFromFile` | 从 `.nbc.json` 导入 |
| `shell:open` | 打开链接 / 文件 |
| `file:save` | Electron 文件保存 |
| `export:video` | 视频导出（ffmpeg 编码） |

---

## 🗺️ 路线图

- [ ] Provider 插件体系（统一接口，动态注册）
- [ ] 自定义节点类型
- [ ] OAuth2 授权流程
- [ ] Webhook 异步回调
- [ ] 时间线视频合并导出（ffmpeg 实操集成）
- [ ] macOS / Linux 支持

---

## 📋 更新日志

### v1.0.4-beta

- ✨ **新增** 生成分析面板 — 成功率/失败原因/优化建议，按节点类型统计柱状图
- ✨ **新增** 视频导出面板 — MP4 H.264 导出，分辨率/帧率/字幕/配音配置
- ✨ **新增** 提示词库 — 6 大分类浏览，收藏，一键复制插入，用户自定义模板
- ✨ **新增** 灵感编辑器结构化编辑 — 角色/场景/物品卡片支持表单式编辑
- ✨ **新增** 素材浏览器媒体查看器 + 标签编辑器
- ✨ **新增** Banana 图像生成节点（替换原 ComfyUI 节点）
- ✨ **新增** 分镜编辑器与剧本场景编辑器
- ✨ **新增** 风格预设系统（useStyleStore）
- 🔧 **优化** 主布局面板管理重构（useMemo + 新增弹窗组件）
- 🔧 **优化** 角色数据扩充（33 行新增）
- 🔧 **优化** 提示词解析引擎增强
- 🔧 **优化** Electron IPC 扩展（file:save、export:video）
- 🗑️ **移除** ComfyUI 节点与 API（功能迁移至 Banana 节点）

### v1.0.3-beta.2

- 🐛 **修复** 一键提取三卡报错（category 参数错误）
- 🐛 **修复** 面板关闭后无法复原（关键面板设为不可关闭，新增恢复布局按钮）
- 🐛 **修复** OSS 上传失败（endpoint 模式对齐，MIME 类型适配，错误透传）
- ✨ **新增** 素材库删除功能（网格/列表/详情面板均已接入）
- ✨ **新增** 飞书同步事件白名单过滤

### v1.0.3-beta.1

- ✨ **新增** 生成节点结果自动保存到本地素材库

### v1.0.2

- 🎨 **美化** 全应用 UI（语义颜色/微交互/组件统一）

### v1.0.1

- 🏗️ **重构** P0-P3 架构迭代（Provider 系统、配置导入导出、通知面板等）

### v1.0.0

- 🎉 **首发** 节点式素材创作器，9 种节点类型，ReactFlow 画布，Electron 桌面壳

---

## 📄 许可证

MIT License
