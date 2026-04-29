'use client'

import { useState, useEffect, memo } from 'react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  onCommand: (text: string) => void
  currentState: AssistantState
  disabled?: boolean
}

const QUICK_CMDS = [
  { label: '▸ What time is it?',   cmd: 'what time is it'        },
  { label: '▸ Weather report',     cmd: 'what is the weather'    },
  { label: '▸ Run system report',  cmd: "show me today's report" },
  { label: '▸ Show pending tasks', cmd: 'what are my pending tasks' },
]

const CLIP_BTN  = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
const CLIP_SEND = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'

const CommandPanel = memo(function CommandPanel({ onCommand, disabled }: Props) {
  const [input, setInput] = useState('')
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const n  = new Date()
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
      width: 'min(820px, 95vw)',
      padding: '16px 24px 20px',
      background: 'linear-gradient(170deg, rgba(0,10,20,0.94), rgba(0,4,10,0.98))',
      borderTop: '1px solid rgba(0,160,220,0.22)',
      borderLeft: '1px solid rgba(0,160,220,0.12)',
      borderRight: '1px solid rgba(0,160,220,0.12)',
      backdropFilter: 'blur(24px)',
      position: 'relative',
    }}>
      {/* Subtle inner top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
           style={{ background: 'linear-gradient(90deg, transparent, rgba(200,100,255,0.15), transparent)' }} />

      {/* Row 1: label + divider + clock */}
      <div className="flex items-center gap-3 mb-3.5">
        <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: 9, letterSpacing: 4, color: 'rgba(0,180,255,0.5)', flexShrink: 0 }}>
          QUICK COMMANDS
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,160,220,0.30), transparent)' }} />
        <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: 9, letterSpacing: 3, color: 'rgba(0,180,255,0.5)', flexShrink: 0 }}>
          {clock}
        </span>
      </div>

      {/* Row 2: quick command buttons */}
      <div className="flex gap-2 mb-3.5 flex-wrap">
        {QUICK_CMDS.map(({ label, cmd }) => (
          <button
            key={cmd}
            onClick={() => !disabled && onCommand(cmd)}
            disabled={disabled}
            style={{
              fontFamily: 'var(--font-rajdhani)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.8px',
              padding: '8px 16px',
              background: 'rgba(0,30,50,0.4)',
              border: '1px solid rgba(0,140,200,0.28)',
              color: disabled ? 'rgba(0,100,140,0.38)' : 'rgba(0,195,255,0.72)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              clipPath: CLIP_BTN,
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              if (!disabled) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(0,55,95,0.5)'
                el.style.borderColor = 'rgba(0,195,255,0.65)'
                el.style.boxShadow   = '0 0 14px rgba(0,155,220,0.28), inset 0 0 6px rgba(0,110,170,0.1)'
                el.style.color       = '#d8f6ff'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(0,30,50,0.4)'
              el.style.borderColor = 'rgba(0,140,200,0.28)'
              el.style.boxShadow  = 'none'
              el.style.color      = disabled ? 'rgba(0,100,140,0.38)' : 'rgba(0,195,255,0.72)'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Row 3: text input + send */}
      <div className="flex gap-2.5">
        <input
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
            letterSpacing: '0.8px',
            padding: '9px 14px',
            background: 'rgba(0,18,38,0.4)',
            border: '1px solid rgba(0,120,180,0.28)',
            color: 'rgba(140,225,255,0.88)',
            outline: 'none',
            caretColor: 'rgba(0,200,255,0.8)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,255,0.50)'
            e.currentTarget.style.boxShadow   = '0 0 10px rgba(0,155,220,0.18)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(0,120,180,0.28)'
            e.currentTarget.style.boxShadow   = 'none'
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !input.trim()}
          style={{
            fontFamily: 'var(--font-orbitron)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '3px',
            padding: '9px 22px',
            background: disabled ? 'rgba(0,28,55,0.25)' : 'rgba(0,75,135,0.35)',
            border: `1px solid ${disabled ? 'rgba(0,75,115,0.28)' : 'rgba(0,180,255,0.52)'}`,
            color: disabled ? 'rgba(0,95,135,0.45)' : '#b8ecff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            clipPath: CLIP_SEND,
            transition: 'all 0.18s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (!disabled) {
              (e.currentTarget as HTMLElement).style.background  = 'rgba(0,110,195,0.48)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(0,155,255,0.32)'
            }
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = disabled ? 'rgba(0,28,55,0.25)' : 'rgba(0,75,135,0.35)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          SEND
        </button>
      </div>
    </div>
  )
})

export default CommandPanel
