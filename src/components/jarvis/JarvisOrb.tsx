'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

const OUTER_STYLES: Record<AssistantState, string> = {
  idle: 'animate-[orb-idle_4s_ease-in-out_infinite]',
  listening: 'animate-[orb-listen_0.8s_ease-in-out_infinite] border-amber-400/60',
  processing: 'animate-[orb-spin_2s_linear_infinite] border-cyan-400/40',
  speaking: 'animate-[orb-idle_2s_ease-in-out_infinite] border-cyan-500/40',
  error: 'animate-[orb-error_0.4s_ease-in-out_1] border-red-500/60',
}

const CORE_STYLES: Record<AssistantState, string> = {
  idle: 'bg-[#00d4ff]/20 border-[#00d4ff]/30 shadow-[0_0_30px_#00d4ff33]',
  listening: 'bg-amber-400/20 border-amber-400/50 shadow-[0_0_40px_#ffa50066]',
  processing: 'bg-[#00d4ff]/30 border-cyan-400/60 shadow-[0_0_50px_#00d4ff55]',
  speaking: 'bg-[#00d4ff]/25 border-[#00d4ff]/50 shadow-[0_0_50px_#00d4ff66] animate-[orb-pulse_0.5s_ease-in-out_infinite]',
  error: 'bg-red-500/30 border-red-500/60 shadow-[0_0_40px_#ef444466]',
}

const MIDDLE_STYLES: Record<AssistantState, string> = {
  idle: 'border-[#00d4ff]/10',
  listening: 'animate-[orb-ripple_0.8s_ease-out_infinite] border-amber-400/30',
  processing: 'border-cyan-400/20',
  speaking: 'border-[#00d4ff]/20',
  error: 'border-red-500/30',
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const disabled = !isSupported || state === 'processing'
  const title = !isSupported
    ? 'Voice commands require Chrome or Edge'
    : state === 'idle'
    ? 'Click to speak'
    : state === 'listening'
    ? 'Listening — click to stop'
    : state === 'speaking'
    ? 'Speaking — click to stop'
    : 'Processing...'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`relative flex items-center justify-center rounded-full transition-all duration-300 outline-none
        ${!isSupported ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{ width: 180, height: 180 }}
    >
      {/* Outer ring */}
      <span
        className={`absolute rounded-full border-2 transition-colors duration-300 ${OUTER_STYLES[state]}`}
        style={{ width: 180, height: 180 }}
      />

      {/* Middle ring */}
      <span
        className={`absolute rounded-full border transition-colors duration-300 ${MIDDLE_STYLES[state]}`}
        style={{ width: 140, height: 140 }}
      />

      {/* Core */}
      <span
        className={`absolute rounded-full border-2 flex items-center justify-center transition-all duration-300 ${CORE_STYLES[state]}`}
        style={{ width: 100, height: 100 }}
      >
        {state === 'processing' ? (
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        ) : state === 'listening' ? (
          <Mic className="w-10 h-10 text-amber-400" />
        ) : !isSupported ? (
          <MicOff className="w-10 h-10 text-slate-500" />
        ) : (
          <Mic className="w-10 h-10 text-[#00d4ff]" />
        )}
      </span>
    </button>
  )
}
