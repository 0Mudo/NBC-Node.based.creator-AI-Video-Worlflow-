***

title: 默认模块
language\_tabs:

- shell: Shell
- http: HTTP
- javascript: JavaScript
- ruby: Ruby
- python: Python
- php: PHP
- java: Java
- go: Go
  toc\_footers: \[]
  includes: \[]
  search: true
  code\_clipboard: true
  highlight\_theme: darkula
  headingLevel: 2
  generator: "@tarslib/widdershins v4.0.30"

***

# 默认模块

Base URLs:

# Authentication

# Grsai图片/视频生成接口

## POST gpt-image-2接口

POST /v1/api/generate

基础节点：
<https://grsaiapi.com>                (全球节点)
<https://grsai.dakka.com.cn>     (国内节点)

例子：
<https://grsaiapi.com/v1/api/generate>
<https://grsai.dakka.com.cn/v1/api/generate>

> Body 请求参数

```json
{
    "model": "gpt-image-2",
    "prompt": "生成一张边牧与古牧正在抖音直播间直播带货截图",
    "images": [],
    "aspectRatio": "1024x1024",
    "replyType": "json"
}
```

### 请求参数

| 名称            | 位置     | 类型        | 必选 | 中文名    | 说明                                                       |
| ------------- | ------ | --------- | -- | ------ | -------------------------------------------------------- |
| base\_url     | path   | string    | 是  | <br /> | none                                                     |
| Authorization | header | string    | 否  | <br /> | 请前往以下页面获取APIKEY：<https://grsai.ai/zh/dashboard/api-keys> |
| body          | body   | object    | 是  | <br /> | none                                                     |
| » model       | body   | string    | 是  | 模型名称   | 支持以下模型                                                   |
| » prompt      | body   | string    | 是  | 提示词    | none                                                     |
| » images      | body   | \[string] | 否  | 参考图    | 支持base64与url链接                                           |
| » aspectRatio | body   | string    | 否  | 比例     | gpt-image-2                                              |
| » replyType   | body   | string    | 否  | 回复类型   | 支持参数                                                     |

#### 详细说明

**» model**: 支持以下模型
gpt-image-2
gpt-image-2-vip

**» aspectRatio**: gpt-image-2
gpt-image-2-vip
「比例像素」对照表
API调用需要通过aspectRatio填入参数“例如："1024x1024"，以下尺寸可直接复制使用。
仅gpt-image-2-vip支持2K、4K尺寸

输入像素比例并没有限制，可根据官网支持的像素比进行输入。

以下是示例比例 1K 2K 4K
1:1
1024x1024
2048x2048
2880x2880

16:9
1774x887
2048x1152
3840x2160

9:16
887x1774
1152x2048
2160x3840

3:2
1536x1024
2048x1360
3504x2336

2:3
1024x1536
1360x2048
2336x3504

21:9
2048x880
3840x1648

9:21
880x2048
1648x3840

1:3
688x2048
1280x3840

3:1
2048x688
3840x1280

2:1
2048x1024
3840x1920

1:2
1024x2048
1920x3840

**» replyType**: 支持参数
json（返回json）
stream（返回stream）
async（异步轮询）
异步生成结果查询接口：<https://qmy27nhsd9.apifox.cn/452409577e0>

> 返回示例

> 200 Response

```json
{
    "id": "14-5f3cf761-a4bb-486a-8016-77f490998f80",
    "status": "succeeded",
    "results": [
        {
            "url": "https://file1.aitohumanize.com/file/fcdd2d07449d438d9d69d450f5626976.png"
        }
    ]
}
```

> 400 Response

```json
{
    "id": "12-1f771fbf-f23a-4b89-a7d0-a98ba9862edb",
    "status": "failed",
    "error": "generate failed"
}
```

### 返回结果

