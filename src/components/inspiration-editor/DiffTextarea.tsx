import React, { useRef, useEffect } from 'react'
import { diff_match_patch } from 'diff-match-patch'

interface DiffTextareaProps {
  oldText: string
  newText: string
  onChange?: (val: string) => void
  readOnly?: boolean
  isLeft?: boolean
  placeholder?: string
}

export default function DiffTextarea({ oldText, newText, onChange, readOnly, isLeft, placeholder }: DiffTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  // Build the highlighted HTML
  const createHighlightedHtml = () => {
    return diffs.map((diff, index) => {
      const [op, text] = diff
      // Diff.DIFF_DELETE = -1, Diff.DIFF_INSERT = 1, Diff.DIFF_EQUAL = 0
      
      // If this is the left pane (oldText), we only show EQUAL and DELETE
      if (isLeft) {
        if (op === 1) return null // Hide insertions in the old text pane
        if (op === -1) {
          return `<span class="bg-red-500/20 text-red-600 dark:text-red-400 rounded-sm">${escapeHtml(text)}</span>`
        }
        return `<span>${escapeHtml(text)}</span>`
      } 
      // If this is the right pane (newText), we only show EQUAL and INSERT
      else {
        if (op === -1) return null // Hide deletions in the new text pane
        if (op === 1) {
          return `<span class="bg-green-500/20 text-green-600 dark:text-green-400 rounded-sm">${escapeHtml(text)}</span>`
        }
        return `<span>${escapeHtml(text)}</span>`
      }
    }).join('')
  }

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const htmlContent = createHighlightedHtml()

  return (
    <div className="relative w-full h-full flex flex-col font-mono text-sm group">
      <div 
        ref={highlightRef}
        className="absolute inset-0 p-4 whitespace-pre-wrap break-words overflow-hidden pointer-events-none text-text-primary"
        dangerouslySetInnerHTML={{ __html: htmlContent ? htmlContent + '<br/>' : (placeholder ? `<span class="text-text-tertiary">${escapeHtml(placeholder)}</span>` : '') }}
      />
      <textarea
        ref={textareaRef}
        className="absolute inset-0 p-4 bg-transparent resize-none outline-none whitespace-pre-wrap break-words z-10"
        style={{ color: 'transparent', caretColor: '#8b5cf6' }}
        value={isLeft ? oldText : newText}
        onChange={(e) => onChange?.(e.target.value)}
        onScroll={handleScroll}
        readOnly={readOnly}
        spellCheck={false}
      />
    </div>
  )
}
