'use client'

import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

const RING1_COLOR: Record<AssistantState, string> = {
  idle:       '#7b2fff',
  wake:       '#9d4edd',
  listening:  '#ff2d9c',
  processing: '#00d9ff',
  speaking:   '#c77dff',
  error:      '#ff4444',
}

const CORE_GRADIENT: Record<AssistantState, string> = {
  idle:       'radial-gradient(circle at 35% 35%, #e0aaff 0%, #9d4edd 30%, #4a0080 70%, #1a0035 100%)',
  wake:       'radial-gradient(circle at 35% 35%, #c77dff 0%, #7b2fff 35%, #3a0070 70%, #0d0020 100%)',
  listening:  'radial-gradient(circle at 35% 35%, #ff9de0 0%, #ff2d9c 35%, #6a0050 70%, #1a0025 100%)',
  processing: 'radial-gradient(circle at 35% 35%, #a0f0ff 0%, #00d9ff 35%, #005080 70%, #001525 100%)',
  speaking:   'radial-gradient(circle at 35% 35%, #e0aaff 0%, #c77dff 30%, #7b2fff 65%, #2a0060 100%)',
  error:      'radial-gradient(circle at 35% 35%, #ff9999 0%, #ff4444 35%, #800000 70%, #200000 100%)',
}

const CORE_SHADOW: Record<AssistantState, string> = {
  idle:       '0 0 40px #7b2fff88, 0 0 80px #4a008066, inset 0 0 20px #9d4edd33',
  wake:       '0 0 50px #9d4eddaa, 0 0 100px #7b2fff55, inset 0 0 25px #c77dff22',
  listening:  '0 0 50px #ff2d9caa, 0 0 100px #7b2fff77, inset 0 0 25px #ff2d9c33',
  processing: '0 0 50px #00d9ffaa, 0 0 100px #7b2fff66, inset 0 0 25px #00d9ff33',
  speaking:   '0 0 60px #9d4eddcc, 0 0 120px #7b2fff88, inset 0 0 30px #c77dff44',
  error:      '0 0 50px #ff444488, 0 0 80px #80000066, inset 0 0 20px #ff444433',
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const disabled = !isSupported || state === 'processing'
  const isSpeaking = state === 'speaking'
  const ringColor = RING1_COLOR[state]

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>

      {/* Ambient background bloom */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          inset: -40,
          background: state === 'listening'
            ? 'radial-gradient(circle, rgba(255,45,156,0.12) 0%, transparent 70%)'
            : state === 'processing'
            ? 'radial-gradient(circle, rgba(0,217,255,0.10) 0%, transparent 70%)'
            : state === 'speaking'
            ? 'radial-gradient(circle, rgba(157,78,221,0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(123,47,255,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Float wrapper */}
      <div className="relative animate-[float_4s_ease-in-out_infinite]" style={{ width: 260, height: 260 }}>

        {/* Shake wrapper (only active when speaking) */}
        <div className={isSpeaking ? 'animate-[orb-shake_0.3s_ease-in-out_infinite]' : ''} style={{ width: '100%', height: '100%' }}>

          {/* Outer dashed ring — slow CW rotation */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: `1px dashed ${ringColor}55`,
              animation: 'ring-cw 16s linear infinite',
            }}
          />

          {/* Segmented ring 1 — CW */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={260} height={260}
            style={{ animation: 'ring-cw 8s linear infinite' }}
          >
            <circle
              cx={130} cy={130} r={118}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray="155 35"
            />
          </svg>

          {/* Segmented ring 2 — CCW */}
          <svg
            className="absolute pointer-events-none"
            width={260} height={260}
            style={{ inset: 20, animation: 'ring-ccw 6s linear infinite', position: 'absolute' }}
          >
            <circle
              cx={110} cy={110} r={96}
              fill="none"
              stroke={ringColor}
              strokeWidth={2}
              strokeOpacity={state === 'idle' || state === 'wake' ? 0.3 : 0.6}
              strokeDasharray="100 50 60 40"
            />
          </svg>

          {/* Inner glow ring */}
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-500"
            style={{
              inset: 55,
              border: `2px solid ${ringColor}66`,
              animation: state === 'listening' || state === 'speaking' ? 'ring-cw 3s linear infinite' : 'ring-cw 10s linear infinite',
              boxShadow: `0 0 15px ${ringColor}44`,
            }}
          />

          {/* Core orb button */}
          <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={!isSupported ? 'Voice requires Chrome or Edge' : undefined}
            aria-label={state === 'listening' ? 'Stop listening' : state === 'speaking' ? 'Stop speaking' : 'Activate Jarvis'}
            className={`absolute rounded-full flex items-center justify-center outline-none transition-all duration-500 ${
              !isSupported ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'
            }`}
            style={{
              inset: 70,
              background: CORE_GRADIENT[state],
              boxShadow: CORE_SHADOW[state],
              animation: state === 'idle' || state === 'wake' ? 'pulse-purple 3s ease-in-out infinite' : undefined,
            }}
          >
            {/* Inner ring on core */}
            <div
              className="absolute inset-3 rounded-full pointer-events-none"
              style={{
                border: `1px solid ${ringColor}44`,
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)',
              }}
            />

            {/* Icon */}
            <div className="relative z-10">
              {state === 'processing' ? (
                <Loader2 className="w-9 h-9 animate-spin" style={{ color: '#a0f0ff' }} />
              ) : state === 'listening' ? (
                <Mic className="w-9 h-9" style={{ color: '#ffe0f5' }} />
              ) : state === 'wake' ? (
                <Radio className="w-9 h-9" style={{ color: '#e0c8ff' }} />
              ) : !isSupported ? (
                <MicOff className="w-9 h-9 text-slate-500" />
              ) : (
                <Mic className="w-9 h-9" style={{ color: '#e0c8ff' }} />
              )}
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
