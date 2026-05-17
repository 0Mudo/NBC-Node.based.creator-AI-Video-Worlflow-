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
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={32} />
      </div>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {action && (
        <button className="btn btn-secondary text-[11px] mt-4" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
