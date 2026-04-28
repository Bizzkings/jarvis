'use client'

import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  agentName?: string | null
}

const STATUS_MAP: Record<AssistantState, { label: string; sublabel: string }> = {
  idle:       { label: '— STANDBY —',          sublabel: 'AWAITING ACTIVATION'       },
  wake:       { label: 'SAY "HEY JARVIS"',      sublabel: 'WAKE WORD LISTENING'       },
  listening:  { label: 'VOICE INPUT ACTIVE',    sublabel: 'CAPTURING AUDIO STREAM'    },
  processing: { label: 'THINKING...',           sublabel: 'ANALYZING QUERY'           },
  speaking:   { label: 'TRANSMITTING',          sublabel: 'GENERATING RESPONSE'       },
  error:      { label: 'SYSTEM ERROR',          sublabel: 'RECOVERY PROTOCOL ACTIVE'  },
}

const DOT_COLOR: Record<AssistantState, string> = {
  idle:       'rgba(130,60,255,0.55)',
  wake:       '#9d4edd',
  listening:  '#ff2d9c',
  processing: '#00d4ff',
  speaking:   '#c77dff',
  error:      '#ff4444',
}

const TEXT_COLOR: Record<AssistantState, string> = {
  idle:       'rgba(150,90,255,0.55)',
  wake:       'rgba(160,100,255,0.75)',
  listening:  '#ff2d9c',
  processing: '#00d4ff',
  speaking:   '#c77dff',
  error:      '#ff4444',
}

export default function StatusBar({ state, agentName }: Props) {
  const { label, sublabel } = STATUS_MAP[state]
  const dotColor  = DOT_COLOR[state]
  const textColor = TEXT_COLOR[state]

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Main status */}
      <div className="flex items-center gap-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: dotColor,
            boxShadow: state !== 'idle' ? `0 0 8px ${dotColor}` : 'none',
            animation: state === 'listening' || state === 'speaking'
              ? 'pulse-purple 0.9s ease-in-out infinite'
              : state === 'wake'
              ? 'hud-blink 2s ease-in-out infinite'
              : 'none',
          }}
        />
        <p
          className="text-xs tracking-[0.30em] uppercase transition-colors duration-300 font-mono"
          style={{ color: textColor }}
        >
          {label}
        </p>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: dotColor,
            boxShadow: state !== 'idle' ? `0 0 8px ${dotColor}` : 'none',
            animation: state === 'listening' || state === 'speaking'
              ? 'pulse-purple 0.9s ease-in-out infinite 0.45s'
              : 'none',
          }}
        />
      </div>

      {/* Sublabel / agent name */}
      <p
        className="text-[9px] tracking-[0.25em] uppercase font-mono"
        style={{ color: 'rgba(130,70,230,0.40)' }}
      >
        {agentName ? `MODULE: ${agentName.toUpperCase()}` : sublabel}
      </p>
    </div>
  )
}