| 状态码 | 状态码含义                                                            | 说明   | 数据模型   |
| --- | ---------------------------------------------------------------- | ---- | ------ |
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)          | none | Inline |
| 400 | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称         | 类型        | 必选    | 约束   | 中文名     | 说明                                                             |
| ---------- | --------- | ----- | ---- | ------- | -------------------------------------------------------------- |
| » id       | string    | true  | none | 任务id    | none                                                           |
| » status   | string    | true  | none | 状态      | 任务状态running  (进行中)violation  (违规)succeeded (生成成功)failed (任务失败) |
| » progress | integer   | false | none | 进度      | 0\~100                                                         |
| » results  | \[object] | false | none | <br />  | none                                                           |
| »» url     | string    | false | none | 图片/视频链接 | none                                                           |
| » error    | string    | false | none | 报错信息    | none                                                           |

状态码 **400**

| 名称       | 类型     | 必选   | 约束   | 中文名    | 说明                        |
| -------- | ------ | ---- | ---- | ------ | ------------------------- |
| » id     | string | true | none | <br /> | none                      |
| » status | string | true | none | 状态     | 状态violation（违规）failed（失败） |
| » error  | string | true | none | 报错信息   | none                      |

## GET 异步生成结果查询接口

GET /v1/api/result

基础节点：
<https://grsaiapi.com>                (全球节点)
<https://grsai.dakka.com.cn>     (国内节点)

例子：
<https://grsaiapi.com/v1/api/result>
<https://grsai.dakka.com.cn/v1/api/result>

### 请求参数

| 名称            | 位置     | 类型     | 必选 | 中文名    | 说明                                                       |
| ------------- | ------ | ------ | -- | ------ | -------------------------------------------------------- |
| base\_url     | path   | string | 是  | <br /> | none                                                     |
| id            | query  | string | 否  | <br /> | none                                                     |
| Authorization | header | string | 否  | <br /> | 请前往以下页面获取APIKEY：<https://grsai.ai/zh/dashboard/api-keys> |

> 返回示例

> 200 Response

```json
{
    "id": "14-5f3cf761-a4bb-486a-8016-77f490998f80",
    "status": "succeeded",
    "results": [
        {
            "url": "https://file1.aitohumanize.com/file/fcdd2d07449d438d9d69d450f5626976.png"
        }
    ]
}
```

> 400 Response

```json
{
    "id": "12-1f771fbf-f23a-4b89-a7d0-a98ba9862edb",
    "status": "failed",
    "error": "generate failed"
}
```

### 返回结果

| 状态码 | 状态码含义                                                            | 说明   | 数据模型   |
| --- | ---------------------------------------------------------------- | ---- | ------ |
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)          | none | Inline |
| 400 | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称         | 类型        | 必选    | 约束   | 中文名     | 说明                                                             |
| ---------- | --------- | ----- | ---- | ------- | -------------------------------------------------------------- |
| » id       | string    | true  | none | 任务id    | none                                                           |
| » status   | string    | true  | none | 状态      | 任务状态running  (进行中)violation  (违规)succeeded (生成成功)failed (任务失败) |
| » progress | integer   | false | none | 进度      | 0\~100                                                         |
| » results  | \[object] | false | none | <br />  | none                                                           |
| »» url     | string    | false | none | 图片/视频链接 | none                                                           |
| » error    | string    | false | none | 报错信息    | none                                                           |

状态码 **400**

| 名称       | 类型     | 必选   | 约束   | 中文名    | 说明                        |
| -------- | ------ | ---- | ---- | ------ | ------------------------- |
| » id     | string | true | none | <br /> | none                      |
| » status | string | true | none | 状态     | 状态violation（违规）failed（失败） |
| » error  | string | true | none | 报错信息   | none                      |

# openai-completions接口

## POST /v1/chat/completions

POST /v1/chat/completions

基础节点：
<https://grsaiapi.com>                (全球节点)
<https://grsai.dakka.com.cn>     (国内节点)

例子：
<https://grsaiapi.com/v1/chat/completions>
<https://grsai.dakka.com.cn/v1/chat/completions>

> Body 请求参数

```json
{
    "model": "gemini-3.1-pro",
    "stream": false,
    "messages": [
        {
            "role": "user",
            "content": "你好"
        }
    ]
}
```

```json
{
    "model": "gemini-3.1-pro",
    "stream": false,
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "这张图片内容是什么"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://xxxxxxx.png"
                    }
                }
            ]
        }
    ]
}
```

