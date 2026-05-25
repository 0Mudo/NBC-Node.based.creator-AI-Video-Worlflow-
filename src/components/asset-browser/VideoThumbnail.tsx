import { useState, useEffect, useRef } from 'react'
import { Film } from 'lucide-react'

interface VideoThumbnailProps {
  src: string
  alt?: string
  className?: string
}

const SESSION_PREFIX = 'nbc_vthumb_'

const frameCache = new Map<string, string>()

function loadFromSessionStorage(src: string): string | null {
  try {
    const key = SESSION_PREFIX + encodeURIComponent(src)
    const stored = sessionStorage.getItem(key)
    if (stored && stored.length > 0) return stored
  } catch {}
  return null
}

function saveToSessionStorage(src: string, dataUri: string) {
  try {
    const key = SESSION_PREFIX + encodeURIComponent(src)
    sessionStorage.setItem(key, dataUri)
  } catch {}
}

export default function VideoThumbnail({ src, alt, className }: VideoThumbnailProps) {
  const [frameDataUri, setFrameDataUri] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    setError(false)

    if (frameCache.has(src)) {
      setFrameDataUri(frameCache.get(src)!)
      return
    }

    const stored = loadFromSessionStorage(src)
    if (stored) {
      frameCache.set(src, stored)
      setFrameDataUri(stored)
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
        const targetWidth = Math.min(video.videoWidth, 320)
        const ratio = targetWidth / video.videoWidth
        canvas.width = targetWidth
        canvas.height = Math.round(video.videoHeight * ratio)
        const ctx = canvas.getContext('2d')
        if (!ctx) { setError(true); return }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const uri = canvas.toDataURL('image/jpeg', 0.55)
        frameCache.set(src, uri)
        saveToSessionStorage(src, uri)
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
