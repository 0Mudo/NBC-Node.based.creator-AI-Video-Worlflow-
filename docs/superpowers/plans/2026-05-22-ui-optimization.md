# NBC UI 优化实施计划

> **目标：** 保留所有现有功能和逻辑，全面提升 NBC 节点式素材创作器的 UI 设计品质。

**架构：** 纯 UI 层优化，不改动任何 Zustand Store、API 调用、业务逻辑。主要修改 index.css、MainLayout.tsx 和部分组件文件。

**技术栈：** React 18 + TypeScript + TailwindCSS 3 + ReactFlow 11 + rc-dock + Radix UI + Lucide React

---

## 设计方向

在现有 "Noir Studio" 暗黑电影美学基础上进一步深化：
- **色彩**：保持琥珀金/暖铜色的主色调，增强渐变层次和发光效果
- **布局**：工具栏增加玻璃拟态效果，面板增加阴影层次  
- **动效**：增强微交互，添加更多 staggered 动画和过渡效果
- **类型**：利用现有 Playfair Display + DM Sans 字体搭配，增强排版层次
- **氛围**：增加 subtle 渐变背景、边框发光效果、深度阴影

---

### Task 1: 优化全局 CSS 设计系统

**文件:** `src/index.css`

**变更内容:**
1. 增强 CSS 自定义属性（新增渐变色彩变量、更丰富的阴影层次）
2. 优化面板 card 样式（增加 hover 发光效果）
3. 添加新的 utility class（gradient text、glass panel、glow border）
4. 增强动画系统（新增几种微交互动画）
5. 优化滚动条样式

---

### Task 2: 优化 MainLayout 顶部工具栏

**文件:** `src/components/layout/MainLayout.tsx`

**变更内容:**
1. 工具栏增加玻璃拟态半透明效果 + 底部渐变边框
2. Logo 区域增加渐变光晕
3. 按钮增加 tooltip（利用现成的 Radix Tooltip）
4. 按钮悬停效果增强

---

### Task 3: 优化 rc-dock 面板标签页样式

**文件:** `src/index.css`（rc-dock 主题部分）

**变更内容:**
1. Tab 激活态增强（渐变下划线更明显）
2. Tab hover 态增加背景色过渡
3. 面板阴影增强
4. 分隔线拖拽时增加视觉反馈

---

### Task 4: 优化 FlowEditor 画布工具栏

**文件:** `src/components/node-editor/FlowEditor.tsx`

**变更内容:**
1. 工具栏增加玻璃拟态效果
2. 按钮组增加视觉分组（圆角容器包裹）
3. 运行按钮增加脉冲动画提示
4. 保存状态指示器增强

---

### Task 5: 优化 NodePalette 节点面板

**文件:** `src/components/node-editor/NodePalette.tsx`

**变更内容:**
1. 节点项增加图标 + 颜色渐变指示器
2. 分类折叠增加展开/收起动画
3. 拖拽预览效果增强
4. 搜索/筛选功能视觉优化

---

### Task 6: 优化节点卡片

**文件:** `src/nodes/shared.tsx`、`src/index.css`（node 部分）

**变更内容:**
1. 节点选中态增加更明显的发光边框
2. NodeResizer 手柄样式优化
3. 内容预览缩略图圆角优化
4. 运行状态动画更流畅

---

### Task 7: 统一 Modal 弹窗样式

**文件:** `src/components/layout/MainLayout.tsx`

**变更内容:**
1. Export/Analytics/PromptLibrary 弹窗使用统一的 Modal 组件
2. 增加入场/退场动画
3. 统一 header 样式

---

### Task 8: 优化设置面板

**文件:** `src/components/settings/SettingsPanel.tsx`

**变更内容:**
1. Provider 卡片增加 hover 效果
2. 表单元素视觉优化
3. 分组标题样式增强

---

### Task 9: 性能优化

**文件:** `src/components/layout/MainLayout.tsx`

**变更内容:**
1. Modal 组件使用 lazy loading
2. 事件监听器使用 passive
3. memo 优化必要组件

---

## 执行顺序

1. Task 1 (CSS 基础) → 2. Task 3 (rc-dock 样式) → 3. Task 4 (FlowEditor) → 4. Task 5 (NodePalette) → 5. Task 6 (节点卡片) → 6. Task 2 (MainLayout 工具栏) → 7. Task 7 (Modal 统一) → 8. Task 8 (设置面板) → 9. Task 9 (性能)