### 请求参数

| 名称            | 位置     | 类型        | 必选 | 中文名     | 说明                                                       |
| ------------- | ------ | --------- | -- | ------- | -------------------------------------------------------- |
| base\_url     | path   | string    | 是  | <br />  | none                                                     |
| Authorization | header | string    | 否  | <br />  | 请前往以下页面获取APIKEY：<https://grsai.ai/zh/dashboard/api-keys> |
| body          | body   | object    | 是  | <br />  | none                                                     |
| » model       | body   | string    | 是  | 模型名称    | 支持所有模型                                                   |
| » stream      | body   | boolean   | 是  | stream流 | none                                                     |
| » messages    | body   | \[object] | 是  | <br />  | none                                                     |
| »» role       | body   | string    | 否  | user    | none                                                     |
| »» content    | body   | string    | 否  | 提示词内容   | none                                                     |

> 返回示例

> 200 Response

```json
{
    "id": "1-2ede12b5-77cc-48f9-b1d0-7ae35ee8d444",
    "object": "",
    "created": 1777897048,
    "model": "gemini-3.1-pro",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "你好！请问有什么我可以帮您的吗？"
            },
            "finish_reason": "stop",
            "content_filter_results": {
                "hate": {
                    "filtered": false
                },
                "self_harm": {
                    "filtered": false
                },
                "sexual": {
                    "filtered": false
                },
                "violence": {
                    "filtered": false
                },
                "jailbreak": {
                    "filtered": false,
                    "detected": false
                },
                "profanity": {
                    "filtered": false,
                    "detected": false
                }
            }
        }
    ],
    "usage": {
        "prompt_tokens": 2,
        "completion_tokens": 261,
        "total_tokens": 263,
        "prompt_tokens_details": null,
        "completion_tokens_details": null
    },
    "system_fingerprint": ""
}
```

> 400 Response

```json
{
    "error": {
        "message": "generation failed"
    }
}
```

### 返回结果

| 状态码 | 状态码含义                                                            | 说明   | 数据模型   |
| --- | ---------------------------------------------------------------- | ---- | ------ |
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)          | none | Inline |
| 400 | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称                             | 类型        | 必选    | 约束   | 中文名    | 说明   |
| ------------------------------ | --------- | ----- | ---- | ------ | ---- |
| » id                           | string    | true  | none | <br /> | none |
| » object                       | string    | true  | none | <br /> | none |
| » created                      | integer   | true  | none | <br /> | none |
| » model                        | string    | true  | none | <br /> | none |
| » choices                      | \[object] | true  | none | <br /> | none |
| »» index                       | integer   | false | none | <br /> | none |
| »» message                     | object    | false | none | <br /> | none |
| »»» role                       | string    | true  | none | <br /> | none |
| »»» content                    | string    | true  | none | <br /> | none |
| »» finish\_reason              | string    | false | none | <br /> | none |
| »» content\_filter\_results    | object    | false | none | <br /> | none |
| »»» hate                       | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»» self\_harm                 | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»» sexual                     | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»» violence                   | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»» jailbreak                  | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»»» detected                  | boolean   | true  | none | <br /> | none |
| »»» profanity                  | object    | true  | none | <br /> | none |
| »»»» filtered                  | boolean   | true  | none | <br /> | none |
| »»»» detected                  | boolean   | true  | none | <br /> | none |
| » usage                        | object    | true  | none | <br /> | none |
| »» prompt\_tokens              | integer   | true  | none | <br /> | none |
| »» completion\_tokens          | integer   | true  | none | <br /> | none |
| »» total\_tokens               | integer   | true  | none | <br /> | none |
| »» prompt\_tokens\_details     | null      | true  | none | <br /> | none |
| »» completion\_tokens\_details | null      | true  | none | <br /> | none |
| » system\_fingerprint          | string    | true  | none | <br /> | none |

状态码 **400**

| 名称         | 类型     | 必选   | 约束   | 中文名    | 说明   |
| ---------- | ------ | ---- | ---- | ------ | ---- |
| » error    | object | true | none | <br /> | none |
| »» message | string | true | none | 报错信息   | none |

