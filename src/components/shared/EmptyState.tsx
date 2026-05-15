import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-text-secondary text-xs text-center px-4">
      <Icon size={28} className="mb-2 opacity-30" />
      <p>{title}</p>
      {subtitle && <p className="mt-1 opacity-70">{subtitle}</p>}
      {action && (
        <button className="btn btn-ghost text-[10px] mt-3 border border-node-border" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
