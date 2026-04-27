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
      <p className="text-xs tracking-widest uppercase py-4" style={{ color: 'rgba(157,78,221,0.5)' }}>
        Conversation will appear here
      </p>
    )
  }

  return (
    <div className="w-full max-w-lg flex flex-col gap-3 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex flex-col gap-0.5 ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          {entry.role === 'assistant' && entry.agentName && (
            <span className="text-xs ml-2 tracking-widest uppercase" style={{ color: 'rgba(157,78,221,0.6)' }}>
              {entry.agentName}
            </span>
          )}
          <div
            className="px-4 py-2.5 rounded-2xl text-sm max-w-xs"
            style={
              entry.role === 'user'
                ? {
                    background: 'rgba(123, 47, 255, 0.25)',
                    border: '1px solid rgba(157, 78, 221, 0.35)',
                    borderTopRightRadius: 4,
                    color: 'rgba(255,255,255,0.9)',
                  }
                : {
                    background: 'rgba(26, 0, 53, 0.6)',
                    border: '1px solid rgba(157, 78, 221, 0.2)',
                    borderTopLeftRadius: 4,
                    color: 'rgba(255,255,255,0.75)',
                  }
            }
          >
            {entry.text}
          </div>
          <span className="text-xs mx-2" style={{ color: 'rgba(123,47,255,0.4)' }}>
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
