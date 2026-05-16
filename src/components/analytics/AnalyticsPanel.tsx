import { useMemo } from 'react'
import { useLogStore } from '@/store/useLogStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useProjectStore } from '@/store/useProjectStore'
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

const FAILURE_CATEGORIES: { key: string; label: string; pattern: RegExp }[] = [
  { key: '角色失配', label: '角色失配', pattern: /角色|character|人物|形象|脸|面部/i },
  { key: '构图差', label: '构图差', pattern: /构图|composition|布局|layout|裁切|crop|比例/i },
  { key: '风格偏差', label: '风格偏差', pattern: /风格|style|色调|色彩|color|氛围|mood|画风/i },
  { key: 'API错误', label: 'API错误', pattern: /api|网络|超时|timeout|rate.?limit|token|401|403|429|500|502|503/i },
  { key: '其他', label: '其他', pattern: /.*/ },
]

function categorizeError(error: string): string {
  for (const cat of FAILURE_CATEGORIES) {
    if (cat.key === '其他') continue
    if (cat.pattern.test(error)) return cat.key
  }
  return '其他'
}

function getOptimizationTips(failureCategories: Record<string, number>): string[] {
  const tips: string[] = []

  if ((failureCategories['角色失配'] || 0) > 0) {
    tips.push('⚠️ 角色失配频繁：建议在角色卡中补充更详细的面部特征描述，或使用参考图模式提高一致性。')
  }
  if ((failureCategories['构图差'] || 0) > 0) {
    tips.push('⚠️ 构图问题较多：尝试在提示词中明确指定景别（近景/中景/全景）和构图参考线。')
  }
  if ((failureCategories['风格偏差'] || 0) > 0) {
    tips.push('⚠️ 风格不统一：在场景卡中添加详细氛围描述和光照参数，考虑使用统一的风格预设。')
  }
  if ((failureCategories['API错误'] || 0) > 0) {
    tips.push('⚠️ API 调用失败：检查网络连接和 API Key 余额，考虑降低并发数或增加重试策略。')
  }
  if (tips.length === 0) {
    tips.push('✅ 整体表现良好！继续保持当前的提示词和参数设置。')
    tips.push('💡 建议：定期整理和优化素材库标签，提高资产复用率。')
  }

  return tips
}

export default function AnalyticsPanel() {
  const reports = useLogStore((s) => s.reports)
  const tasks = useGenerationStore((s) => s.tasks)
  const activeProject = useProjectStore((s) => s.getActiveProject())

  const stats = useMemo(() => {
    const allTasks = [...tasks]
    const total = allTasks.length
    const completed = allTasks.filter((t) => t.status === 'completed').length
    const failed = allTasks.filter((t) => t.status === 'failed').length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    // By node type
    const byType: Record<string, number> = {}
    for (const t of allTasks) {
      const label = t.type === 'gptImage2' ? 'GPT Image' : t.type === 'seedance' ? 'Seedance' : t.type === 'banana' ? 'Banana' : t.type
      byType[label] = (byType[label] || 0) + 1
    }

    // Failure reasons
    const failureReasons: Record<string, number> = {}
    for (const r of reports) {
      const cat = categorizeError(r.error)
      failureReasons[cat] = (failureReasons[cat] || 0) + 1
    }

    // Top shots (most generated from timeline)
    const shotCounts: Record<string, number> = {}
    // Reports don't have direct shot info, but we can use nodeLabel as proxy
    for (const t of allTasks) {
      shotCounts[t.nodeId] = (shotCounts[t.nodeId] || 0) + 1
    }

    return { total, completed, failed, rate, byType, failureReasons, shotCounts }
  }, [tasks, reports])

  const tips = useMemo(() => getOptimizationTips(stats.failureReasons), [stats.failureReasons])

  const maxTypeCount = Math.max(...Object.values(stats.byType), 1)

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <BarChart3 size={14} className="text-accent" /> 生成分析
        </span>
        <span className="text-[10px] text-text-tertiary">
          {activeProject?.name || '无项目'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {stats.total === 0 && reports.length === 0 ? (
          <EmptyState icon={BarChart3} title="暂无数据" subtitle="运行生成后将显示统计" />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-primary rounded-lg p-3 border border-node-border/50 text-center">
                <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
                <div className="text-[10px] text-text-tertiary">总生成数</div>
              </div>
              <div className="bg-bg-primary rounded-lg p-3 border border-node-border/50 text-center">
                <div className="text-2xl font-bold text-success">{stats.completed}</div>
                <div className="text-[10px] text-text-tertiary">成功</div>
              </div>
              <div className="bg-bg-primary rounded-lg p-3 border border-node-border/50 text-center">
                <div className={`text-2xl font-bold ${stats.rate >= 80 ? 'text-success' : stats.rate >= 50 ? 'text-color-warning' : 'text-danger'}`}>
                  {stats.rate}%
                </div>
                <div className="text-[10px] text-text-tertiary">成功率</div>
              </div>
            </div>

            {/* Per-Type Bar Chart */}
            {Object.keys(stats.byType).length > 0 && (
              <div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                  按节点类型分布
                </div>
                <div className="space-y-2">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-text-secondary">{type}</span>
                          <span className="text-text-primary font-mono">{count}</span>
                        </div>
                        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${(count / maxTypeCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Failure Reasons */}
            {Object.keys(stats.failureReasons).length > 0 && (
              <div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                  失败原因分布
                </div>
                <div className="space-y-1.5">
                  {FAILURE_CATEGORIES.map((cat) => {
                    const count = stats.failureReasons[cat.key] || 0
                    if (count === 0 && cat.key !== '其他') return null
                    const totalFailures = Object.values(stats.failureReasons).reduce((a, b) => a + b, 0)
                    const pct = totalFailures > 0 ? Math.round((count / totalFailures) * 100) : 0
                    return (
                      <div key={cat.key} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.key === '角色失配' ? 'bg-node-character' : cat.key === '构图差' ? 'bg-node-scene' : cat.key === '风格偏差' ? 'bg-node-prompt' : cat.key === 'API错误' ? 'bg-danger' : 'bg-text-tertiary'}`} />
                        <span className="text-xs text-text-secondary flex-1">{cat.label}</span>
                        <span className="text-[10px] text-text-primary font-mono">{count}</span>
                        <span className="text-[10px] text-text-tertiary w-8 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top 5 Most Generated Shots */}
            {Object.keys(stats.shotCounts).length > 0 && (
              <div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                  生成最多的镜头 (Top 5)
                </div>
                <div className="space-y-1">
                  {Object.entries(stats.shotCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([nodeId, count], idx) => (
                      <div
                        key={nodeId}
                        className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-bg-tertiary/30 transition-colors"
                      >
                        <span className="text-[10px] text-text-tertiary font-mono w-4">
                          #{idx + 1}
                        </span>
                        <span className="text-text-secondary truncate flex-1 font-mono text-[10px]">
                          {nodeId}
                        </span>
                        <span className="text-[10px] text-text-primary font-mono">
                          {count}次
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Optimization Tips */}
            {tips.length > 0 && (
              <div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Lightbulb size={10} className="text-color-warning" />
                  优化建议
                </div>
                <div className="space-y-1.5">
                  {tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] leading-relaxed text-text-secondary bg-bg-primary rounded-lg px-3 py-2 border border-node-border/30"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
