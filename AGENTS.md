# AGENTS.md — NBC · 节点式素材创作器

为 AI Agent 编写的项目级指导文件。人类开发者可直接参考 `.trae/documents/` 下的 PRD 和架构文档。

## 技术栈

- **桌面壳**: Electron 29 + electron-builder
- **前端**: React 18 + TypeScript 5 + Vite 5 + TailwindCSS 3
- **节点编辑器**: ReactFlow 11
- **状态管理**: Zustand 4
- **图标**: Lucide React
- **无后端**：纯桌面应用，所有持久化走本地

## 项目结构

```
node-based-creator/
├── electron/
│   ├── main.ts          # Electron 主进程：IPC handlers、nbc:// 协议、窗口管理
│   └── preload.ts       # contextBridge 安全桥，暴露 electronAPI
├── src/
│   ├── api/
│   │   ├── client.ts        # API 请求客户端（Vite 代理 / Electron net.request 双通道）
│   │   ├── gptImage2.ts     # GPT Image 2 生成（GrsAI 代理）
│   │   ├── seedance.ts      # Seedance 2.0 视频生成（Ark API）
│   │   ├── comfyui.ts       # ComfyUI 本地调用
│   │   ├── oss.ts           # OSS 上传管理
│   │   ├── saveManager.ts   # 三路保存协调器（本地/OSS/飞书）
│   │   └── promptOptimize.ts # AI 提示词优化（LLM API）
│   ├── store/
│   │   ├── useFlowStore.ts       # 节点画布状态（nodes/edges CRUD）
│   │   ├── useProjectStore.ts    # 项目管理（CRUD、localStorage 持久化）
│   │   ├── useExecutionEngine.ts # 工作流执行引擎（拓扑排序→上游收集→API调用）
│   │   ├── useGenerationStore.ts # 生成队列状态
│   │   ├── useLogStore.ts        # 失败日志
│   │   ├── useAssetStore.ts      # 素材浏览器状态
│   │   ├── useProviderStore.ts   # Provider 插件配置
│   │   ├── useWorkflowStore.ts   # 工作流导入/导出
│   │   ├── useNotificationStore.ts # Agent 通知面板状态
│   │   └── useTimelineStore.ts   # 时间线分镜坑位 + 素材池
│   ├── types/               # TypeScript 类型定义
│   ├── data/
│   │   ├── characters.ts    # 角色卡数据（蜂医/老太/露娜/疾风/威龙）
│   │   └── scenes.ts        # 场景卡数据（巴别塔/潮汐监狱/航天基地等）
│   ├── nodes/               # 9 种节点类型
│   │   ├── AssetInputNode.tsx    # 素材输入
│   │   ├── CharacterCardNode.tsx  # 角色卡（支持多角色逗号分隔）
│   │   ├── SceneCardNode.tsx     # 场景卡
│   │   ├── ScriptNode.tsx        # 剧本/分镜
│   │   ├── PromptNode.tsx        # 提示词（支持模板变量 {{变量名}}）
│   │   ├── GPTImageNode.tsx      # GPT Image 2 生成
│   │   ├── SeedanceNode.tsx      # Seedance 2.0 视频生成
│   │   ├── ComfyUINode.tsx       # ComfyUI 工作流
│   │   └── OutputNode.tsx        # 输出节点
│   └── components/
│       ├── layout/MainLayout.tsx    # 三栏布局（素材264px/画布自适应/面板288px）
│       ├── node-editor/
│       │   ├── FlowEditor.tsx       # ReactFlow 画布 + 顶部工具栏
│       │   └── NodePalette.tsx      # 可拖拽节点面板
│       ├── inspector/Inspector.tsx   # 属性检查器
│       ├── inspector/PromptOptimizer.tsx # AI 提示词优化组件
│       ├── asset-browser/           # 素材浏览器
│       ├── project/ProjectPanel.tsx  # 项目管理面板
│       ├── generation-queue/        # 生成队列 + 失败日志
│       ├── settings/SettingsPanel.tsx # API 配置面板
│       ├── chat/ChatPanel.tsx       # Agent 通知面板（Agent 动态）
│       ├── timeline/TimelineView.tsx # 时间线分镜视图（坑位+拖拽填充）
│       ├── setup/SetupWizard.tsx    # 首次启动配置向导（API Key 输入）
│       └── templates/TemplateMarket.tsx # 模板市场
├── hooks/
│   └── useDeepLink.ts         # nbc:// 深度链接处理 hook
├── dist/                       # Vite 构建输出
├── dist-electron/              # Electron 构建输出
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── .trae/documents/            # Trae IDE 生成的 PRD + 架构文档（只读参考）
```

## 关键架构决策

### 双层持久化
- **localStorage**：项目列表索引 + 自动保存（快速、零配置）
  - `nbc_projects`：项目元信息数组
  - `nbc_project_{id}`：每个项目的 nodes + edges
  - `nbc_active_project`：当前活跃项目 ID
- **`.nbc.json` 文件**：导出/导入（可迁移、可分享），含 version、projectName、nodes、edges、metadata

### Electron 安全模型
- `contextIsolation: true`，`nodeIntegration: false`
- 所有文件操作通过 `contextBridge.exposeInMainWorld` 暴露
- 渲染进程使用 `window.electronAPI.*` 调用

### nbc:// 自定义协议
- `protocol.registerSchemesAsPrivileged` 注册
- `protocol.handle('nbc', ...)` 处理，从 `dist/` 目录 serve 文件
- 用于桌面应用启动和资源加载

