---
name: "material-local-classify"
description: "对 h:\\素材库\\素材 目录下的文件按规则自动分类（gpt*.jpg→output-p/、seedance*→output-v/、其余→input/）。调用本地 PowerShell 脚本执行。当用户需要整理素材库、分类本地文件、运行 classify.ps1 时使用。"
---

# 素材本地分类

对本地素材库 `h:\素材库\素材` 根目录下的文件按规则自动分类。

## 触发场景

- 用户要求整理/分类素材库中的文件
- 用户提到 "素材分类"、"整理素材"、"运行分类脚本"
- 用户需要将生成产物归类到 output-p/output-v/input 目录

## 执行方式

运行以下 PowerShell 命令：

```powershell
powershell -ExecutionPolicy Bypass -File "h:\素材库\素材\classify.ps1"
```

脚本路径: `h:\素材库\素材\classify.ps1`

## 分类规则

| 规则 | 条件 | 目标目录 |
|------|------|----------|
| 规则1 | 文件名以 `gpt` 开头 且 扩展名为 `.jpg` | `output-p/YYYY-MM-DD/` |
| 规则2 | 文件名以 `seedance` 开头 | `output-v/YYYY-MM-DD/` |
| 规则3 | 其余图片文件 (jpg/png/gif/bmp/webp/svg/tiff/ico/heic/heif) | `input/YYYY-MM-DD/image/` |
| 规则4 | 其余视频文件 (mp4/avi/mov/mkv/wmv/flv/webm/m4v/mpg/mpeg/ts/3gp) | `input/YYYY-MM-DD/video/` |
| 规则5 | 其余文件（音频等） | `input/YYYY-MM-DD/other/` |

- 日期取自文件的 `LastWriteTime`
- 已在正确位置的文件自动跳过
- 目标已存在同名文件时自动追加序号（`_1`, `_2` ...）
- 扫描范围排除 `output-p/`、`output-v/`、`input/` 已分类目录及脚本自身

## 输出

脚本执行完毕后输出汇总：
- 移动数量 (moved)
- 跳过数量 (skipped)
- 失败数量 (errors)

## 注意事项

- 脚本需要 PowerShell 执行权限
- 操作不可逆，移动后文件位置改变
- 若脚本报错，检查 `h:\素材库\素材` 目录是否存在
