'use client'

import { useState, useEffect, useRef } from 'react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  onCommand: (text: string) => void
  onStateChange: (s: AssistantState) => void
  currentState: AssistantState
  disabled?: boolean
}

const QUICK_CMDS = [
  { label: '▸ What time is it?',   cmd: 'what time is it'       },
  { label: '▸ Weather report',     cmd: 'what is the weather'   },
  { label: '▸ Run system report',  cmd: "show me today's report" },
  { label: '▸ Show pending tasks', cmd: 'what are my pending tasks' },
]

const STATE_BTNS: { label: string; state: AssistantState }[] = [
  { label: 'IDLE',    state: 'idle'       },
  { label: 'LISTEN',  state: 'listening'  },
  { label: 'THINK',   state: 'processing' },
  { label: 'SPEAK',   state: 'speaking'   },
]

const CLIP_BTN  = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
const CLIP_SEND = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
const CLIP_ST   = 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'

export default function CommandPanel({ onCommand, onStateChange, currentState, disabled }: Props) {
  const [input, setInput] = useState('')
  const [clock, setClock] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      const hh = String(n.getHours()).padStart(2, '0')
      const mm = String(n.getMinutes()).padStart(2, '0')
      const ss = String(n.getSeconds()).padStart(2, '0')
      setClock(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const submit = () => {
    const v = input.trim()
    if (!v || disabled) return
    setInput('')
    onCommand(v)
  }

  return (
    <div style={{
      width: 'min(860px, 95vw)',
      padding: '18px 28px 22px',
      background: 'linear-gradient(170deg, rgba(0,10,20,0.94), rgba(0,4,10,0.98))',
      borderTop: '1px solid rgba(0,160,220,0.22)',
      borderLeft: '1px solid rgba(0,160,220,0.22)',
      borderRight: '1px solid rgba(0,160,220,0.22)',
      backdropFilter: 'blur(24px)',
      position: 'relative',
    }}>
      {/* Purple-tinted inner top border */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderTop: '1px solid rgba(200,100,255,0.12)' }} />

      {/* Row 1: label + state buttons + clock */}
      <div className="flex items-center gap-3 mb-4">
        <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: 9, letterSpacing: 4, color: 'rgba(0,180,255,0.55)' }}>
          QUICK COMMANDS
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,160,220,0.35), transparent)' }} />

        {/* State control buttons */}
        <div className="flex gap-1.5">
          {STATE_BTNS.map(({ label, state }) => {
            const active = currentState === state || (state === 'processing' && currentState === 'processing')
            return (
              <button
                key={state}
                onClick={() => onStateChange(state)}
                style={{
                  fontFamily: 'var(--font-orbitron)',
                  fontSize: 9,
                  letterSpacing: '2px',
                  padding: '6px 12px',
                  background: active ? 'rgba(0,60,120,0.45)' : 'rgba(0,10,25,0.75)',
                  border: `1px solid ${active ? 'rgba(0,200,255,0.7)' : 'rgba(0,100,160,0.3)'}`,
                  color: active ? '#b0eeff' : 'rgba(0,180,220,0.55)',
                  boxShadow: active ? '0 0 14px rgba(0,160,255,0.35)' : 'none',
                  cursor: 'pointer',
                  clipPath: CLIP_ST,
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: 9, letterSpacing: 4, color: 'rgba(0,180,255,0.55)' }}>
          {clock}
        </span>
      </div>

      {/* Row 2: quick command buttons */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        {QUICK_CMDS.map(({ label, cmd }) => (
          <button
            key={cmd}
            onClick={() => !disabled && onCommand(cmd)}
            disabled={disabled}
            style={{
              fontFamily: 'var(--font-rajdhani)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '1px',
              padding: '9px 18px',
              background: 'rgba(0,30,50,0.4)',
              border: '1px solid rgba(0,140,200,0.3)',
              color: disabled ? 'rgba(0,120,160,0.4)' : 'rgba(0,200,255,0.75)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              clipPath: CLIP_BTN,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!disabled) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,60,100,0.5)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.7)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,160,220,0.3), inset 0 0 8px rgba(0,120,180,0.1)'
                ;(e.currentTarget as HTMLElement).style.color = '#e0f8ff'
              }
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,30,50,0.4)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,140,200,0.3)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              ;(e.currentTarget as HTMLElement).style.color = disabled ? 'rgba(0,120,160,0.4)' : 'rgba(0,200,255,0.75)'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: text input + send */}
      <div className="flex gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="ENTER COMMAND ···"
          disabled={disabled}
          style={{
            flex: 1,
            fontFamily: 'var(--font-rajdhani)',
            fontSize: 14,
            letterSpacing: '1px',
            padding: '10px 14px',
            background: 'rgba(0,20,40,0.4)',
            border: '1px solid rgba(0,120,180,0.3)',
            color: 'rgba(150,230,255,0.9)',
            outline: 'none',
            caretColor: 'rgba(0,200,255,0.8)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.55)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,160,220,0.2)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,120,180,0.3)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <button
          onClick={submit}
          disabled={disabled || !input.trim()}
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '3px',
            padding: '10px 24px',
            background: disabled ? 'rgba(0,30,60,0.25)' : 'rgba(0,80,140,0.35)',
            border: `1px solid ${disabled ? 'rgba(0,80,120,0.3)' : 'rgba(0,180,255,0.55)'}`,
            color: disabled ? 'rgba(0,100,140,0.5)' : '#c0eeff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            clipPath: CLIP_SEND,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (!disabled) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,120,200,0.5)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,160,255,0.35)'
            }
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = disabled ? 'rgba(0,30,60,0.25)' : 'rgba(0,80,140,0.35)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          SEND
        </button>
      </div>
    </div>
  )
}
