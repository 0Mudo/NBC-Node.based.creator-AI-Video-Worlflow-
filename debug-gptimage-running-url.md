# Debug Session: gptimage-running-url

Status: OPEN

## Symptom
- GPT 图像节点报错：生成成功但未返回图像链接
- 当前错误样本显示首个生成响应为 `status=running`、`results=null`、`url=""`

## Hypotheses
- H1: `generateGPTImage*` 主入口在 `status=running` 时没有真正进入轮询分支。
- H2: 已进入轮询，但 `buildResultEndpoint(requestUrl)` 生成了错误的结果查询地址。
- H3: 已轮询到结果，但结果响应结构与当前 URL 提取逻辑不匹配，导致 `url` 仍为空。
- H4: `generatorRegistry` 或其他调用层在轮询完成前，提前按同步结果处理并抛错。
- H5: 运行时仍使用旧的 provider 配置或旧端点，导致实际请求链路与代码预期不一致。

## Plan
- 读取官方文档与当前调用链代码，确认生成/查询接口规范。
- 仅添加调试埋点，记录生成请求、轮询分支命中、结果地址与最终返回值。
- 基于运行时证据定位根因后，再做最小修复。

## Evidence
- 已在 `src/api/gptImage2.ts` 增加入口、提交响应、`running` 分支、轮询入口、轮询响应、成功无 URL、失败分支埋点。
- 已在 `src/engine/generatorRegistry.ts` 增加最终 `no-url` 抛错前埋点。
- 本地调试收集器已启动：`http://127.0.0.1:7777`
- 日志文件：`.dbg/trae-debug-log-gptimage-running-url.ndjson`
- 运行时证据显示实际请求仍打到旧端点 `https://grsai.dakka.com.cn/v1/draw/completions`。
- 运行时证据显示提交响应是 SSE 多事件流：前面多条 `running`，同一响应内最后一条已是 `succeeded` 且带图片 URL。
- 旧逻辑在 `parseResponse()` 后虽已拿到最后成功结果，但又继续落到最终 `return parseResponse(res.body)`，导致上层拿到数组首项 `running`。
- 修复后新症状变为 `HTTP 400 ... image upload failed, please check the image`。
- 新一轮运行时证据显示提交到 `https://grsai.dakka.com.cn/v1/api/generate` 时携带了 1 张 `https` 参考图，而不是 `data:`。
- 结合服务端错误可确认：当前外链参考图对 GrsAI 服务端不可抓取，需改为本地转 base64 后再提交。
- 已按用户要求回退“参考图优先转 base64 再提交”这单次修改，保留其余已验证修复。
- 新问题证据：用户提供请求里 `aspectRatio` 为 `4096x4096`，服务端返回 `status=violation` 和 `Invalid size, please check the size`。
- 官方文档 `grs.md` 显示 `1:1` 的合法示例尺寸为 `1024x1024`、`2048x2048`、`2880x2880`，并不存在 `4096x4096`。

## Fix
- 新增 `normalizeParsedResults()`：对多事件响应优先返回最后一个带 URL 的成功事件，否则返回最后状态事件。
- 在 `generateGPTImageStream()` 的 preliminary 分支中，若 SSE 已包含最终成功 URL，直接返回归一化结果，不再落到最终 fallback。
- 最终 fallback 也改为返回归一化结果，避免上层取到数组首项 `running`。
- 新增旧端点自动迁移：`/v1/draw/completions -> /v1/api/generate`。
- 新增尺寸归一化：若传入像素尺寸不在官方支持列表内，则按相同比例匹配最近合法尺寸；`4096x4096` 会归一为 `2880x2880`。
- 修正节点检查器中的错误 4K 选项：`4096x4096 -> 2880x2880`。
