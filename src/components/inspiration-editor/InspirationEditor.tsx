import React, { useState, useRef, useEffect } from 'react'
import { useInspirationStore, InspirationCategory } from '@/store/useInspirationStore'
import { askInspirationAgent } from '@/api/inspirationAgent'
import { Send, Bot, User, Trash2, FileText, LayoutTemplate, Users, Image as ImageIcon, Box, History, Save, RotateCcw, Clock, ArrowRight, ArrowLeft, Wand2, Upload as UploadIcon, Download, Loader2, Play, Copy, Plus, MessageSquare, X, ToggleLeft, ToggleRight, Split } from 'lucide-react'
import DiffTextarea from './DiffTextarea'
import AssetSelectModal from './AssetSelectModal'
import AssetImagePicker from './AssetImagePicker'
import CharacterProfileForm from './CharacterProfileForm'
import SceneProfileForm from './SceneProfileForm'
import ItemProfileForm from './ItemProfileForm'
import ScriptSceneEditor from './ScriptSceneEditor'
import StoryboardShotEditor from './StoryboardShotEditor'
import { useAssetStore } from '@/store/useAssetStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useLogStore } from '@/store/useLogStore'
import type { GenerationTask } from '@/types/generation'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useProviderStore } from '@/store/useProviderStore'
import { useProjectStore } from '@/store/useProjectStore'
import { generateGPTImageStream, pollGPTImageResult, sanitizeUrl, buildResultEndpoint } from '@/api/gptImage2'
import { saveLocalViaElectron } from '@/api/saveManager'
import type { Asset, AssetTag } from '@/types/asset'
import type { CharacterProfile, SceneProfile, ItemProfile, ScriptScene, ScriptDialogue, StoryboardShot } from '@/types/inspiration'

const STEPS = [
  { id: 'script', label: '第1步：剧本', icon: <FileText size={16} />, categories: ['script'] as InspirationCategory[] },
  { id: 'storyboard', label: '第2步：分镜', icon: <LayoutTemplate size={16} />, categories: ['storyboard'] as InspirationCategory[] },
  { id: 'cards', label: '第3步：三卡', icon: <Users size={16} />, categories: ['character', 'scene', 'item'] as InspirationCategory[] }
]

const SUB_TABS: { id: InspirationCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'character', label: '角色卡', icon: <Users size={14} /> },
  { id: 'scene', label: '场景卡', icon: <ImageIcon size={14} /> },
  { id: 'item', label: '物品卡', icon: <Box size={14} /> }
]

