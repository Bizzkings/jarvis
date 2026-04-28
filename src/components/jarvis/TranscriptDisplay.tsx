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
      <p
        className="text-[10px] tracking-[0.25em] uppercase py-4"
        style={{ color: 'rgba(130,70,220,0.38)' }}
      >
        Awaiting voice input...
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
            <span
              className="text-[9px] ml-2 tracking-[0.25em] uppercase"
              style={{ color: 'rgba(170,110,255,0.72)' }}
            >
              {entry.agentName}
            </span>
          )}
          <div
            className="px-4 py-2.5 rounded-2xl text-sm max-w-xs"
            style={
              entry.role === 'user'
                ? {
                    background: 'rgba(28, 0, 58, 0.78)',
                    border: '1px solid rgba(140,70,255,0.24)',
                    borderTopRightRadius: 4,
                    color: 'rgba(230,215,255,0.92)',
                  }
                : {
                    background: 'rgba(14, 0, 32, 0.72)',
                    border: '1px solid rgba(110,50,210,0.18)',
                    borderTopLeftRadius: 4,
                    color: 'rgba(200,175,255,0.78)',
                  }
            }
          >
            {entry.text}
          </div>
          <span
            className="text-[9px] mx-2"
            style={{ color: 'rgba(120,60,200,0.40)' }}
          >
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
