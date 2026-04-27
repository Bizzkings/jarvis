'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface Ring {
  rr: number     // radius ratio 0→1
  tilt: number   // 3D tilt (0 = face-on circle, PI/2 = edge line)
  phase: number  // initial orbit phase
  speed: number  // orbit speed multiplier
  r: number; g: number; b: number
}

const RINGS: Ring[] = [
  { rr: 0.92, tilt:  0.22, phase: 0.0,  speed:  0.055, r: 90,  g: 10,  b: 210 },
  { rr: 0.83, tilt: -0.44, phase: 1.2,  speed: -0.10,  r: 60,  g: 25,  b: 250 },
  { rr: 0.75, tilt:  0.62, phase: 2.4,  speed:  0.135, r: 140, g: 0,   b: 255 },
  { rr: 0.67, tilt: -0.28, phase: 0.7,  speed: -0.085, r: 35,  g: 65,  b: 255 },
  { rr: 0.59, tilt:  0.78, phase: 3.1,  speed:  0.175, r: 200, g: 0,   b: 165 },  // pink accent
  { rr: 0.51, tilt: -0.56, phase: 1.9,  speed: -0.155, r: 45,  g: 95,  b: 255 },
  { rr: 0.43, tilt:  0.40, phase: 2.7,  speed:  0.220, r: 0,   g: 175, b: 255 },  // cyan begins
  { rr: 0.34, tilt: -0.50, phase: 0.4,  speed: -0.200, r: 0,   g: 205, b: 255 },
  { rr: 0.25, tilt:  0.68, phase: 1.6,  speed:  0.290, r: 70,  g: 210, b: 255 },
  { rr: 0.15, tilt: -0.33, phase: 0.9,  speed: -0.360, r: 180, g: 228, b: 255 },
]

