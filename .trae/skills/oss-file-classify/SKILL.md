---
name: "oss-file-classify"
description: "对阿里云 OSS Bucket (yukkio) 中的文件按规则自动分类（gpt*.jpg→output-p/、seedance*→output-v/、其余→input/）。调用 Python 脚本通过 oss2 SDK 操作。当用户需要整理 OSS 文件、分类云端素材、运行 oss_classify 时使用。"
---

# OSS 文件分类

对阿里云 OSS Bucket `yukkio` 中的文件按规则自动分类。

## 触发场景

- 用户要求整理/分类 OSS Bucket 中的文件
- 用户提到 "OSS 分类"、"云端素材分类"、"整理 OSS"
- 用户需要将 OSS 中的生成产物归类到 output-p/output-v/input 目录

## OSS 连接信息

| 配置项 | 值 |
|--------|-----|
| Bucket | yukkio |
| Endpoint | oss-cn-shenzhen.aliyuncs.com |
| 地域 | 华南1（深圳） |
| 认证 | AccessKey 优先，失败则匿名访问 |

## 执行方式

```powershell
pip install oss2 -q
python "C:\Users\冬\AppData\Roaming\TRAE SOLO\ModularData\ai-agent\work-mode-projects\6a088f2d5fc7334f7e0171b4\oss_classify.py"
```

脚本路径: `C:\Users\冬\AppData\Roaming\TRAE SOLO\ModularData\ai-agent\work-mode-projects\6a088f2d5fc7334f7e0171b4\oss_classify.py`

## 分类规则

| 规则 | 条件 | 目标路径 |
|------|------|----------|
| 规则1 | 文件名以 `gpt` 开头（不区分大小写）且以 `.jpg` 结尾 | `output-p/YYYY-MM-DD/` |
| 规则2 | 文件名以 `seedance` 开头（不区分大小写） | `output-v/YYYY-MM-DD/` |
| 规则3 | 其余图片文件 | `input/YYYY-MM-DD/image/` |
| 规则4 | 其余视频文件 (mp4/avi/mov/mkv/wmv/flv/webm/m4v/3gp/ts/rmvb/rm/ogv/vob/asf/f4v/m2ts/divx) | `input/YYYY-MM-DD/video/` |

- 日期取自文件上传时间 `LastModified`
- 已在正确路径的文件自动跳过
- 排除 `output-p/`、`output-v/`、`input/` 已分类目录
- 移动方式：先 `copy_object` 再 `delete_object`
- 为避免日志过长，仅打印前 50 条移动明细

## 输出

脚本执行完毕后输出汇总：
- 扫描总数
- 已移动数量
- 已跳过数量
- 错误明细（如有）

## 注意事项

- 依赖 `oss2` 库，运行前需确保已安装（`pip install oss2`）
- 若 AccessKey 认证失败会自动降级为匿名访问（Bucket 须为公共读写）
- 操作不可逆（移动后原路径文件被删除）
- 若脚本报错，先检查 `oss2` 安装状态并重试
