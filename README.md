
# 🎬 NBC · 节点式素材创作器

#### Node-Based Creator — AI 视频/图像创作工作流

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/0Mudo/NBC-Node.based.creator-AI-Video-Worlflow-/releases)
[![Electron](https://img.shields.io/badge/Electron-29-47848f?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

</div>

---

## 📖 简介

NBC 是一款 **基于节点的 AI 创作工作流桌面应用**。通过拖拽连线的方式组合「角色卡」「场景卡」「剧本」「提示词」等节点，一键驱动 GPT Image 2、Seedance 2.0 等 AI 服务完成图像和视频生成。内置灵感编辑器、时间线分镜系统和多路素材保存，覆盖从创意构思到最终输出的完整管线。

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
| ⚙️ **ComfyUI** | 本地 ComfyUI 工作流调用 |
| 📤 **输出** | 控制保存策略（本地/OSS/飞书） |

> **工作流执行引擎**：拓扑排序 → 上游节点数据收集 → 模板变量解析 → API 并发调用 → 结果分发

### ⏱️ 时间线分镜

- 坑位式分镜管理，支持**从剧本一键自动导入分镜**
- 素材池拖拽填充坑位
- 空坑标记提醒
- 支持按顺序/场景分组

### 💡 灵感编辑器

- 三步骤创作流程：**剧本 → 分镜 → 三卡**
- **Diff 文本对比**：左右分栏展示上一版与当前版的差异（高亮增删）
- **AI 迭代助手**：嵌入右侧聊天面板，对话式迭代优化文本
- **一键提取三卡**：AI 自动从剧本/分镜中提取角色、场景、物品并保存到素材库
- **一键生成角色参考表**：为角色卡批量排队生成形象图
- 自动版本记录 + 手动存档 + 版本回滚
- **对话历史管理**：保存/切换历史会话，每条消息支持复制

### 🗂️ 素材浏览器

- **按分类索引**：GPT Image、Seedance、Character、Scene 等标签过滤
- **按项目索引**：按关联项目或未分配素材分组
- 📋 **预设模板**：内置 5 个角色 + 6 个场景预设数据
- 本地文件夹扫描 + OSS 远程素材
- 支持拖拽到画布或时间线

### 🔧 Provider 配置系统

- 7 种内置 Provider：GPT Image 2 / Banana / Seedance 2.0 / ComfyUI / LLM / OSS / 飞书云盘
- 每个 Provider 独立配置 API Key + Endpoint
- **配置导入/导出**：一键备份或分享（默认不含密钥）
- 自定义 Provider 注册

---

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 29 + electron-builder |
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 5 |
| 样式方案 | TailwindCSS 3 + Radix UI |
| 节点编辑器 | ReactFlow 11 |
| 状态管理 | Zustand 4 |
| 图标 | Lucide React |
| 文本差异 | diff-match-patch |
| 布局 | rc-dock (可拖拽面板) |

---

## 📥 安装与使用

### 下载

从 [Releases](https://github.com/0Mudo/NBC-Node.based.creator-AI-Video-Worlflow-/releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `NBC 节点式素材创作器 Setup 1.0.0.exe` | NSIS 安装程序（可选安装路径，创建桌面快捷方式） |
| `NBC 节点式素材创作器 1.0.0.exe` | 便携版（免安装直接运行） |

> 🪟 仅支持 Windows x64

### 首次启动

1. 启动后会弹出**配置向导**，引导你填写各项 API Key
2. 也可随时通过右侧设置面板 → **设置** → **API 配置** 进行配置
3. **导入配置**：支持从 JSON 文件一键导入所有 Provider 配置

### 基础工作流

```
1. 新建项目（左侧面板）
2. 从节点面板拖拽节点到画布
3. 连线建立数据流
4. 点击节点 → 右侧属性面板编辑参数
5. 点击节点上的 ▶ 按钮执行
6. 在通知面板查看进度
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
npm run electron:build-main    # 构建 Electron 主进程

# 打包（国内需设置镜像）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run electron:build
```

### 项目结构

```
node-based-creator/
├── electron/
│   ├── main.ts          # Electron 主进程
│   └── preload.ts       # contextBridge 安全桥
├── src/
│   ├── api/             # API 客户端（GPT Image 2 / Seedance / ComfyUI / OSS / 飞书）
│   ├── store/           # Zustand 状态管理（12 个 store）
│   ├── types/           # TypeScript 类型定义
│   ├── nodes/           # 节点组件（10 种类型）
│   ├── components/      # UI 组件
│   │   ├── asset-browser/    # 素材浏览器
│   │   ├── chat/             # Agent 通知面板
│   │   ├── generation-queue/ # 生成队列 + 失败日志
│   │   ├── inspector/        # 属性检查器 + 提示词优化
│   │   ├── inspiration-editor/ # 灵感编辑器
│   │   ├── layout/           # 主布局
│   │   ├── node-editor/      # 画布 + 节点面板
│   │   ├── project/          # 项目管理
│   │   ├── settings/         # 设置面板
│   │   ├── setup/            # 配置向导
│   │   ├── templates/        # 模板市场
│   │   ├── timeline/         # 时间线分镜
│   │   └── workflow/         # 工作流管理
│   ├── data/            # 硬编码数据（角色/场景/物品预设）
│   ├── hooks/           # 自定义 hooks
│   └── utils/           # 工具函数
├── scripts/             # 辅助脚本
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🔌 IPC 通道

| 通道 | 用途 |
|------|------|
| `dialog:openDirectory` | 目录选择对话框 |
| `fs:scanDirectory` | 扫描目录中媒体文件 |
| `fs:readFile` | 读取文件为 base64 |
| `api:fetch` | 代理外部 API 请求（解决 CORS） |
| `save:local` | 保存到本地磁盘 |
| `save:oss` | 上传到阿里云 OSS |
| `save:feishu` | 写入飞书同步队列 |
| `project:saveToFile` | 导出 `.nbc.json` |
| `project:loadFromFile` | 导入 `.nbc.json` |
| `shell:open` | 打开链接/文件 |

---

## 🗺️ 路线图

- [ ] Provider 插件体系（统一接口，动态注册）
- [ ] 自定义节点类型
- [ ] OAuth2 授权流程
- [ ] Webhook 异步回调
- [ ] 时间线视频合并导出（ffmpeg）
- [ ] macOS / Linux 支持
- [ ] SDK 接入方式
- [ ] 协作功能

---

## 📄 许可证

MIT License

---

<div align="center">
  <sub>Made with ❤️</sub>
</div>