# openai-generations接口

## POST /v1/images/generations

POST /v1/images/generations

基础节点：
<https://grsaiapi.com>                (全球节点)
<https://grsai.dakka.com.cn>     (国内节点)

例子：
<https://grsaiapi.com/v1/images/generations>
<https://grsai.dakka.com.cn/v1/images/generations>

> Body 请求参数

```json
{
    "model": "gpt-image-2",
    "prompt": "生成一张边牧与古牧正在抖音直播间直播带货截图",
    "image": [],
    "size": "1024x1024",
    "response_format": "url"
}
```

### 请求参数

| 名称                 | 位置     | 类型        | 必选 | 中文名    | 说明                                                       |
| ------------------ | ------ | --------- | -- | ------ | -------------------------------------------------------- |
| base\_url          | path   | string    | 是  | <br /> | none                                                     |
| Authorization      | header | string    | 否  | <br /> | 请前往以下页面获取APIKEY：<https://grsai.ai/zh/dashboard/api-keys> |
| body               | body   | object    | 是  | <br /> | none                                                     |
| » model            | body   | string    | 是  | 模型名称   | 支持所有图片生成模型                                               |
| » prompt           | body   | string    | 是  | 提示词    | none                                                     |
| » image            | body   | \[string] | 否  | 参考图    | 支持base64与url链接                                           |
| » size             | body   | string    | 否  | 比例     | gpt-image-2                                              |
| » response\_format | body   | string    | 否  | <br /> | none                                                     |

#### 详细说明

**» size**: gpt-image-2
gpt-image-2-vip
「比例像素」对照表
API调用需要通过aspectRatio填入参数“例如："1024x1024"，以下尺寸可直接复制使用。
仅gpt-image-2-vip支持2K、4K尺寸

输入像素比例并没有限制，可根据官网支持的像素比进行输入。

以下是示例比例 1K 2K 4K
1:1
1024x1024
2048x2048
2880x2880

16:9
1774x887
2048x1152
3840x2160

9:16
887x1774
1152x2048
2160x3840

3:2
1536x1024
2048x1360
3504x2336

2:3
1024x1536
1360x2048
2336x3504

21:9
2048x880
3840x1648

9:21
880x2048
1648x3840

1:3
688x2048
1280x3840

3:1
2048x688
3840x1280

2:1
2048x1024
3840x1920

1:2
1024x2048
1920x3840

> 返回示例

> 200 Response

```json
{
    "created": 1777689832,
    "data": [
        {
            "url": "https://file4.aitohumanize.com/file/dfa13fe60e7649e88f46037b968b54a3.png"
        }
    ],
    "usage": {
        "total_tokens": 6267,
        "input_tokens": 17,
        "output_tokens": 6250,
        "input_tokens_details": {}
    }
}
```

> 400 Response

```json
{
    "error": {
        "message": "generation failed"
    }
}
```

### 返回结果

| 状态码 | 状态码含义                                                            | 说明   | 数据模型   |
| --- | ---------------------------------------------------------------- | ---- | ------ |
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)          | none | Inline |
| 400 | [Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称                        | 类型        | 必选    | 约束   | 中文名    | 说明   |
| ------------------------- | --------- | ----- | ---- | ------ | ---- |
| » created                 | integer   | true  | none | <br /> | none |
| » data                    | \[object] | true  | none | <br /> | none |
| »» url                    | string    | false | none | <br /> | none |
| » usage                   | object    | true  | none | <br /> | none |
| »» total\_tokens          | integer   | true  | none | <br /> | none |
| »» input\_tokens          | integer   | true  | none | <br /> | none |
| »» output\_tokens         | integer   | true  | none | <br /> | none |
| »» input\_tokens\_details | object    | true  | none | <br /> | none |

状态码 **400**

| 名称         | 类型     | 必选   | 约束   | 中文名    | 说明   |
| ---------- | ------ | ---- | ---- | ------ | ---- |
| » error    | object | true | none | <br /> | none |
| »» message | string | true | none | 报错信息   | none |

# 数据模型