### API 双通道（Vite 代理 + Electron IPC）
- **开发模式**（`npm run dev`）：Vite 代理 `/api/grsai` → GrsAI、`/api/ark` → 火山方舟、`/api/comfyui` → localhost:8188
- **Electron 模式**：`api:fetch` IPC → `net.request` 主进程代理，解决 CORS
- 前端代码通过 `api/client.ts` 统一判断走哪个通道

### 工作流执行引擎
- 拓扑排序确定执行顺序
- 上游节点输出收集（prompt 模板变量替换）
- 生成队列管理（并发控制、状态跟踪）
- 每个节点有 Run 按钮 + 状态指示（▶️/🔄/✅/❌）

## 开发命令

```bash
# 开发（纯 Web 模式，Vite HMR）
npm run dev                  # → http://localhost:5173/

# 开发（Electron 桌面应用）
npm run electron:dev         # 启动 Vite + Electron 窗口

# 构建
npm run build                # Vite 构建到 dist/
npm run electron:build       # electron-builder 打包

# 桌面应用（生产模式）
npm run electron:prod        # 构建后启动 Electron
```

## IPC 通道清单

| 通道 | 方向 | 用途 |
|------|------|------|
| `dialog:openDirectory` | 渲染→主 | 打开目录选择对话框 |
| `fs:scanDirectory` | 渲染→主 | 扫描目录中媒体文件 |
| `fs:readFile` | 渲染→主 | 读取文件返回 base64 |
| `api:fetch` | 渲染→主 | 代理外部 API 请求 |
| `chat:send` | 渲染→主 | ~~已废弃~~（原 OpenClaw 聊天，现改为通知面板） |
| `save:local` | 渲染→主 | 保存生成结果到本地（文档\NBC素材） |
| `save:oss` | 渲染→主 | 上传到 OSS staging（yukkio bucket） |
| `save:feishu` | 渲染→主 | 飞书同步队列（JSONL 文件） |
| `project:saveToFile` | 渲染→主 | 导出工作流为 .nbc.json |
| `project:loadFromFile` | 渲染→主 | 从 .nbc.json 导入工作流 |
| `shell:open` | 渲染→主 | 打开外部链接/文件 |

## 数据流

```
用户操作 → React 组件 → Zustand Store → API Client
                                          ↓
                              Vite 代理 (dev) 或 IPC (Electron)
                                          ↓
                              GrsAI / Ark / ComfyUI / OSS
                                          ↓
                              结果 → saveManager → 本地/OSS/飞书
                              结果 → useTimelineStore → 素材池 → 拖拽填坑
                              事件 → useNotificationStore → 通知面板
```

## Zustand Store 职责速查

| Store | 职责 |
|-------|------|
| `useFlowStore` | 画布节点/连线 CRUD、选择状态 |
| `useProjectStore` | 项目管理（创建/切换/重命名/删除/导入）、localStorage 持久化 |
| `useExecutionEngine` | 拓扑排序、prompt 模板变量收集、API 调用编排 |
| `useGenerationStore` | 生成任务队列、进度跟踪 |
| `useLogStore` | 失败日志记录、localStorage 持久化 |
| `useAssetStore` | 素材库状态（本地扫描 + OSS manifest） |
| `useProviderStore` | API Provider 配置 |
| `useWorkflowStore` | 工作流导入/导出 |
| `useNotificationStore` | Agent 通知面板（生成进度/失败/提醒） |
| `useTimelineStore` | 时间线分镜坑位管理 + 生成素材池 |

## 已实现功能

- ✅ 9 种节点类型（素材输入/角色卡/场景卡/剧本/提示词/GPT图像/Seedance/ComfyUI/输出）
- ✅ 项目管理（创建/切换/重命名/删除/导入/导出 .nbc.json）
- ✅ 工作流执行引擎（拓扑排序→API调用→结果收集）
- ✅ GPT Image 2（完整参数：比例/质量/参考图URL）
- ✅ Seedance 2.0（完整官方参数：模型/模式/分辨率/时长/推理/有声/尾帧/联网搜索）
- ✅ 三路保存（本地/OSS/飞书队列）
- ✅ 失败日志（自动记录+详情+导出）
- ✅ Agent 通知面板（生成进度/失败/坑位提醒，替代原聊天窗口）
- ✅ AI 提示词优化（上下文感知：读取上游角色卡/场景卡/剧本，LLM 优化后一键采用）
- ✅ 时间线分镜系统（坑位创建/编辑/从剧本导入、素材池拖拽填充、空坑标记）
- ✅ 素材库（本地文件夹扫描 + OSS manifest）
- ✅ nbc:// 自定义协议
- ✅ 角色卡数据（5个三角洲行动角色）
- ✅ 场景卡数据（6个场景）

## 待实现（按 PRD 优先级）

- Provider 插件体系（统一接口，动态注册）
- 自定义节点类型（用户基于 Provider 创建）
- 用户自定义 Endpoint/Key（多端点配置）
- OAuth2 授权流程接口
- Webhook 回调机制（异步生成平台适配）
- 时间线视频合并导出（依赖 ffmpeg）

## 注意事项

- 所有生成 API 调用走代理（Vite dev 或 Electron IPC），不要在前端直接暴露 API Key
- 飞书同步走队列文件（JSONL），由 OpenClaw Agent 定时消费，不是实时推送
- OSS 上传当前写入 staging 目录，实际上传需 OSS SDK 或 Python 脚本
- localStorage key 命名规范：`nbc_*` 前缀避免冲突
  - `nbc_timeline_{projectId}`：时间线坑位 + 素材池数据
- 节点 ID 格式：`{type}_{index}_{timestamp}`
