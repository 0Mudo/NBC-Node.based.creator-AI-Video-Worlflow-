import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { X, Maximize2, RotateCw } from 'lucide-react'

interface PanoramaViewerProps {
  imageUrl: string
  onClose: (capturedThumbnail?: string) => void
}

export default function PanoramaViewer({ imageUrl, onClose }: PanoramaViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animFrameRef = useRef<number>(0)
  const sphereRef = useRef<THREE.Mesh | null>(null)

  const captureThumbnail = useCallback((): string | undefined => {
    const renderer = rendererRef.current
    if (!renderer) return undefined
    renderer.render(sceneRef.current!, cameraRef.current!)
    return renderer.domElement.toDataURL('image/jpeg', 0.85)
  }, [])

  const handleClose = useCallback(() => {
    const thumb = captureThumbnail()
    onClose(thumb)
  }, [captureThumbnail, onClose])

  const handleReset = useCallback(() => {
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return
    camera.position.set(0, 0, 0.1)
    controls.target.set(0, 0, -1)
    controls.update()
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !imageUrl) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 0, 0.1)
    scene.add(camera)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.rotateSpeed = 0.3
    controls.dampingFactor = 0.1
    controls.minPolarAngle = 0.1
    controls.maxPolarAngle = Math.PI - 0.1
    controls.target.set(0, 0, -1)
    controls.update()
    controlsRef.current = controls

    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = 'anonymous'

    textureLoader.load(
      imageUrl,
      (texture) => {
        const geometry = new THREE.SphereGeometry(500, 128, 64)
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
        const sphere = new THREE.Mesh(geometry, material)
        scene.add(sphere)
        sphereRef.current = sphere
      },
      undefined,
      () => {
        console.warn('Failed to load panorama texture:', imageUrl)
      }
    )

    let animating = true

    function animate() {
      if (!animating) return
      animFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mount || !renderer || !camera) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      animating = false
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      scene.clear()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      sphereRef.current = null
    }
  }, [imageUrl])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          onClick={handleReset}
          title="重置视角"
        >
          <RotateCw size={18} />
        </button>
        <button
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          onClick={() => {
            const el = mountRef.current
            if (el && document.fullscreenElement !== el) {
              el.requestFullscreen().catch(() => {})
            } else if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {})
            }
          }}
          title="全屏"
        >
          <Maximize2 size={18} />
        </button>
        <button
          className="p-2 rounded-lg bg-white/10 hover:bg-red-500/60 text-white/80 hover:text-white transition-colors"
          onClick={handleClose}
          title="关闭 (Esc)"
        >
          <X size={18} />
        </button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <span className="text-white/40 text-xs">拖拽鼠标旋转视角 · 滚轮缩放 · Esc 关闭</span>
      </div>
      <div ref={mountRef} className="flex-1 w-full" />
    </div>,
    document.body
  )
}
