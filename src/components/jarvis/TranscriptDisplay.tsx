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
        style={{ color: 'rgba(0,180,255,0.3)' }}
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
              style={{ color: 'rgba(0,200,255,0.6)' }}
            >
              {entry.agentName}
            </span>
          )}
          <div
            className="px-4 py-2.5 rounded-2xl text-sm max-w-xs"
            style={
              entry.role === 'user'
                ? {
                    background: 'rgba(0, 30, 70, 0.75)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderTopRightRadius: 4,
                    color: 'rgba(220,240,255,0.9)',
                  }
                : {
                    background: 'rgba(0, 10, 35, 0.7)',
                    border: '1px solid rgba(0,180,255,0.12)',
                    borderTopLeftRadius: 4,
                    color: 'rgba(180,220,255,0.75)',
                  }
            }
          >
            {entry.text}
          </div>
          <span
            className="text-[9px] mx-2"
            style={{ color: 'rgba(0,150,200,0.35)' }}
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
