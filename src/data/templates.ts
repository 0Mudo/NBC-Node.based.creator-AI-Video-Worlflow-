export const basicTemplate = {
  nodes: [
    {
      id: 'char_1',
      type: 'characterCard',
      position: { x: 100, y: 100 },
      data: { label: '主角', characterName: '蜂医', characterAppearance: '短发，穿战术背心' }
    },
    {
      id: 'scene_1',
      type: 'sceneCard',
      position: { x: 100, y: 300 },
      data: { label: '主场景', sceneName: '巴别塔', sceneDescription: '高科技控制室，冷色调' }
    },
    {
      id: 'prompt_1',
      type: 'prompt',
      position: { x: 400, y: 200 },
      data: { label: '分镜提示词', promptText: '{{character}} 站在 {{scene}} 中，{{characterAppearance}}，环境是 {{sceneDescription}}。' }
    },
    {
      id: 'img_1',
      type: 'gptImage2',
      position: { x: 700, y: 200 },
      data: { label: '生成画面', gptImageQuality: 'high', gptImageAspectRatio: '16:9' }
    },
    {
      id: 'out_1',
      type: 'output',
      position: { x: 1000, y: 200 },
      data: { label: '输出结果', outputSaveLocal: true }
    }
  ],
  edges: [
    { id: 'e1', source: 'char_1', target: 'prompt_1' },
    { id: 'e2', source: 'scene_1', target: 'prompt_1' },
    { id: 'e3', source: 'prompt_1', target: 'img_1' },
    { id: 'e4', source: 'img_1', target: 'out_1' }
  ]
};

export const videoTemplate = {
  nodes: [
    ...basicTemplate.nodes,
    {
      id: 'vid_1',
      type: 'seedance',
      position: { x: 1000, y: 400 },
      data: { label: '视频生成', seedanceDuration: 5, seedanceMode: 'image-to-video' }
    },
    {
      id: 'out_2',
      type: 'output',
      position: { x: 1300, y: 400 },
      data: { label: '输出视频', outputSaveLocal: true }
    }
  ],
  edges: [
    ...basicTemplate.edges,
    { id: 'e5', source: 'img_1', target: 'vid_1' },
    { id: 'e6', source: 'vid_1', target: 'out_2' }
  ]
};

export const fullTemplate = {
  nodes: [
    {
      id: 'script_1',
      type: 'script',
      position: { x: 100, y: 50 },
      data: { label: '剧本分镜', scriptText: '镜头1：蜂医从巴别塔高处跃下 8秒 淡入淡出' }
    },
    ...videoTemplate.nodes,
    {
      id: 'asset_1',
      type: 'assetInput',
      position: { x: 700, y: 50 },
      data: { label: '参考图' }
    }
  ],
  edges: [
    ...videoTemplate.edges,
    { id: 'e7', source: 'script_1', target: 'prompt_1' },
    { id: 'e8', source: 'asset_1', target: 'img_1' }
  ]
};
