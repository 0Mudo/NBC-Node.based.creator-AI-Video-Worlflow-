import { useNotificationStore, type NotificationType } from '@/store/useNotificationStore'
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  error: { icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return isToday ? time : `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

export default function ChatPanel() {
  const { notifications, markRead, markAllRead, clearAll } = useNotificationStore()
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <Bell size={14} />
          Agent 动态
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-accent text-white rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              className="btn btn-ghost p-1 text-text-secondary hover:text-accent"
              onClick={markAllRead}
              title="全部已读"
            >
              <CheckCheck size={12} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              className="btn btn-ghost p-1 text-text-secondary hover:text-red-400"
              onClick={clearAll}
              title="清空通知"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notifications.length === 0 && (
          <EmptyState icon={Bell} title="暂无通知" subtitle="工作流运行时，Agent 会在这里汇报进度" />
        )}
        {notifications.map((n) => {
          const cfg = typeConfig[n.type]
          const Icon = cfg.icon
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              className={`animate-fade-in flex items-start gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                n.read ? 'opacity-60' : cfg.bg
              } hover:bg-node-border/50`}
              onClick={() => markRead(n.id)}
            >
              <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{n.title}</span>
                  <span className="text-[10px] text-text-secondary flex-shrink-0">
                    {formatTime(n.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
              </div>
              {!n.read && (
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
