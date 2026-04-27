'use client'

import { useEffect, useRef } from 'react'
import type { TranscriptEntry } from '@/lib/assistant/types'

interface Props {
  entries: TranscriptEntry[]
}

export default function TranscriptDisplay({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  if (!entries.length) {
    return (
      <p className="text-[#6b9dc2] text-sm text-center py-4">
        Your conversation will appear here
      </p>
    )
  }

  return (
    <div className="w-full max-w-lg flex flex-col gap-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex flex-col gap-0.5 ${
            entry.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          {entry.role === 'assistant' && entry.agentName && (
            <span className="text-xs text-[#6b9dc2] ml-1">{entry.agentName}</span>
          )}
          <div
            className={`px-4 py-2 rounded-2xl text-sm max-w-xs ${
              entry.role === 'user'
                ? 'bg-[#0d2a3d] text-white rounded-tr-sm'
                : 'bg-[#091a2a] border border-white/10 text-white/80 rounded-tl-sm'
            }`}
          >
            {entry.text}
          </div>
          <span className="text-xs text-white/20 mx-1">
            {entry.timestamp.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
