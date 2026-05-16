import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  panelName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.panelName ? ` · ${this.props.panelName}` : ''}]`,
      error,
      errorInfo.componentStack
    )
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-bg-primary p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">
            {this.props.panelName ? `${this.props.panelName} 面板崩溃` : '面板崩溃'}
          </h3>
          <p className="text-xs text-text-secondary mb-4 max-w-md">
            {this.state.error?.message || '发生了未知渲染错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw size={12} />
            重新加载
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
