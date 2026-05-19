import type { CSSProperties, ReactNode } from 'react'
import { NodeResizer } from 'reactflow'
import { useFlowStore } from '@/store/useFlowStore'

export function resolvePreviewUrl(value?: string): string | undefined {
  if (!value) return undefined
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('nbc://') ||
    value.startsWith('file://')
  ) {
    return value
  }
  return `file://${value}`
}

export function getPreviewBoxStyle(columns = 1): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 8,
    width: '100%',
    height: '100%',
    minHeight: 0,
  }
}

export function NodeFrame({
  nodeId,
  selected,
  borderColor,
  minWidth = 180,
  minHeight = 120,
  children,
}: {
  nodeId: string
  selected?: boolean
  borderColor: string
  minWidth?: number
  minHeight?: number
  children: ReactNode
}) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={minWidth}
        minHeight={minHeight}
        lineClassName="!border-accent/60"
        handleClassName="!w-2.5 !h-2.5 !border !border-accent !bg-bg-primary"
        onResizeEnd={(_, params) => {
          updateNodeData(nodeId, {
            nodeWidth: Math.round(params.width),
            nodeHeight: Math.round(params.height),
          })
        }}
      />
      <div
        className={`node-container ${selected ? 'selected' : ''}`}
        style={{
          borderColor,
          width: '100%',
          height: '100%',
          minWidth,
          minHeight,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </>
  )
}

export function MediaThumb({
  src,
  alt,
  icon,
  fit = 'cover',
  className = '',
}: {
  src?: string
  alt?: string
  icon?: ReactNode
  fit?: 'cover' | 'contain'
  className?: string
}) {
  const resolved = resolvePreviewUrl(src)
  if (!resolved) {
    return (
      <div className={`w-full h-full rounded-lg bg-bg-tertiary flex items-center justify-center ${className}`}>
        {icon}
      </div>
    )
  }
  return (
    <div className={`w-full h-full rounded-lg overflow-hidden bg-bg-tertiary ${className}`}>
      <img
        src={resolved}
        alt={alt || ''}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export function AutoTextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      className="w-full flex-1 min-h-0 bg-bg-tertiary/60 border border-node-border rounded-md px-2 py-1.5 text-[11px] text-text-primary resize-none outline-none focus:border-accent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
