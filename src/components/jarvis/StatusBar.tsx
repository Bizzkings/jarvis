'use client'

import { memo } from 'react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  agentName?: string | null
}

const STATUS_MAP: Record<AssistantState, { label: string; sub: string }> = {
  idle:       { label: 'JARVIS CORE // IDLE',       sub: 'AWAITING INPUT · SYSTEMS NOMINAL'   },
  wake:       { label: 'JARVIS CORE // STANDBY',    sub: 'WAKE WORD LISTENING · READY'        },
  listening:  { label: 'JARVIS CORE // LISTENING',  sub: 'AUDIO PROCESSING · NEURAL ACTIVE'   },
  processing: { label: 'JARVIS CORE // PROCESSING', sub: 'DEEP COMPUTATION · MATRIX ENGAGED'  },
  speaking:   { label: 'JARVIS CORE // SPEAKING',   sub: 'OUTPUT ACTIVE · VOICE SYNTHESIS ON' },
  error:      { label: 'JARVIS CORE // ERROR',      sub: 'RECOVERY PROTOCOL ACTIVE'           },
}

const StatusBar = memo(function StatusBar({ state, agentName }: Props) {
  const { label, sub } = STATUS_MAP[state]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{
          background: '#cc66ff',
          boxShadow: '0 0 16px #aa33ff, 0 0 32px #7700cc',
          animation: 'sdot 2s ease-in-out infinite',
        }} />
        <p style={{
          fontFamily: 'var(--font-orbitron)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '5px',
          color: '#e8d0ff',
          textShadow: '0 0 30px #cc44ff, 0 0 60px #9900ee, 0 0 90px #6600aa',
          transition: 'all 0.5s ease',
        }}>
          {label}
        </p>
        <span className="w-1.5 h-1.5 rounded-full" style={{
          background: '#cc66ff',
          boxShadow: '0 0 16px #aa33ff, 0 0 32px #7700cc',
          animation: 'sdot 2s ease-in-out 1s infinite',
        }} />
      </div>
      <p style={{
        fontFamily: 'var(--font-orbitron)',
        fontSize: 10,
        letterSpacing: '3px',
        color: 'rgba(0,180,220,0.6)',
      }}>
        {agentName ? `MODULE: ${agentName.toUpperCase()}` : sub}
      </p>
    </div>
  )
})

export default StatusBar
