import { useState, useEffect, useRef } from 'react'
import { Film } from 'lucide-react'

interface VideoThumbnailProps {
  src: string
  alt?: string
  className?: string
}

const frameCache = new Map<string, string>()

export default function VideoThumbnail({ src, alt, className }: VideoThumbnailProps) {
  const [frameDataUri, setFrameDataUri] = useState<string | null>(frameCache.get(src) || null)
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (frameCache.has(src)) {
      setFrameDataUri(frameCache.get(src)!)
      return
    }
    if (!src) { setError(true); return }

    const video = document.createElement('video')
    videoRef.current = video
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    let cancelled = false

    const capture = () => {
      if (cancelled || !video.videoWidth) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { setError(true); return }
        ctx.drawImage(video, 0, 0)
        const uri = canvas.toDataURL('image/jpeg', 0.7)
        frameCache.set(src, uri)
        if (!cancelled) setFrameDataUri(uri)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    video.addEventListener('loadeddata', () => {
      video.currentTime = 0.1
    })
    video.addEventListener('seeked', capture)
    video.addEventListener('error', () => { if (!cancelled) setError(true) })

    video.src = src

    return () => {
      cancelled = true
      if (videoRef.current) {
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
        videoRef.current = null
      }
    }
  }, [src])

  if (frameDataUri) {
    return <img src={frameDataUri} alt={alt || ''} className={className} />
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-bg-secondary ${className || ''}`}>
        <Film size={20} className="text-text-tertiary" />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center bg-bg-secondary ${className || ''}`}>
      <div className="w-4 h-4 border-2 border-text-tertiary/30 border-t-accent rounded-full animate-spin" />
    </div>
  )
}