export default function InspirationEditor() {
  const { 
    activeCategory, autoSaveInterval, chatHistory, sessions,
    setActiveCategory, setActiveItem, setContent, setPreviousContent, setImages, addMessage, 
    clearHistory, newConversation, switchConversation, deleteConversation,
    saveVersion, restoreVersion, deleteVersion, createBlankCard,
    setAutoSaveInterval, onAIGenerate, getActiveData,
    setCharacterProfile, setSceneProfile, setItemProfile, setScriptScenes, setStoryboardShots
  } = useInspirationStore()
  
  const data = getActiveData(activeCategory)
  const versions = [...(data.versions || [])].sort((a, b) => b.timestamp - a.timestamp)
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ total: 0, current: 0 })
  const [showHistory, setShowHistory] = useState(false)
  const [showSessionHistory, setShowSessionHistory] = useState(false)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const sessionHistoryRef = useRef<HTMLDivElement>(null)
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [bindImageModalOpen, setBindImageModalOpen] = useState(false)
  const [bindImageTarget, setBindImageTarget] = useState<'ref' | 'generated'>('ref')
  const [chatWidth, setChatWidth] = useState(320)
  const [editMode, setEditMode] = useState<'free' | 'structured'>('free')
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const isDragging = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(320)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startXRef.current = e.clientX
    startWidthRef.current = chatWidth
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const delta = startXRef.current - e.clientX
    const newWidth = Math.max(250, Math.min(800, startWidthRef.current + delta))
    setChatWidth(newWidth)
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Auto-save effect
  useEffect(() => {
    if (autoSaveInterval <= 0) return
    const timer = setInterval(() => {
      saveVersion(activeCategory, true)
    }, autoSaveInterval * 60 * 1000)
    return () => clearInterval(timer)
  }, [activeCategory, autoSaveInterval])

  // Auto-refresh when project changes
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  useEffect(() => {
    // Force re-read of data for current category — the store key depends on projectId
    const fresh = getActiveData(activeCategory)
    if (fresh) {
      setContent(activeCategory, fresh.content || '')
      setPreviousContent(activeCategory, fresh.previousContent || '')
    }
    // Reset to free-text mode so structured form re-initializes with new project data
    setEditMode('free')
  }, [activeProjectId])

  // Auto-populate card profile from content when switching to structured mode
  useEffect(() => {
    if (editMode !== 'structured') return
    if (activeCategory !== 'character' && activeCategory !== 'scene' && activeCategory !== 'item') return
    doParseCardProfile()
  }, [editMode, activeCategory])

  const doParseCardProfile = () => {
    if (activeCategory === 'character' && !data.characterProfile && data.content.trim()) {
      setCharacterProfile(buildCharacterProfile(data.content))
    }
    if (activeCategory === 'scene' && !data.sceneProfile && data.content.trim()) {
      setSceneProfile(buildSceneProfile(data.content))
    }
    if (activeCategory === 'item' && !data.itemProfile && data.content.trim()) {
      setItemProfile(buildItemProfile(data.content))
    }
  }

  // Click outside to close session history dropdown
  useEffect(() => {
    if (!showSessionHistory) return
    const handler = (e: MouseEvent) => {
      if (sessionHistoryRef.current && !sessionHistoryRef.current.contains(e.target as Node)) {
        setShowSessionHistory(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSessionHistory])

  const saveCharacterImageToAssets = async (generatedImageUrl: string, promptText: string, cardAssetId: string) => {
    const { assets, setAssets } = useAssetStore.getState()
    const activeProjectId = useProjectStore.getState().activeProjectId
    const newId = `img_${Date.now()}`
    const firstLine = promptText.split('\n')[0].replace(/^[#*\s]+/, '').trim()
    const name = (firstLine ? firstLine.substring(0, 15) : `新建角色图`) + '_参考表.png'

    let localPath = generatedImageUrl
    if (window.electronAPI) {
      try {
        const resp = await fetch(generatedImageUrl)
        const blob = await resp.blob()
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        const savedPath = await saveLocalViaElectron(generatedImageUrl, name, base64)
        if (savedPath) {
          localPath = `nbc://assets/${encodeURIComponent(name)}?path=${encodeURIComponent(savedPath)}`
        }
      } catch (e) { console.error('Save image to local failed:', e) }
    }

    const newAsset: Asset = {
      id: newId,
      name,
      type: 'image',
      path: localPath,
      prompt: promptText,
      tags: ['Character', 'GPT Image'],
      createdAt: new Date().toISOString(),
      thumbnailPath: localPath,
      projectId: activeProjectId || undefined
    }

    // Bind thumbnail to card asset, or auto-create card if missing
    const existingCard = assets.find(a => a.id === cardAssetId)
    if (existingCard) {
      const updated = assets.map(a =>
        a.id === cardAssetId ? { ...a, thumbnailPath: localPath } : a
      )
      setAssets([...updated, newAsset])
    } else if (promptText.trim() && !cardAssetId.startsWith('template_')) {
      // Auto-create a text card in the asset store so the image is bound
      const textCardId = cardAssetId.startsWith('default_')
        ? `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : cardAssetId
      const textCard: Asset = {
        id: textCardId,
        name,
        type: 'text',
        path: `local://text-card/${textCardId}`,
        prompt: promptText,
        tags: ['Character', 'GPT Image'],
        createdAt: new Date().toISOString(),
        thumbnailPath: localPath,
        projectId: activeProjectId || undefined
      }
      setAssets([...assets, textCard, newAsset])
    } else {
      setAssets([...assets, newAsset])
    }

    return { localPath, name }
  }

  const handleGenerateImage = async () => {
    const dataToGen = getActiveData('character')
    if (!dataToGen.content.trim()) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无法生成',
        message: '当前卡片内容为空，请输入内容后再生成图像。'
      })
      return
    }

    const provider = useProviderStore.getState().getProvider('gptImage2')
    const endpoint = provider?.endpoints[0]
    if (!endpoint?.apiKey) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '未配置 API Key',
        message: '请先在设置中配置 GPT Image 2 的 API Key。'
      })
      return
    }

    const apiKey = endpoint.apiKey
    const endpointUrl = sanitizeUrl(endpoint.url)
    const resultEndpoint = buildResultEndpoint(endpointUrl)

    setGeneratingImage(true)
    
    const taskId = `gen_char_${Date.now()}`
    const task: GenerationTask = {
      id: taskId,
      nodeId: dataToGen.id,
      type: 'gptImage2',
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      abortController: new AbortController()
    }
    useGenerationStore.getState().addTask(task)
    useGenerationStore.getState().setProcessing(true)
    
    const basePrompt = `专业完整角色参考表，纯白色无缝背景上干净整洁的网格布局，该表包括：主全身体态转面图（正面、3/4 视角、侧面、背面），左侧有主体身份+比例尺（最大），右上角有6-8 色调色板，8 帧情绪进阶，5 帧微表情，多角度头部细节表，中性站姿，姿态变化，1 张特写，底部一排为服装和配饰特写细节（头发质地、外套面料、鞋子、配饰细节），多种手势参考，角色轮廓指南。所有画面中人物的脸部和身体比例一致，完美布局对齐。`
    let finalPrompt = ''
    
    try {
      const urls: string[] = []
      
      if (dataToGen.refImage) {
        finalPrompt = `为图1生成${basePrompt}`
        urls.push(dataToGen.refImage)
      } else {
        finalPrompt = `为以下角色描述生成${basePrompt}\n\n角色描述：${dataToGen.content.substring(0, 800)}`
      }

      useNotificationStore.getState().addNotification({
        type: 'info',
        title: '开始生成角色参考图',
        message: '已提交生成任务，请在生成队列中查看进度。'
      })

      const results = await generateGPTImageStream({
        prompt: finalPrompt,
        model: endpoint.model || 'gpt-image-2',
        aspectRatio: '4:3',
        urls: urls.length > 0 ? urls : undefined,
        apiKey,
        endpoint: endpointUrl
      }, (r) => {
        const updates: any = { progress: r.progress || 50, resultUrl: r.url }
        if (r.status === 'succeeded' && r.url) {
          updates.status = 'completed'
          updates.progress = 100
          updates.completedAt = new Date().toISOString()
        }
        useGenerationStore.getState().updateTask(taskId, updates)
      }, task.abortController?.signal)

      let finalResults = results
      const first = finalResults?.[0]
      if (first && !first.url && first.id && (first.status === 'running' || first.status === 'pending')) {
        finalResults = await pollGPTImageResult(first.id, apiKey, resultEndpoint, (r) => {
          const updates: any = { progress: r.progress || 50, resultUrl: r.url }
          if (r.status === 'succeeded' && r.url) {
            updates.status = 'completed'
            updates.progress = 100
            updates.completedAt = new Date().toISOString()
          }
          useGenerationStore.getState().updateTask(taskId, updates)
        }, task.abortController?.signal)
      }

      if (finalResults && finalResults.length > 0 && finalResults[0].url) {
        const resultUrl = finalResults[0].url
        let finalUrl = resultUrl
        try {
          const saved = await saveCharacterImageToAssets(resultUrl, dataToGen.content, dataToGen.id)
          finalUrl = saved.localPath
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: '已保存到素材库',
            message: `图像 "${saved.name}" 已保存，并已绑定为卡片封面。`
          })
        } catch (e) {
          console.error('Auto-save image failed:', e)
        }

        setImages('character', dataToGen.refImage, finalUrl)
        useGenerationStore.getState().updateTask(taskId, {
          status: 'completed',
          progress: 100,
          resultUrl: finalUrl,
          resultLocalPath: finalUrl.startsWith('nbc://') ? finalUrl : undefined,
          completedAt: new Date().toISOString()
        })
        useNotificationStore.getState().addNotification({
          type: 'success',
          title: '图像生成成功',
          message: '角色参考图已生成。'
        })
      } else {
        const rawJson = finalResults?.[0]?.raw ? JSON.stringify(finalResults[0].raw).substring(0, 200) : ''
        const meta = finalResults?.[0] ? `id=${finalResults[0].id || ''} status=${finalResults[0].status || ''} progress=${finalResults[0].progress ?? ''}` : ''
        throw new Error(`返回结果中没有图片 URL。endpoint=${endpointUrl}${meta ? ` ${meta}` : ''}${rawJson ? ` 返回数据: ${rawJson}` : ''}`)
      }
    } catch (e: any) {
      if (e.message === 'AbortError') {
        useGenerationStore.getState().updateTask(taskId, {
          status: 'failed',
          error: 'User cancelled',
          completedAt: new Date().toISOString()
        })
      } else {
        useGenerationStore.getState().updateTask(taskId, {
          status: 'failed',
          error: e.message || '未知错误',
          completedAt: new Date().toISOString()
        })
        useLogStore.getState().addReport({
          nodeType: 'GPT图像',
          nodeLabel: '一键生成角色参考图',
          prompt: finalPrompt,
          error: e.message || '未知错误',
        })
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: '图像生成失败',
          message: e.message || '未知错误'
        })
      }
    } finally {
      setGeneratingImage(false)
      useGenerationStore.getState().setProcessing(false)
    }
  }

  const handleImageBound = (asset: Asset) => {
    setBindImageModalOpen(false)
    if ((asset.type === 'image' || asset.type === 'video') && asset.path) {
      const cardData = getActiveData('character')
      if (bindImageTarget === 'ref') {
        setImages('character', asset.path, cardData.generatedImage)
      } else {
        setImages('character', cardData.refImage, asset.path)

        const { assets, setAssets } = useAssetStore.getState()
        const existingAsset = assets.find(a => a.id === cardData.id)
        if (existingAsset) {
          setAssets(assets.map(a => a.id === cardData.id ? { ...a, thumbnailPath: asset.path } : a))
        }
      }

      useNotificationStore.getState().addNotification({
        type: 'success',
        title: bindImageTarget === 'ref' ? '已设置参考图' : '已绑定形象',
        message: `成功将图片 "${asset.name}" ${bindImageTarget === 'ref' ? '设为参考图' : '绑定到当前角色卡'}。`
      })
    }
  }

  const handleRefImageUpload = () => {
    const input = document.createElement('input')
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setImages(activeCategory, base64, data.generatedImage)
        }
        reader.readAsDataURL(file)
      } catch (err) {
        console.error('File read error:', err)
      }
    }
    input.click()
  }

  const handleExtractCards = async () => {
    const scriptContent = getActiveData('script').content || ''
    const storyboardContent = getActiveData('storyboard').content || ''
    
    if (!scriptContent && !storyboardContent) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无法提取',
        message: '剧本和分镜内容均为空，请先编写剧本或分镜。'
      })
      return
    }

    if (!confirm('此操作将分析当前的剧本和分镜，并自动在素材库中生成一系列的角色卡、场景卡和物品卡。可能需要等待几秒钟。是否继续？')) {
      return
    }

    setLoading(true)
    addMessage({ role: 'user', content: '请帮我从当前的剧本和分镜中，一键提取出所有的三卡（角色、场景、物品），并生成对应的详细设定。' })
    
    const contextContent = `【剧本】：\n${scriptContent}\n\n【分镜】：\n${storyboardContent}`
    
    const { reply, error } = await askInspirationAgent({
      category: 'extract_cards',
      content: contextContent,
      messages: chatHistory,
      newMessage: '提取三卡，必须返回 JSON 格式数据，包含 characters, scenes, items 数组（详细结构化字段）。将 JSON 放在 markdown 代码块中 (```json ... ```).'
    }, () => {})

    setLoading(false)
    if (error) {
      addMessage({ role: 'assistant', content: `**Error**: ${error}` })
      return
    }

    if (reply) {
      let extractedContent = ''
      const codeBlockMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      if (codeBlockMatch) {
        extractedContent = codeBlockMatch[1].trim()
      } else {
        const resultMatch = reply.match(/<result>([\s\S]*?)<\/result>/i)
        extractedContent = resultMatch ? resultMatch[1].trim() : reply.trim()
      }
      
      try {
        const json = JSON.parse(extractedContent)
        const { assets, setAssets } = useAssetStore.getState()
        const activeProjectId = useProjectStore.getState().activeProjectId
        const newAssets: Asset[] = []
        let count = 0

        // Process characters — structured format
        if (Array.isArray(json.characters)) {
          for (const char of json.characters) {
            if (char.name) {
              const newId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              const name = (char.name || '').substring(0, 20)
              const profile: CharacterProfile = {
                name: char.name || '',
                alias: char.alias || '',
                gender: char.gender || '男',
                age: typeof char.age === 'number' ? char.age : 25,
                role: char.role || '',
                facePrompt: char.facePrompt || '',
                bodyPrompt: char.bodyPrompt || '',
                negativePrompt: char.negativePrompt || '',
                consistencySeed: undefined,
                refImages: [],
                emotionPresets: [],
                actionPresets: [],
                ttsVoiceId: '', ttsSpeed: 1.0, ttsPitch: 0,
                backstory: char.backstory || '',
              }
              const contentText = `${profile.name}（${profile.alias}）\n性别：${profile.gender} 年龄：${profile.age} 身份：${profile.role}\n\n面部提示词：${profile.facePrompt}\n体型提示词：${profile.bodyPrompt}\n负面约束：${profile.negativePrompt}\n\n${profile.backstory}`

              let localPath = `local://text-card/${newId}`
              if (window.electronAPI) {
                try {
                  const jsonContent = JSON.stringify({ id: newId, name, category: 'character', profile, prompt: contentText, tags: ['Character', 'AI生成'], createdAt: new Date().toISOString() }, null, 2)
                  const base64Data = btoa(unescape(encodeURIComponent(jsonContent)))
                  const filename = `${name}_${newId}.json`.replace(/[\\/:"*?<>|]/g, '_')
                  const savedPath = await saveLocalViaElectron('', filename, base64Data)
                  if (savedPath) localPath = `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`
                } catch (e) { console.error('Failed to save JSON file:', e) }
              }

              newAssets.push({
                id: newId, name, type: 'text', path: localPath,
                prompt: contentText, tags: ['Character', 'AI生成'],
                createdAt: new Date().toISOString(), projectId: activeProjectId || undefined,
              })
              count++
            }
          }
        }

        // Process scenes — structured format
        if (Array.isArray(json.scenes)) {
          for (const sc of json.scenes) {
            if (sc.name) {
              const newId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              const name = (sc.name || '').substring(0, 20)
              const profile: SceneProfile = {
                name: sc.name || '',
                nameEn: sc.nameEn || '',
                sceneType: sc.sceneType || '室内',
                timeOfDay: sc.timeOfDay || 'night',
                weather: sc.weather || '晴',
                colorPalette: sc.colorPalette || '冷蓝',
                mood: sc.mood || '',
                lightingDescription: sc.lightingDescription || '',
                spatialType: sc.spatialType || '大厅',
                keyElements: Array.isArray(sc.keyElements) ? sc.keyElements : [],
                refImages: [],
              }
              const contentText = `${profile.name}（${profile.nameEn}）\n类型：${profile.sceneType} | 时间：${profile.timeOfDay} | 天气：${profile.weather} | 色调：${profile.colorPalette} | 氛围：${profile.mood}\n\n光影：${profile.lightingDescription}\n空间：${profile.spatialType}（${(profile.keyElements || []).join('、')}）`

              let localPath = `local://text-card/${newId}`
              if (window.electronAPI) {
                try {
                  const jsonContent = JSON.stringify({ id: newId, name, category: 'scene', profile, prompt: contentText, tags: ['Scene', 'AI生成'], createdAt: new Date().toISOString() }, null, 2)
                  const base64Data = btoa(unescape(encodeURIComponent(jsonContent)))
                  const filename = `${name}_${newId}.json`.replace(/[\\/:"*?<>|]/g, '_')
                  const savedPath = await saveLocalViaElectron('', filename, base64Data)
                  if (savedPath) localPath = `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`
                } catch (e) { console.error('Failed to save JSON file:', e) }
              }

              newAssets.push({
                id: newId, name, type: 'text', path: localPath,
                prompt: contentText, tags: ['Scene', 'AI生成'],
                createdAt: new Date().toISOString(), projectId: activeProjectId || undefined,
              })
              count++
            }
          }
        }

        // Process items — structured format
        if (Array.isArray(json.items)) {
          for (const it of json.items) {
            if (it.name) {
              const newId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
              const name = (it.name || '').substring(0, 20)
              const profile: ItemProfile = {
                name: it.name || '',
                nameEn: it.nameEn || '',
                itemType: it.itemType || '科技设备',
                material: it.material || '',
                color: it.color || '',
                dimensions: it.dimensions || '',
                weight: '',
                condition: it.condition || '完好',
                visualFeatures: it.visualFeatures || '',
                function: it.function || '',
                refImages: [],
              }
              const contentText = `${profile.name}（${profile.nameEn}）\n类型：${profile.itemType} | 材质：${profile.material} | 颜色：${profile.color} | 尺寸：${profile.dimensions} | 成色：${profile.condition}\n\n视觉特征：${profile.visualFeatures}\n功能：${profile.function}`

              let localPath = `local://text-card/${newId}`
              if (window.electronAPI) {
                try {
                  const jsonContent = JSON.stringify({ id: newId, name, category: 'item', profile, prompt: contentText, tags: ['Item', 'AI生成'], createdAt: new Date().toISOString() }, null, 2)
                  const base64Data = btoa(unescape(encodeURIComponent(jsonContent)))
                  const filename = `${name}_${newId}.json`.replace(/[\\/:"*?<>|]/g, '_')
                  const savedPath = await saveLocalViaElectron('', filename, base64Data)
                  if (savedPath) localPath = `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`
                } catch (e) { console.error('Failed to save JSON file:', e) }
              }

              newAssets.push({
                id: newId, name, type: 'text', path: localPath,
                prompt: contentText, tags: ['Item', 'AI生成'],
                createdAt: new Date().toISOString(), projectId: activeProjectId || undefined,
              })
              count++
            }
          }
        }

        if (count > 0) {
          setAssets([...assets, ...newAssets])
          addMessage({ role: 'assistant', content: `✅ 提取成功！已在素材库中生成了 ${count} 张新的三卡设定（结构化格式），包含完整的一致性和提示词字段。` })
          useNotificationStore.getState().addNotification({
            type: 'success',
            title: '提取成功',
            message: `成功提取并保存了 ${count} 张结构化卡片到素材库。`
          })
        } else {
          addMessage({ role: 'assistant', content: '未找到合适的三卡内容，或 JSON 格式解析为空。' })
        }
      } catch (e) {
        addMessage({ role: 'assistant', content: `**解析失败**: AI 返回的内容不是有效的 JSON 格式。\n\n${reply}` })
      }
    }
  }

  const handleBatchGenerateImages = async () => {
    const { assets, setAssets } = useAssetStore.getState()
    const activeProjectId = useProjectStore.getState().activeProjectId
    const characterCards = assets.filter(a => a.type === 'text' && a.tags.includes('Character'))
    
    if (characterCards.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无角色卡',
        message: '素材库中没有找到任何角色卡，请先提取或创建。'
      })
      return
    }

    if (!confirm(`找到 ${characterCards.length} 张角色卡。将自动排队为它们生成形象图，这可能需要一段时间。是否继续？`)) {
      return
    }

    setBatchGenerating(true)
    setBatchProgress({ total: characterCards.length, current: 0 })

    const provider = useProviderStore.getState().getProvider('gptImage2')
    const endpoint = provider?.endpoints[0]
    
    if (!endpoint?.apiKey) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '未配置 API Key',
        message: '请先在设置中配置 GPT Image 2 的 API Key。'
      })
      setBatchGenerating(false)
      return
    }

    const apiKey = endpoint.apiKey
    const url = sanitizeUrl(endpoint.url)
    const resultEndpoint = buildResultEndpoint(url)

    let successCount = 0
    let failCount = 0

    // Concurrency control: 2 at a time
    const CONCURRENCY = 2
    let index = 0

    const worker = async () => {
      while (index < characterCards.length) {
        const currentIndex = index++
        const card = characterCards[currentIndex]
        
        const taskId = `gen_batch_${Date.now()}_${currentIndex}`
        const task: GenerationTask = {
          id: taskId,
          nodeId: card.id,
          type: 'gptImage2',
          status: 'running',
          progress: 0,
          startedAt: new Date().toISOString(),
          abortController: new AbortController()
        }
        useGenerationStore.getState().addTask(task)
        
        try {
          const basePrompt = `专业完整角色参考表，纯白色无缝背景上干净整洁的网格布局，该表包括：主全身体态转面图（正面、3/4 视角、侧面、背面），左侧有主体身份+比例尺（最大），右上角有6-8 色调色板，8 帧情绪进阶，5 帧微表情，多角度头部细节表，中性站姿，姿态变化，1 张特写，底部一排为服装和配饰特写细节（头发质地、外套面料、鞋子、配饰细节），多种手势参考，角色轮廓指南。所有画面中人物的脸部和身体比例一致，完美布局对齐。`
          const finalPrompt = `为以下角色描述生成${basePrompt}\n\n角色描述：${(card.prompt || '').substring(0, 800)}`

          const results = await generateGPTImageStream({
            prompt: finalPrompt,
            model: endpoint.model || 'gpt-image-2',
            aspectRatio: '4:3',
            apiKey,
            endpoint: url
          }, (r) => {
            const updates: any = { progress: r.progress || 50, resultUrl: r.url }
            if (r.status === 'succeeded' && r.url) {
              updates.status = 'completed'
              updates.progress = 100
              updates.completedAt = new Date().toISOString()
            }
            useGenerationStore.getState().updateTask(taskId, updates)
          }, task.abortController?.signal)

          let finalResults = results
          const first = finalResults?.[0]
          if (first && !first.url && first.id && (first.status === 'running' || first.status === 'pending')) {
            const tid = first.id
            finalResults = await pollGPTImageResult(tid, apiKey, resultEndpoint, (r) => {
              const updates: any = { progress: r.progress || 50, resultUrl: r.url }
              if (r.status === 'succeeded' && r.url) {
                updates.status = 'completed'
                updates.progress = 100
                updates.completedAt = new Date().toISOString()
              }
              useGenerationStore.getState().updateTask(taskId, updates)
            }, task.abortController?.signal)
          }

          if (finalResults && finalResults.length > 0 && finalResults[0].url) {
            const generatedUrl = finalResults[0].url
            const name = card.name + '_参考表.png'
            const newId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            
            let localPath = generatedUrl
            if (window.electronAPI) {
              try {
                const resp = await fetch(generatedUrl)
                const blob = await resp.blob()
                const buffer = await blob.arrayBuffer()
                const bytes = new Uint8Array(buffer)
                let binary = ''
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i])
                }
                const base64 = btoa(binary)
                const savedPath = await saveLocalViaElectron(generatedUrl, name, base64)
                if (savedPath) {
                  localPath = `nbc://assets/${encodeURIComponent(name)}?path=${encodeURIComponent(savedPath)}`
                }
              } catch (e) { console.error('Save image to local failed:', e) }
            }

            const newAsset: Asset = {
              id: newId,
              name,
              type: 'image',
              path: localPath,
              prompt: card.prompt,
              tags: ['Character', 'GPT Image'],
              createdAt: new Date().toISOString(),
              thumbnailPath: localPath,
              projectId: activeProjectId || undefined
            }
            
            // Single atomic update: add image + bind thumbnail to card
            useAssetStore.getState().setAssets(
              useAssetStore.getState().assets.map(a => 
                a.id === card.id ? { ...a, thumbnailPath: localPath } : a
              ).concat(newAsset)
            )

            useGenerationStore.getState().updateTask(taskId, {
              status: 'completed',
              progress: 100,
              resultUrl: generatedUrl,
              completedAt: new Date().toISOString()
            })
            successCount++
          } else {
            const rawJson = finalResults?.[0]?.raw ? JSON.stringify(finalResults[0].raw).substring(0, 200) : ''
            const meta = finalResults?.[0] ? `id=${finalResults[0].id || ''} status=${finalResults[0].status || ''} progress=${finalResults[0].progress ?? ''}` : ''
            throw new Error(`返回结果中没有图片 URL。endpoint=${url}${meta ? ` ${meta}` : ''}${rawJson ? ` 返回数据: ${rawJson}` : ''}`)
          }
        } catch (e: any) {
          console.error('Batch generate error for', card.name, e)
          if (e.message === 'AbortError' || e.name === 'AbortError') {
            useGenerationStore.getState().updateTask(taskId, {
              status: 'failed',
              error: 'User cancelled',
              completedAt: new Date().toISOString()
            })
          } else {
            useGenerationStore.getState().updateTask(taskId, {
              status: 'failed',
              error: e.message || '未知错误',
              completedAt: new Date().toISOString()
            })
            useLogStore.getState().addReport({
              nodeType: 'GPT图像',
              nodeLabel: `批量生成角色参考图 - ${card.name}`,
              prompt: card.prompt,
              error: e.message || '未知错误',
            })
          }
          failCount++
        }
        
        setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
      }
    }

    const workers = []
    for (let i = 0; i < Math.min(CONCURRENCY, characterCards.length); i++) {
      workers.push(worker())
    }
    
    await Promise.all(workers)
    
    setBatchGenerating(false)
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: '批量生成完毕',
      message: `共处理 ${characterCards.length} 个角色，成功 ${successCount} 个，失败 ${failCount} 个。`
    })
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    
    // Add user message
    addMessage({ role: 'user', content: userMsg })
    
    setLoading(true)
    const { reply, error } = await askInspirationAgent({
      category: activeCategory,
      content: data.content || data.previousContent,
      messages: chatHistory,
      newMessage: userMsg
    }, (chunk) => {
      // Stream update if supported in future
    })

    setLoading(false)
    if (error) {
      addMessage({ role: 'assistant', content: `**Error**: ${error}` })
    } else if (reply) {
      // Extract <result>...</result> if present
      const resultMatch = reply.match(/<result>([\s\S]*?)<\/result>/i)
      const extractedContent = resultMatch ? resultMatch[1].trim() : ''
      
      if (extractedContent) {
        onAIGenerate(activeCategory, extractedContent)
      }
      
      addMessage({ role: 'assistant', content: reply })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const activeStep = STEPS.find(s => s.categories.includes(activeCategory)) || STEPS[0]
  const currentLabel = activeStep.id === 'cards' 
    ? SUB_TABS.find(t => t.id === activeCategory)?.label 
    : activeStep.label

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const getAssetTagForCategory = (cat: InspirationCategory): AssetTag => {
    if (cat === 'character') return 'Character'
    if (cat === 'scene') return 'Scene'
    if (cat === 'item') return 'Item'
    return 'Output' // fallback
  }

  const handleSelectFromAssets = () => {
    setSelectModalOpen(true)
  }

  const handleCreateBlank = () => {
    createBlankCard(activeCategory)
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: '已创建空卡片',
      message: `新建了空${currentLabel}，可自由编辑文本和绑定图片。`
    })
  }

  const handleAssetSelected = (asset: Asset) => {
    setSelectModalOpen(false)
    if (asset.prompt) {
      setActiveItem(activeCategory, asset.id, asset.prompt)
      
      if (asset.type === 'image' && asset.path) {
        setImages(activeCategory, data.refImage, asset.path)
      } else {
        // Try to find if there's an image asset with the same prompt
        const { assets } = useAssetStore.getState()
        const matchingImage = assets.find(a => a.type === 'image' && a.prompt === asset.prompt)
        if (matchingImage) {
          setImages(activeCategory, data.refImage, matchingImage.path)
        } else {
          // Keep current image or clear? Let's keep it or clear it depending on logic.
          // We'll clear the generated image since it's a new character card
          setImages(activeCategory, data.refImage, undefined)
        }
      }

      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '已加载卡片',
        message: `成功加载卡片：${asset.name}`
      })
    }
  }

  const handleSaveToAssets = async (categoryToSave: InspirationCategory = activeCategory) => {
    // Save a version snapshot before exporting to assets
    saveVersion(categoryToSave, false)
    
    const dataToSave = getActiveData(categoryToSave)
    if (!dataToSave || !dataToSave.content.trim()) {
      if (categoryToSave === activeCategory) {
        useNotificationStore.getState().addNotification({
          type: 'warning',
          title: '无法保存',
          message: '当前内容为空，请输入内容后再保存。'
        })
      }
      return false
    }

    const { assets, setAssets } = useAssetStore.getState()
    const activeProjectId = useProjectStore.getState().activeProjectId
    const isExisting = !dataToSave.id.startsWith('default_')
    const assetId = isExisting ? dataToSave.id : `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    
    // Extract a name from the first line or use default
    const firstLine = dataToSave.content.split('\n')[0].replace(/^[#*\s]+/, '').trim()
    const name = firstLine ? firstLine.substring(0, 20) : `新建${STEPS.find(s => s.categories.includes(categoryToSave))?.label || categoryToSave}`

    let localPath = `local://text-card/${assetId}`

    if (window.electronAPI) {
      try {
        const jsonContent = JSON.stringify({
          id: assetId,
          name,
          category: categoryToSave,
          prompt: dataToSave.content,
          tags: [getAssetTagForCategory(categoryToSave), '本地'],
          createdAt: new Date().toISOString()
        }, null, 2)
        
        // Encode JSON to base64 safely
        const base64Data = btoa(unescape(encodeURIComponent(jsonContent)))
        const filename = `${name}_${assetId}.json`.replace(/[\\/:"*?<>|]/g, '_')
        const savedPath = await saveLocalViaElectron('', filename, base64Data)
        if (savedPath) {
          localPath = `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`
        }
      } catch (e) {
        console.error('Failed to save JSON file:', e)
      }
    }

    const newAsset: Asset = {
      id: assetId,
      name,
      type: 'text',
      path: localPath,
      prompt: dataToSave.content,
      tags: [getAssetTagForCategory(categoryToSave), '本地'],
      createdAt: new Date().toISOString(),
      projectId: activeProjectId || undefined
    }

    if (isExisting) {
      setAssets(assets.map(a => a.id === assetId ? { ...a, ...newAsset } : a))
    } else {
      setAssets([...assets, newAsset])
      // Update active item to the newly created asset
      setActiveItem(categoryToSave, assetId, dataToSave.content)
    }
    
    return true
  }

  const handleSaveAllToAssets = async () => {
    const categories: InspirationCategory[] = ['script', 'storyboard', 'character', 'scene', 'item']
    let savedCount = 0
    for (const cat of categories) {
      if (await handleSaveToAssets(cat)) {
        savedCount++
      }
    }
    
    if (savedCount > 0) {
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '全部保存成功',
        message: `成功保存了 ${savedCount} 个类别的具体 JSON 文件到素材库。`
      })
    } else {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无需保存',
        message: '没有找到需要保存的非空内容。'
      })
    }
  }

  const handleSaveImageToAssets = async () => {
    const dataToSave = getActiveData('character')
    if (!dataToSave.generatedImage) return
    const saved = await saveCharacterImageToAssets(dataToSave.generatedImage, dataToSave.content, dataToSave.id)
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: '已保存到素材库',
      message: `图像 "${saved.name}" 已保存，并已绑定为卡片封面。`
    })
  }

  const defaultCharacterProfile = (): CharacterProfile => ({
    name: '', alias: '', gender: '男', age: 25, role: '',
    facePrompt: '', bodyPrompt: '', negativePrompt: '',
    consistencySeed: undefined, refImages: [],
    emotionPresets: [], actionPresets: [],
    ttsVoiceId: '', ttsSpeed: 1.0, ttsPitch: 0, backstory: ''
  })

  const defaultSceneProfile = (): SceneProfile => ({
    name: '', nameEn: '', sceneType: '室内',
    timeOfDay: 'night', weather: '晴', colorPalette: '冷蓝', mood: '',
    lightingDescription: '', spatialType: '大厅', keyElements: [],
    recommendedStyleId: undefined, refImages: []
  })

  const defaultItemProfile = (): ItemProfile => ({
    name: '', nameEn: '', itemType: '科技设备',
    material: '', color: '', dimensions: '', weight: '',
    condition: '完好', visualFeatures: '', function: '',
    refImages: []
  })

  const buildCharacterProfile = (content: string): CharacterProfile => {
    const nameMatch = content.match(/^(.+?)[\uFF08(]/)
    const aliasMatch = content.match(/[\uFF08(](.+?)[\uFF09)]/)
    const genderMatch = content.match(/性别[：:]\s*(\S+)/)
    const ageMatch = content.match(/年龄[：:]\s*(\d+)/)
    const roleMatch = content.match(/身份[：:]\s*(\S+)/)
    const faceMatch = content.match(/面部提示词[：:]\s*([\s\S]+?)(?=体型提示词|负面约束|\n\n|$)/)
    const bodyMatch = content.match(/体型提示词[：:]\s*([\s\S]+?)(?=负面约束|\n\n|$)/)
    const negMatch = content.match(/负面约束[：:]\s*([\s\S]+?)(?=\n\n|\n\u3010|$)/)
    const { assets } = useAssetStore.getState()
    const matchingAsset = assets.find(a => a.tags.includes('Character') && a.name === (nameMatch?.[1]?.trim() || ''))
    return {
      name: nameMatch?.[1]?.trim() || '',
      alias: aliasMatch?.[1]?.trim() || '',
      gender: genderMatch?.[1]?.trim() || '男',
      age: ageMatch ? parseInt(ageMatch[1]) : 25,
      role: roleMatch?.[1]?.trim() || '',
      facePrompt: (faceMatch?.[1] || '').trim(),
      bodyPrompt: (bodyMatch?.[1] || '').trim(),
      negativePrompt: (negMatch?.[1] || '').trim(),
      consistencySeed: undefined,
      refImages: matchingAsset?.thumbnailPath ? [matchingAsset.thumbnailPath] : (data.refImage ? [data.refImage] : []),
      emotionPresets: [],
      actionPresets: [],
      ttsVoiceId: '', ttsSpeed: 1.0, ttsPitch: 0,
      backstory: content.split('\n\n').slice(1).join('\n\n'),
    }
  }

  const buildSceneProfile = (content: string): SceneProfile => {
    const nameMatch = content.match(/^(.+?)[\uFF08(]/)
    const enMatch = content.match(/[\uFF08(](.+?)[\uFF09)]/)
    const typeMatch = content.match(/类型[：:]\s*(\S+)/)
    const timeMatch = content.match(/时间[：:]\s*(\S+)/)
    const weatherMatch = content.match(/天气[：:]\s*(\S+)/)
    const colorMatch = content.match(/色调[：:]\s*(\S+)/)
    const moodMatch = content.match(/氛围[：:]\s*(\S+)/)
    const lightMatch = content.match(/光影[：:]\s*([\s\S]+?)(?=空间[：:]|\n\n|$)/)
    const spatialMatch = content.match(/空间[：:]\s*(\S+)/)
    const elementsMatch = content.match(/[\uFF08(](.+?)[\uFF09)]/)
    const { assets } = useAssetStore.getState()
    const matchingAsset = assets.find(a => a.tags.includes('Scene') && a.name === (nameMatch?.[1]?.trim() || ''))
    return {
      name: nameMatch?.[1]?.trim() || '',
      nameEn: enMatch?.[1]?.trim() || '',
      sceneType: typeMatch?.[1]?.trim() || '室内',
      timeOfDay: timeMatch?.[1]?.trim() || 'night',
      weather: weatherMatch?.[1]?.trim() || '晴',
      colorPalette: colorMatch?.[1]?.trim() || '冷蓝',
      mood: moodMatch?.[1]?.trim() || '',
      lightingDescription: (lightMatch?.[1] || '').trim(),
      spatialType: spatialMatch?.[1]?.trim() || '大厅',
      keyElements: (elementsMatch?.[1] || '').split(/[、,]/).map((s: string) => s.trim()).filter(Boolean),
      refImages: matchingAsset?.thumbnailPath ? [matchingAsset.thumbnailPath] : (data.refImage ? [data.refImage] : []),
    }
  }

  const buildItemProfile = (content: string): ItemProfile => {
    const nameMatch = content.match(/^(.+?)[\uFF08(]/)
    const enMatch = content.match(/[\uFF08(](.+?)[\uFF09)]/)
    const typeMatch = content.match(/类型[：:]\s*(\S+)/)
    const matMatch = content.match(/材质[：:]\s*(\S+)/)
    const colorMatch = content.match(/颜色[：:]\s*(\S+)/)
    const dimMatch = content.match(/尺寸[：:]\s*(\S+)/)
    const condMatch = content.match(/成色[：:]\s*(\S+)/)
    const visualMatch = content.match(/视觉特征[：:]\s*([\s\S]+?)(?=功能[：:]|\n\n|$)/)
    const funcMatch = content.match(/功能[：:]\s*([\s\S]+?)$/)
    const { assets } = useAssetStore.getState()
    const matchingAsset = assets.find(a => a.tags.includes('Item') && a.name === (nameMatch?.[1]?.trim() || ''))
    return {
      name: nameMatch?.[1]?.trim() || '',
      nameEn: enMatch?.[1]?.trim() || '',
      itemType: typeMatch?.[1]?.trim() || '科技设备',
      material: matMatch?.[1]?.trim() || '',
      color: colorMatch?.[1]?.trim() || '',
      dimensions: dimMatch?.[1]?.trim() || '',
      weight: '',
      condition: condMatch?.[1]?.trim() || '完好',
      visualFeatures: (visualMatch?.[1] || '').trim(),
      function: (funcMatch?.[1] || '').trim(),
      refImages: matchingAsset?.thumbnailPath ? [matchingAsset.thumbnailPath] : (data.refImage ? [data.refImage] : []),
    }
  }

  const parseTimeOfDay = (raw: string): ScriptScene['timeOfDay'] => {
    const t = raw.trim()
    if (t.includes('黎明') || t.includes('dawn')) return 'dawn'
    if (t.includes('早晨') || t.includes('morning')) return 'morning'
    if (t.includes('下午') || t.includes('afternoon')) return 'afternoon'
    if (t.includes('黄昏') || t.includes('evening')) return 'evening'
    if (t.includes('午夜') || t.includes('midnight')) return 'midnight'
    if (t.includes('深夜') || t.includes('夜') || t.includes('night')) return 'night'
    return 'night'
  }

  const parseShotType = (raw: string): string => {
    const t = raw.trim()
    const map: Record<string, string> = { '大特写':'大特写','特写':'特写','近景':'近景','中近景':'中近景','中景':'中景','全景':'全景','远景':'远景' }
    for (const [k, v] of Object.entries(map)) { if (t.includes(k)) return v }
    return '中景'
  }

  const parseScriptToScenes = () => {
    const content = getActiveData('script').content || ''
    if (!content.trim()) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '无法解析', message: '当前剧本内容为空。' })
      return
    }
    const existing = data.scriptScenes || []
    if (existing.length > 0) {
      if (!confirm('当前已有结构化场次卡片。\n\n"解析"将基于自由文本重新生成所有卡片，覆盖现有内容。\n\n确定要继续吗？')) return
    }
    const blocks = content.split(/【场次\d+】/).filter(Boolean)
    const numbers = content.match(/【场次(\d+)】/g)?.map(m => parseInt(m.replace(/[^\d]/g, ''))) || []
    const scenes: ScriptScene[] = []
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim()
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) continue
      const headerLine = lines[0]
      const parts = headerLine.split('|').map(p => p.trim())
      const heading = parts[0] || `场次${numbers[i] || i + 1}`
      const mood = parts[1] || ''
      const durMatch = (parts[2] || '').match(/(\d+)/)
      const estimatedDuration = durMatch ? parseInt(durMatch[1]) : 60
      const timeOfDay = parts[3] ? parseTimeOfDay(parts[3]) : 'night'
      const actionLines: string[] = []
      const dialogues: ScriptDialogue[] = []
      let inAction = true
      for (let j = 1; j < lines.length; j++) {
        const line = lines[j]
        const dialogueMatch = line.match(/^(.+?)[：:]\s*[""](.+?)[""]$/)
        if (dialogueMatch) {
          inAction = false
          dialogues.push({
            id: `dlg_${Date.now()}_${j}`,
            characterName: dialogueMatch[1].trim(),
            lineType: 'speech' as const,
            content: dialogueMatch[2].trim(),
          })
        } else if (inAction) {
          actionLines.push(line)
        }
      }
      scenes.push({
        id: `scene_${Date.now()}_${i}`,
        sceneNumber: numbers[i] || i + 1,
        heading,
        timeOfDay,
        mood,
        estimatedDuration,
        action: actionLines.join('\n'),
        dialogues,
      })
    }
    setScriptScenes(scenes)
    useNotificationStore.getState().addNotification({ type: 'success', title: '解析完成', message: `已从当前版剧本解析出 ${scenes.length} 个场次。` })
  }

  const exportScenesToContent = () => {
    const scenes = data.scriptScenes || []
    if (scenes.length === 0) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '无数据', message: '当前无场次卡片可导出。' })
      return
    }
    const text = scenes.map(s => {
      const dialogueText = (s.dialogues || []).map(d => `${d.characterName}: "${d.content}"`).join('\n')
      return `【场次${s.sceneNumber}】${s.heading} | ${s.mood} | ${s.estimatedDuration}秒\n${s.action}\n${dialogueText}`
    }).join('\n\n')
    setContent('script', text)
    setPreviousContent('script', getActiveData('script').content)
    useNotificationStore.getState().addNotification({ type: 'success', title: '已导出', message: `${scenes.length} 个场次已写回当前版剧本。` })
  }

  const parseStoryboardToShots = () => {
    const content = getActiveData('storyboard').content || ''
    if (!content.trim()) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '无法解析', message: '当前分镜内容为空。' })
      return
    }
    const existing = data.storyboardShots || []
    if (existing.length > 0) {
      if (!confirm('当前已有结构化分镜卡片。\n\n"解析"将基于自由文本重新生成所有卡片，覆盖现有内容。\n\n确定要继续吗？')) return
    }
    const shots: StoryboardShot[] = []
    const lines = content.split('\n')
    let seq = 0
    for (const line of lines) {
      const m = line.match(/镜头\s*\[?\s*(\d+)\s*\]?\s*[：:]\s*[\[【]?(.+?)[\]】]?\s+(\d+)\s*秒?\s+(\S+)\s+(.+)/)
      if (m) {
        shots.push({
          id: `shot_${Date.now()}_${seq}`,
          shotNumber: parseInt(m[1]),
          description: m[2].trim(),
          duration: parseInt(m[3]),
          transition: m[4].trim(),
          shotType: parseShotType(m[5]),
          characterIds: [],
          itemIds: [],
        })
        seq++
      }
    }
    if (shots.length === 0) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '解析失败', message: '未找到符合格式的分镜行。请确保格式为：镜头[编号]：[描述] 数字秒 转场 镜头类型' })
      return
    }
    setStoryboardShots(shots)
    useNotificationStore.getState().addNotification({ type: 'success', title: '解析完成', message: `已从当前版分镜解析出 ${shots.length} 个镜头。` })
  }

  const exportShotsToContent = () => {
    const shots = data.storyboardShots || []
    if (shots.length === 0) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '无数据', message: '当前无分镜卡片可导出。' })
      return
    }
    const text = shots.map(s => `镜头[${s.shotNumber.toString().padStart(2,'0')}]：[${s.description}] ${s.duration}秒 ${s.transition} ${s.shotType}`).join('\n\n')
    setContent('storyboard', text)
    setPreviousContent('storyboard', getActiveData('storyboard').content)
    useNotificationStore.getState().addNotification({ type: 'success', title: '已导出', message: `${shots.length} 个分镜已写回当前版分镜。` })
  }


  return (
    <div className="flex flex-col h-full w-full bg-bg-primary text-text-primary">
      {/* Top Tabs - Steps */}
      <div className="flex border-b border-node-border bg-bg-secondary overflow-x-auto shrink-0">
        {STEPS.map(step => {
          const isActive = step.categories.includes(activeCategory)
          return (
            <button
              key={step.id}
              onClick={() => setActiveCategory(step.categories[0])}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-accent text-accent bg-bg-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'
              }`}
            >
              {step.icon}
              {step.label}
            </button>
          )
        })}
      </div>

      {/* Sub Tabs for Step 3 */}
      {activeStep.id === 'cards' && (
        <div className="flex border-b border-node-border bg-bg-tertiary px-2 overflow-x-auto shrink-0">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-t-md ${
                activeCategory === tab.id
                  ? 'text-text-primary bg-bg-primary border-t border-x border-node-border -mb-px'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area - Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Text Editor */}
        <div className="flex-1 flex flex-col border-r border-node-border relative">
          <div className="p-3 bg-bg-secondary border-b border-node-border flex justify-between items-center shrink-0 flex-wrap gap-2">
            <span className="text-sm font-medium">文本编辑 - {currentLabel}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {(activeCategory === 'script' || activeCategory === 'storyboard') && (
                <>
                  <button
                    onClick={() => {
                      if (activeCategory === 'script') { setEditMode('structured'); parseScriptToScenes() }
                      else { setEditMode('structured'); parseStoryboardToShots() }
                    }}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-accent/40 text-accent hover:bg-accent/10"
                    title={`将当前版自由文本解析为结构化${activeCategory === 'script' ? '场次' : '分镜'}卡片`}
                  >
                    <Split size={13} /> 解析为卡片
                  </button>
                  <button
                    onClick={() => {
                      if (activeCategory === 'script') return exportScenesToContent()
                      else return exportShotsToContent()
                    }}
                    disabled={activeCategory === 'script' ? !(data.scriptScenes && data.scriptScenes.length > 0) : !(data.storyboardShots && data.storyboardShots.length > 0)}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border disabled:opacity-30"
                    title="将修改后的结构化卡片整体写回自由文本当前版"
                  >
                    <ArrowLeft size={13} /> 写回文本
                  </button>
                </>
              )}
              {(activeCategory === 'character' || activeCategory === 'scene' || activeCategory === 'item') && (
                <>
                  <button
                    onClick={() => {
                      setEditMode('structured')
                      if (activeCategory === 'character') setCharacterProfile(defaultCharacterProfile())
                      else if (activeCategory === 'scene') setSceneProfile(defaultSceneProfile())
                      else setItemProfile(defaultItemProfile())
                      setTimeout(() => doParseCardProfile(), 30)
                    }}
                    disabled={!data.content.trim()}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-40"
                    title="根据当前版自由文本一键解析为结构化卡片"
                  >
                    <Split size={13} /> 解析为卡片
                  </button>
                  <button
                    onClick={() => {
                      if (activeCategory === 'character') {
                        const p = data.characterProfile || defaultCharacterProfile()
                        setContent(activeCategory, `${p.name}（${p.alias}）\n性别：${p.gender} 年龄：${p.age} 身份：${p.role}\n\n面部提示词：${p.facePrompt}\n体型提示词：${p.bodyPrompt}\n负面约束：${p.negativePrompt}\n\n${p.backstory}`)
                      } else if (activeCategory === 'scene') {
                        const p = data.sceneProfile || defaultSceneProfile()
                        setContent(activeCategory, `${p.name}（${p.nameEn}）\n类型：${p.sceneType} | 时间：${p.timeOfDay} | 天气：${p.weather} | 色调：${p.colorPalette} | 氛围：${p.mood}\n\n光影：${p.lightingDescription}\n空间：${p.spatialType}（${(p.keyElements||[]).join('、')}）`)
                      } else {
                        const p = data.itemProfile || defaultItemProfile()
                        setContent(activeCategory, `${p.name}（${p.nameEn}）\n类型：${p.itemType} | 材质：${p.material} | 颜色：${p.color} | 尺寸：${p.dimensions} | 成色：${p.condition}\n\n视觉特征：${p.visualFeatures}\n功能：${p.function}`)
                      }
                      setPreviousContent(activeCategory, getActiveData(activeCategory).content)
                      useNotificationStore.getState().addNotification({ type: 'success', title: '已导出', message: '结构化卡片已写回当前版。' })
                    }}
                    disabled={activeCategory === 'character' ? !data.characterProfile : activeCategory === 'scene' ? !data.sceneProfile : !data.itemProfile}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border disabled:opacity-30"
                    title="将修改后的结构化卡片写回自由文本当前版"
                  >
                    <ArrowLeft size={13} /> 写回文本
                  </button>
                </>
              )}
              <div className="flex items-center gap-1.5 bg-bg-tertiary rounded p-0.5 border border-node-border/50">
                <button
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${editMode === 'free' ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                  onClick={() => setEditMode('free')}
                >自由文本</button>
                <button
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${editMode === 'structured' ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                  onClick={() => setEditMode('structured')}
                >结构化</button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeStep.id === 'cards' && (
                <>
                  <button
                    onClick={handleExtractCards}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-accent/30 text-accent hover:bg-accent/10"
                    title="从当前剧本和分镜中，自动提取所有角色、场景和物品"
                  >
                    <Wand2 size={12} /> 一键提取三卡
                  </button>
                  {activeCategory === 'character' && (
                    <button
                      onClick={handleBatchGenerateImages}
                      disabled={batchGenerating}
                      className={`btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border ${batchGenerating ? 'border-node-border text-text-tertiary' : 'border-accent/30 text-accent hover:bg-accent/10'}`}
                      title="为素材库中所有未生成形象的角色卡排队生成图像"
                    >
                      {batchGenerating ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} 
                      {batchGenerating ? `生成中 (${batchProgress.current}/${batchProgress.total})` : '一键生成角色形象'}
                    </button>
                  )}
                  <button
                    onClick={handleCreateBlank}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border"
                    title={`新建空白${currentLabel}`}
                  >
                    <Plus size={12} /> 新建空白
                  </button>
                  <button
                    onClick={handleSelectFromAssets}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border"
                    title={`从素材库选择已有${currentLabel}`}
                  >
                    从素材库选择
                  </button>
                  <button
                    onClick={async () => {
                      if (await handleSaveToAssets()) {
                        useNotificationStore.getState().addNotification({
                          type: 'success',
                          title: '已保存当前项',
                          message: '当前内容已保存到素材库。'
                        })
                      }
                    }}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border"
                    title={`将当前内容保存为新的或更新已有的${currentLabel}到素材库`}
                  >
                    保存当前
                  </button>
                  <button
                    onClick={handleSaveAllToAssets}
                    className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border"
                    title="一次性保存剧本、分镜和所有三卡内容到素材库"
                  >
                    全部保存
                  </button>
                  <div className="w-px h-4 bg-node-border mx-1"></div>
                </>
              )}
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock size={12} />
                <span>自动记录:</span>
                <select 
                  className="bg-transparent border-none outline-none text-text-primary cursor-pointer"
                  value={autoSaveInterval}
                  onChange={e => setAutoSaveInterval(Number(e.target.value))}
                >
                  <option value={0}>关闭</option>
                  <option value={1}>1分钟</option>
                  <option value={5}>5分钟</option>
                  <option value={10}>10分钟</option>
                  <option value={30}>30分钟</option>
                </select>
              </div>
              <button
                onClick={() => saveVersion(activeCategory, false)}
                className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                title="手动记录当前版本"
              >
                <Save size={12} /> 手动记录
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`btn text-xs py-1 px-2 flex items-center gap-1 ${showHistory ? 'btn-primary' : 'btn-ghost'}`}
              >
                <History size={12} /> 版本历史 ({versions.length})
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
            {editMode === 'free' ? (
            <div className="flex-1 flex flex-row">
              {/* Reference Block: Script for Storyboard, Storyboard for Cards */}
              {activeCategory === 'storyboard' && (
                <>
                  <div className="flex-1 flex flex-col border-r border-node-border">
                    <div className="bg-bg-tertiary px-3 py-1 text-xs text-text-secondary border-b border-node-border flex justify-between">
                      <span>剧本参考 (当前版)</span>
                    </div>
                    <div className="flex-1 relative bg-node-bg p-3 text-xs text-text-secondary overflow-y-auto whitespace-pre-wrap">
                      {getActiveData('script').content || <span className="opacity-50">暂无剧本内容...</span>}
                    </div>
                  </div>
                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center bg-bg-secondary w-6 shrink-0 border-r border-node-border">
                    <ArrowRight size={14} className="text-text-tertiary" />
                  </div>
                </>
              )}

              {activeStep.id === 'cards' && (
                <>
                  <div className="flex-1 flex flex-col border-r border-node-border">
                    <div className="bg-bg-tertiary px-3 py-1 text-xs text-text-secondary border-b border-node-border flex justify-between">
                      <span>分镜参考 (当前版)</span>
                    </div>
                    <div className="flex-1 relative bg-node-bg p-3 text-xs text-text-secondary overflow-y-auto whitespace-pre-wrap">
                      {getActiveData('storyboard').content || <span className="opacity-50">暂无分镜内容...</span>}
                    </div>
                  </div>
                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center bg-bg-secondary w-6 shrink-0 border-r border-node-border">
                    <ArrowRight size={14} className="text-text-tertiary" />
                  </div>
                </>
              )}

              {/* Block 1: Previous Version */}
              <div className="flex-1 flex flex-col border-r border-node-border">
                <div className="bg-bg-tertiary px-3 py-1 text-xs text-text-secondary border-b border-node-border flex justify-between">
                  <span>上一版</span>
                </div>
                <div className="flex-1 relative bg-node-bg">
                  <DiffTextarea
                    oldText={data.previousContent || ''}
                    newText={data.content || ''}
                    isLeft={true}
                    onChange={(val) => setPreviousContent(activeCategory, val)}
                    placeholder={`在此处编辑${currentLabel}的初始或上一版本...`}
                  />
                </div>
              </div>
              
              {/* Arrow Indicator */}
              <div className="flex flex-col items-center justify-center bg-bg-secondary w-6 shrink-0 border-r border-node-border">
                <ArrowRight size={14} className="text-text-tertiary" />
              </div>

              {/* Block 2: Current Version */}
              <div className="flex-1 flex flex-col">
                <div className="bg-bg-tertiary px-3 py-1 text-xs text-accent font-medium border-b border-node-border flex justify-between">
                  <span>当前版</span>
                </div>
                <div className="flex-1 relative bg-node-bg">
                  <DiffTextarea
                    oldText={data.previousContent || ''}
                    newText={data.content || ''}
                    isLeft={false}
                    onChange={(val) => setContent(activeCategory, val)}
                    placeholder={`AI 迭代生成的新版本将出现在这里...`}
                  />
                </div>
              </div>
              
              {/* Image Generation Column (Only for Character Card) */}
              {activeCategory === 'character' && (
                <>
                  <div className="flex flex-col items-center justify-center bg-bg-secondary w-6 shrink-0 border-r border-node-border">
                    <ArrowRight size={14} className="text-text-tertiary" />
                  </div>
                  <div className="w-72 flex flex-col border-r border-node-border shrink-0 bg-bg-secondary">
                    <div className="bg-bg-tertiary px-3 py-1 text-xs text-text-secondary border-b border-node-border flex justify-between">
                      <span>角色形象编辑</span>
                    </div>
                    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
                      {/* Image Reference Upload */}
                      <div className="border-2 border-dashed border-node-border rounded-lg p-2 text-center hover:border-accent transition-colors bg-bg-primary">
                        {data.refImage ? (
                          <div className="relative group">
                            <img src={data.refImage} alt="Reference" className="w-full h-32 object-contain rounded" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="btn btn-secondary text-xs"
                                  onClick={(e) => { e.stopPropagation(); setBindImageTarget('ref'); setBindImageModalOpen(true); }}
                                  title="从素材库中选择图片作为参考图"
                                >
                                  从素材库选择
                                </button>
                                <button onClick={() => setImages(activeCategory, '', data.generatedImage)} className="text-white hover:text-red-400 p-1 bg-black/50 rounded-full">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group w-full h-32 flex flex-col items-center justify-center">
                            <button onClick={handleRefImageUpload} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-text-tertiary hover:text-accent">
                              <UploadIcon size={24} className="mb-2" />
                              <span className="text-xs">上传参考图 (可选)</span>
                            </button>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded pointer-events-none">
                              <button
                                className="btn btn-secondary text-xs pointer-events-auto"
                                onClick={(e) => { e.stopPropagation(); setBindImageTarget('ref'); setBindImageModalOpen(true); }}
                                title="从素材库中选择已有图片作为角色形象绑定"
                              >
                                从素材库绑定
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleGenerateImage}
                        disabled={generatingImage || !data.content.trim()}
                        className={`btn w-full py-2 flex items-center justify-center gap-2 ${
                          generatingImage ? 'bg-bg-tertiary text-text-secondary' : 'btn-primary'
                        }`}
                      >
                        {generatingImage ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        {generatingImage ? '生成中...' : '生成角色参考表'}
                      </button>

                      {/* Generated Image Result */}
                      {data.generatedImage && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="relative group border border-node-border rounded-lg p-1 bg-bg-primary overflow-hidden">
                            <img src={data.generatedImage} alt="Generated Character" className="w-full rounded object-contain cursor-zoom-in" onClick={() => window.open(data.generatedImage, '_blank')} />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded pointer-events-none">
                              <button 
                                className="btn btn-secondary text-xs pointer-events-auto" 
                                onClick={(e) => { e.stopPropagation(); setBindImageTarget('generated'); setBindImageModalOpen(true); }}
                                title="从素材库中重新选择并绑定一张图片作为角色形象"
                              >
                                更换绑定
                              </button>
                            </div>
                          </div>
                          <button onClick={handleSaveImageToAssets} className="btn btn-secondary text-xs w-full py-1.5 flex justify-center items-center gap-1">
                            <Save size={14} /> 保存图片到素材库
                          </button>
                        </div>
                      )}
                      {!data.generatedImage && !generatingImage && (
                        <div className="text-[10px] text-text-tertiary text-center mt-2 px-2">
                          将根据左侧“当前版”的角色描述文本（以及上方参考图）生成 4:3 横版的专业角色转面和细节参考表。
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {activeCategory === 'script' && (
                <ScriptSceneEditor
                  scenes={data.scriptScenes || []}
                  onChange={(scenes) => {
                    setScriptScenes(scenes)
                    const text = scenes.map(s => {
                      const dialogueText = (s.dialogues || []).map(d => `${d.characterName}: "${d.content}"`).join('\n')
                      return `【场次${s.sceneNumber}】${s.heading} | ${s.mood} | ${s.estimatedDuration}秒\n${s.action}\n${dialogueText}`
                    }).join('\n\n')
                    setContent(activeCategory, text)
                  }}
                />
              )}
              {activeCategory === 'storyboard' && (
                <StoryboardShotEditor
                  shots={data.storyboardShots || []}
                  onChange={(shots) => {
                    setStoryboardShots(shots)
                    const text = shots.map(s => `镜头[${s.shotNumber.toString().padStart(2,'0')}]：[${s.description}] ${s.duration}秒 ${s.transition} ${s.shotType}`).join('\n\n')
                    setContent(activeCategory, text)
                  }}
                />
              )}
              {activeCategory === 'character' && (
                <CharacterProfileForm
                  profile={data.characterProfile || defaultCharacterProfile()}
                  onChange={(profile) => {
                    setCharacterProfile(profile)
                    setContent(activeCategory, `${profile.name}（${profile.alias}）\n性别：${profile.gender} 年龄：${profile.age} 身份：${profile.role}\n\n面部提示词：${profile.facePrompt}\n体型提示词：${profile.bodyPrompt}\n负面约束：${profile.negativePrompt}\n\n${profile.backstory}`)
                  }}
                />
              )}
              {activeCategory === 'scene' && (
                <SceneProfileForm
                  profile={data.sceneProfile || defaultSceneProfile()}
                  onChange={(profile) => {
                    setSceneProfile(profile)
                    setContent(activeCategory, `${profile.name}（${profile.nameEn}）\n类型：${profile.sceneType} | 时间：${profile.timeOfDay} | 天气：${profile.weather} | 色调：${profile.colorPalette} | 氛围：${profile.mood}\n\n光影：${profile.lightingDescription}\n空间：${profile.spatialType}（${(profile.keyElements||[]).join('、')}）`)
                  }}
                />
              )}
              {activeCategory === 'item' && (
                <ItemProfileForm
                  profile={data.itemProfile || defaultItemProfile()}
                  onChange={(profile) => {
                    setItemProfile(profile)
                    setContent(activeCategory, `${profile.name}（${profile.nameEn}）\n类型：${profile.itemType} | 材质：${profile.material} | 颜色：${profile.color} | 尺寸：${profile.dimensions} | 成色：${profile.condition}\n\n视觉特征：${profile.visualFeatures}\n功能：${profile.function}`)
                  }}
                />
              )}
            </div>
          )}

          {/* Version History Sidebar */}
            {showHistory && (
              <div className="w-64 border-l border-node-border bg-bg-secondary flex flex-col shrink-0 animate-in slide-in-from-right-2">
                <div className="p-2 border-b border-node-border flex justify-between items-center bg-bg-tertiary">
                  <span className="text-xs font-medium">版本记录</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {versions.length === 0 ? (
                    <div className="text-center text-text-tertiary text-xs mt-10">
                      暂无版本记录
                    </div>
                  ) : (
                    versions.map((v, i) => (
                      <div key={v.id} className="bg-bg-primary border border-node-border rounded-md p-2 hover:border-accent transition-colors group">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] text-text-secondary flex items-center gap-1">
                            {v.isAuto ? <Clock size={10} /> : <Save size={10} />}
                            {formatTime(v.timestamp)}
                            {i === 0 && <span className="ml-1 text-accent font-medium">(最新)</span>}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                if(confirm('确定要恢复到此版本吗？当前未保存的内容将被覆盖。')) {
                                  restoreVersion(activeCategory, v.id)
                                }
                              }}
                              className="text-text-secondary hover:text-accent p-0.5" 
                              title="恢复此版本"
                            >
                              <RotateCcw size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                if(confirm('确定要删除此记录吗？')) {
                                  deleteVersion(activeCategory, v.id)
                                }
                              }}
                              className="text-text-secondary hover:text-red-500 p-0.5" 
                              title="删除记录"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-text-primary line-clamp-3 text-ellipsis opacity-80 whitespace-pre-wrap">
                          {v.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div 
          className="w-1 cursor-col-resize hover:bg-accent active:bg-accent transition-colors shrink-0 z-10 bg-node-border"
          onMouseDown={handleMouseDown}
        />

        {/* Right: Agent Chat */}
        <div style={{ width: chatWidth }} className="flex flex-col bg-bg-secondary shrink-0">
          <div className="p-3 bg-bg-secondary border-b border-node-border flex justify-between items-center shrink-0">
            <span className="text-sm font-medium flex items-center gap-2"><Bot size={16} className="text-accent" /> AI 迭代助手</span>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  className={`btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 ${sessions.length > 0 ? 'text-text-primary' : 'text-text-tertiary'}`}
                  title="对话历史"
                >
                  <History size={12} />
                  <span className="hidden sm:inline">历史</span>
                  {sessions.length > 0 && <span className="text-[10px]">({sessions.length})</span>}
                </button>
                {showSessionHistory && (
                  <div ref={sessionHistoryRef} className="absolute right-0 top-full mt-1 w-64 bg-bg-primary border border-node-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-node-border flex justify-between items-center bg-bg-tertiary">
                      <span className="text-xs font-medium">对话历史</span>
                      <button onClick={() => setShowSessionHistory(false)} className="text-text-secondary hover:text-text-primary">
                        <X size={12} />
                      </button>
                    </div>
                    {sessions.length === 0 ? (
                      <div className="p-4 text-center text-text-tertiary text-xs">暂无历史对话</div>
                    ) : (
                      [...sessions].sort((a, b) => b.createdAt - a.createdAt).map(session => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 hover:bg-bg-secondary cursor-pointer border-b border-node-border/50 transition-colors group"
                          onClick={() => {
                            switchConversation(session.id)
                            setShowSessionHistory(false)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={12} className="text-text-tertiary shrink-0" />
                              <span className="text-xs font-medium text-text-primary truncate">{session.title}</span>
                            </div>
                            <div className="text-[10px] text-text-tertiary mt-0.5">
                              {new Date(session.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {session.messages.length} 条消息
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('确定要删除此对话记录吗？')) {
                                deleteConversation(session.id)
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 transition-all"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  newConversation()
                  setShowSessionHistory(false)
                }}
                className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                title="开始新对话"
              >
                <Plus size={12} /> 新对话
              </button>
              <button
                onClick={() => clearHistory()}
                className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
                title="清空当前对话"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-text-tertiary text-sm mt-10">
                <Bot size={32} className="mx-auto mb-2 opacity-50" />
                <p>你好！我是灵感助手。</p>
                <p>我可以帮你扩写、修改或优化当前的内容。</p>
              </div>
            ) : (
              chatHistory.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-accent text-white' : 'bg-node-bg border border-node-border'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    {msg.role === 'user' && (
                      <span className="text-[10px] text-text-secondary truncate max-w-[40px]">
                        {localStorage.getItem('nbc_operator_name') || '我'}
                      </span>
                    )}
                  </div>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white' 
                      : 'bg-node-bg border border-node-border text-text-primary'
                  }`}>
                    {msg.content}
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content).then(() => {
                            setCopyToast(msg.id)
                            setTimeout(() => setCopyToast(null), 1500)
                          }).catch(() => {
                            const ta = document.createElement('textarea')
                            ta.value = msg.content
                            document.body.appendChild(ta)
                            ta.select()
                            document.execCommand('copy')
                            document.body.removeChild(ta)
                            setCopyToast(msg.id)
                            setTimeout(() => setCopyToast(null), 1500)
                          })
                        }}
                        className={`btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border bg-bg-secondary hover:bg-bg-tertiary transition-colors ${
                          msg.role === 'user' ? 'border-white/20 bg-white/10 hover:bg-white/20' : ''
                        }`}
                        title="复制消息内容"
                      >
                        {copyToast === msg.id ? (
                          <>已复制</>
                        ) : (
                          <><Copy size={10} /> 复制</>
                        )}
                      </button>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => {
                            const cleanContent = msg.content.replace(/<result>([\s\S]*?)<\/result>/i, '$1').trim()
                            const newText = data.content ? data.content + '\n\n' + cleanContent : cleanContent
                            setContent(activeCategory, newText)
                            useNotificationStore.getState().addNotification({
                              type: 'success',
                              title: '已追加',
                              message: 'AI 回复已追加到当前版本文本末尾'
                            })
                          }}
                          className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                          title="将此段回复内容追加到左侧当前版编辑框"
                        >
                          <ArrowLeft size={10} /> 追加到当前版
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 flex-row">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-node-bg border border-node-border">
                    <Bot size={16} />
                  </div>
                </div>
                <div className="max-w-[80%] rounded-lg p-3 text-sm bg-node-bg border border-node-border text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-bg-primary border-t border-node-border shrink-0">
            <div className="relative flex items-end bg-node-bg border border-node-border rounded-lg overflow-hidden focus-within:border-accent transition-colors">
              <textarea
                className="w-full bg-transparent p-3 pr-10 text-sm resize-none focus:outline-none min-h-[80px] max-h-48"
                placeholder="输入你的修改要求... (Enter 发送，Shift+Enter 换行)"
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`
                }}
                onKeyDown={handleKeyDown}
              />
              <button
                className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-colors ${
                  input.trim() && !loading
                    ? 'bg-accent text-white hover:bg-accent/80'
                    : 'text-text-tertiary cursor-not-allowed'
                }`}
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Asset Selection Modal */}
      <AssetSelectModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onSelect={handleAssetSelected}
        assetTypeTag={getAssetTagForCategory(activeCategory)}
      />
      {/* Asset Image Picker Modal (for image binding) */}
      <AssetImagePicker
        open={bindImageModalOpen}
        onClose={() => setBindImageModalOpen(false)}
        onSelect={handleImageBound}
      />
    </div>
  )
}