const STATE_SPEED: Record<AssistantState, number> = {
  idle: 1.0, wake: 1.25, listening: 1.7, processing: 2.1, speaking: 2.6, error: 1.9,
}
const STATE_GLOW: Record<AssistantState, number> = {
  idle: 1.0, wake: 1.2, listening: 1.45, processing: 1.55, speaking: 2.0, error: 1.6,
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const stateRef = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    const W = 300
    const H = 300
    const cx = W / 2
    const cy = H / 2
    const maxR = 130

    function drawFrame() {
      const t = tRef.current
      const s = stateRef.current
      const sm = STATE_SPEED[s]
      const gm = STATE_GLOW[s]
      const pulse = s === 'listening' || s === 'speaking'
      const pulseWave = pulse ? Math.sin(t * 4.5) * 0.08 + 1 : 1

      ctx.clearRect(0, 0, W, H)

      // ── Ambient outer glow ──────────────────────────────────────────────────
      const [ar, ag, ab] =
        s === 'listening'  ? [255, 45, 156] :
        s === 'processing' ? [0, 212, 255]  :
        s === 'speaking'   ? [160, 80, 255] :
        [80, 20, 200]

      const og = ctx.createRadialGradient(cx, cy, maxR * 0.5, cx, cy, maxR * 1.75)
      og.addColorStop(0,    `rgba(${ar},${ag},${ab},${0.14 * gm})`)
      og.addColorStop(0.4,  `rgba(${ar},${ag},${ab},${0.05 * gm})`)
      og.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // ── Orbital rings ───────────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'screen'

      for (const ring of RINGS) {
        const orbitAngle = ring.phase + t * ring.speed * sm
        const radius = maxR * ring.rr * pulseWave

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(orbitAngle)
        ctx.scale(1, Math.cos(ring.tilt))

        // Glow pass
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${ring.r},${ring.g},${ring.b},${0.20 * gm})`
        ctx.lineWidth = 10
        ctx.stroke()

        // Medium pass
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${ring.r},${ring.g},${ring.b},${0.45 * gm})`
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Sharp core
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${Math.min(255,ring.r+40)},${Math.min(255,ring.g+40)},${Math.min(255,ring.b+40)},${0.80 * gm})`
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Sparks — 2 per outer ring, 1 per inner
        const nSparks = ring.rr > 0.55 ? 2 : 1
        for (let si = 0; si < nSparks; si++) {
          const sa = t * ring.speed * sm * 3.5 + ring.phase + si * Math.PI
          const sx = Math.cos(sa) * radius
          const sy = Math.sin(sa) * radius

          // Spark halo
          ctx.beginPath()
          ctx.arc(sx, sy, 5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${ring.r},${ring.g},${ring.b},0.35)`
          ctx.fill()

          // Spark core
          ctx.beginPath()
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.fill()
        }

        ctx.restore()
      }

      ctx.globalCompositeOperation = 'source-over'

      // ── Subtle crosshair ─────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(0,200,255,0.08)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 9])
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR * 1.15); ctx.lineTo(cx, cy + maxR * 1.15); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - maxR * 1.15, cy); ctx.lineTo(cx + maxR * 1.15, cy); ctx.stroke()
      ctx.setLineDash([])

      // ── Center bright star ───────────────────────────────────────────────────
      const starR = 28 * (pulse ? (Math.sin(t * 5.5) * 0.2 + 1) : 1)
      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, starR)
      sg.addColorStop(0,    'rgba(255,255,255,1.0)')
      sg.addColorStop(0.12, 'rgba(220,240,255,0.95)')
      sg.addColorStop(0.35, `rgba(${ar},${ag},${ab},${0.55 * gm})`)
      sg.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = sg
      ctx.fillRect(cx - starR, cy - starR, starR * 2, starR * 2)

      // ── Listening ripple rings ───────────────────────────────────────────────
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * 0.75 + k * 0.33) % 1)
          ctx.beginPath()
          ctx.arc(cx, cy, maxR * (1.0 + prog * 0.65), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,45,156,${(1 - prog) * 0.4})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      // ── Speaking rim pulse ────────────────────────────────────────────────────
      if (s === 'speaking') {
        const pa = (Math.sin(t * 9) + 1) * 0.5 * 0.55
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * (1.01 + 0.04 * Math.sin(t * 9)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(199,125,255,${pa})`
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(drawFrame)
    }

    rafRef.current = requestAnimationFrame(drawFrame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const renderIcon = () => {
    if (!isSupported) return <MicOff className="w-7 h-7 text-slate-500" />
    switch (state) {
      case 'listening':  return <Mic     className="w-7 h-7" style={{ color: '#ffe0f5', filter: 'drop-shadow(0 0 8px rgba(255,45,156,0.9))' }} />
      case 'processing': return <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#a0f0ff', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.9))' }} />
      case 'wake':       return <Radio   className="w-7 h-7" style={{ color: '#c8f0ff', filter: 'drop-shadow(0 0 6px rgba(0,200,255,0.8))' }} />
      case 'speaking':   return <Radio   className="w-7 h-7" style={{ color: '#e8d0ff', filter: 'drop-shadow(0 0 8px rgba(199,125,255,0.9))' }} />
      default:           return <Mic     className="w-7 h-7" style={{ color: '#c0e8ff', filter: 'drop-shadow(0 0 5px rgba(0,200,255,0.6))' }} />
    }
  }

  return (
    <div className="relative select-none" style={{ animation: 'float 4s ease-in-out infinite' }}>
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        className="block p-0 bg-transparent border-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-cyan-500/60"
        style={{ cursor: isSupported ? 'pointer' : 'not-allowed', opacity: isSupported ? 1 : 0.45, transition: 'transform 0.15s ease' }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e =>  { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e =>    { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        aria-label={
          !isSupported          ? 'Voice requires Chrome or Edge' :
          state === 'listening' ? 'Stop listening' :
          state === 'speaking'  ? 'Stop speaking'  :
          'Activate Jarvis'
        }
      >
        <canvas ref={canvasRef} width={300} height={300} style={{ display: 'block' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {renderIcon()}
        </div>
      </button>

      {!isSupported && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
          style={{ background: 'rgba(0,10,28,0.9)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(0,180,255,0.6)' }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
