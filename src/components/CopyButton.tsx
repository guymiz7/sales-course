'use client'
import { useState } from 'react'

interface Props {
  text: string
  label?: string
  copiedLabel?: string
  className?: string
}

export default function CopyButton({ text, label = 'העתק', copiedLabel = '✓ הועתק', className }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={className || 'px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition'}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}
