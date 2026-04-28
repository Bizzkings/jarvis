'use client'

import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  onCommand: (text: string) => void
  onStateChange: (s: AssistantState) => void
  currentState: AssistantState
  disabled?: boolean
}

const QUICK_CMDS = [
  { label: 'What time is it?',   icon: '◷', cmd: 'what time is it' },
  { label: 'Weather report',     icon: '◈', cmd: 'what is the weather' },
  { label: 'Run system report',  icon: '◉', cmd: 'show me today\'s report' },
  { label: 'Pending tasks',      icon: '◎', cmd: 'what are my pending tasks' },
]

const STATE_BTNS: { label: string; state: AssistantState; color: string; glow: string }[] = [
  { label: 'IDLE',      state: 'idle',       color: 'rgba(130,60,255,0.18)',  glow: 'rgba(130,60,255,0.35)' },
  { label: 'LISTEN',    state: 'listening',  color: 'rgba(255,45,156,0.18)',  glow: 'rgba(255,45,156,0.42)' },
  { label: 'THINKING',  state: 'processing', color: 'rgba(0,210,255,0.18)',   glow: 'rgba(0,210,255,0.42)'  },
  { label: 'SPEAKING',  state: 'speaking',   color: 'rgba(200,118,255,0.18)', glow: 'rgba(200,118,255,0.42)'},
]

function CornerBrackets({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute top-0 left-0 block w-2.5 h-px" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute top-0 left-0 block w-px h-2.5" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute top-0 right-0 block w-2.5 h-px" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute top-0 right-0 block w-px h-2.5" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute bottom-0 left-0 block w-2.5 h-px" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute bottom-0 left-0 block w-px h-2.5" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute bottom-0 right-0 block w-2.5 h-px" style={{ background: 'rgba(140,60,255,0.55)' }} />
      <span className="absolute bottom-0 right-0 block w-px h-2.5" style={{ background: 'rgba(140,60,255,0.55)' }} />
      {children}
    </div>
  )
}

export default function CommandPanel({ onCommand, onStateChange, currentState, disabled }: Props) {
  return (
    <div className="w-full max-w-xl flex flex-col gap-4">

      {/* Quick commands */}
      <CornerBrackets className="px-5 py-4">
        <p className="text-[9px] tracking-[0.28em] uppercase mb-3 font-mono"
           style={{ color: 'rgba(150,85,255,0.65)' }}>
          QUICK COMMANDS
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_CMDS.map(({ label, icon, cmd }) => (
            <button
              key={cmd}
              onClick={() => !disabled && onCommand(cmd)}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2.5 rounded text-left transition-all duration-200 group"
              style={{
                background: 'rgba(20,5,48,0.70)',
                border: '1px solid rgba(110,50,230,0.22)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
              }}
              onMouseEnter={e => {
                if (!disabled) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(90,20,200,0.22)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(160,80,255,0.45)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(140,60,255,0.18)'
                }
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(20,5,48,0.70)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,50,230,0.22)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(180,100,255,0.65)' }}>
                {icon}
              </span>
              <span className="text-[10px] tracking-[0.12em] uppercase font-mono leading-tight"
                    style={{ color: 'rgba(200,170,255,0.78)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </CornerBrackets>

      {/* State control */}
      <CornerBrackets className="px-5 py-4">
        <p className="text-[9px] tracking-[0.28em] uppercase mb-3 font-mono"
           style={{ color: 'rgba(150,85,255,0.65)' }}>
          STATE CONTROL
        </p>
        <div className="flex gap-2">
          {STATE_BTNS.map(({ label, state, color, glow }) => {
            const active = currentState === state
            return (
              <button
                key={state}
                onClick={() => onStateChange(state)}
                className="flex-1 py-2 rounded text-center transition-all duration-200"
                style={{
                  background: active ? color : 'rgba(15,3,35,0.60)',
                  border: `1px solid ${active ? glow : 'rgba(100,40,200,0.20)'}`,
                  boxShadow: active ? `0 0 14px ${glow}` : 'none',
                }}
              >
                <span
                  className="block text-[9px] tracking-[0.22em] uppercase font-mono"
                  style={{ color: active ? 'rgba(255,255,255,0.90)' : 'rgba(160,100,240,0.48)' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </CornerBrackets>

    </div>
  )
}
