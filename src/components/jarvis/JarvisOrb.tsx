'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface Stream {
  angle: number
  speed: number
  amplitude: number
  phase: number
  length: number
  thickness: number
}

function createStreams(count: number): Stream[] {
  // Deterministic pseudo-random so streams are consistent across renders
  const rng = (seed: number) => {
    const x = Math.sin(seed + 1) * 10000
    return x - Math.floor(x)
  }
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2,
    speed: 0.35 + rng(i * 3 + 0) * 0.55,
    amplitude: 0.22 + rng(i * 3 + 1) * 0.38,
    phase: rng(i * 3 + 2) * Math.PI * 2,
    length: 0.5 + rng(i * 7) * 0.42,
    thickness: 1.4 + rng(i * 5) * 2.6,
  }))
}

const STREAMS = createStreams(22)

interface StateColors {
  r1: number; g1: number; b1: number  // primary
  r2: number; g2: number; b2: number  // secondary
  r3: number; g3: number; b3: number  // accent
  glowAlpha: number
}

function getColors(state: AssistantState): StateColors {
  switch (state) {
    case 'listening':
      return { r1: 255, g1: 45,  b1: 156, r2: 157, g2: 78,  b2: 221, r3: 255, g3: 109, b3: 200, glowAlpha: 0.55 }
    case 'processing':
      return { r1: 0,   g1: 217, b1: 255, r2: 123, g2: 47,  b2: 255, r3: 157, g3: 78,  b3: 221, glowAlpha: 0.50 }
    case 'speaking':
      return { r1: 199, g1: 125, b1: 255, r2: 157, g2: 78,  b2: 221, r3: 255, g3: 45,  b3: 156, glowAlpha: 0.60 }
    case 'wake':
      return { r1: 157, g1: 78,  b1: 221, r2: 123, g2: 47,  b2: 255, r3: 199, g3: 125, b3: 255, glowAlpha: 0.40 }
    case 'error':
      return { r1: 255, g1: 68,  b1: 68,  r2: 200, g2: 0,   b2: 0,   r3: 255, g3: 136, b3: 136, glowAlpha: 0.50 }
    default:
      return { r1: 123, g1: 47,  b1: 255, r2: 157, g2: 78,  b2: 221, r3: 199, g3: 125, b3: 255, glowAlpha: 0.30 }
  }
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
    const R = 108

    function drawFrame() {
      const t = tRef.current
      const s = stateRef.current
      const c = getColors(s)

      const isSpeaking  = s === 'speaking'
      const isListening = s === 'listening'
      const isProcessing = s === 'processing'

      const speedMult = isSpeaking ? 2.4 : isListening ? 1.9 : isProcessing ? 1.6 : 0.7

      ctx.clearRect(0, 0, W, H)

      // ── Outer ambient glow ──────────────────────────────────────────────────
      const outerGlow = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.65)
      outerGlow.addColorStop(0,   `rgba(${c.r1},${c.g1},${c.b1},${c.glowAlpha * 0.55})`)
      outerGlow.addColorStop(0.5, `rgba(${c.r1},${c.g1},${c.b1},${c.glowAlpha * 0.18})`)
      outerGlow.addColorStop(1,   `rgba(${c.r1},${c.g1},${c.b1},0)`)
      ctx.fillStyle = outerGlow
      ctx.fillRect(0, 0, W, H)

      // ── Orbital arc rings (outside sphere) ──────────────────────────────────
      const rings = [
        { r: R * 1.20, tilt: 0.40,  rotSpeed:  0.28, alpha: 0.32, dash: [14, 9]  },
        { r: R * 1.37, tilt: -0.52, rotSpeed: -0.17, alpha: 0.20, dash: [7, 16]  },
        { r: R * 1.53, tilt: 0.18,  rotSpeed:  0.10, alpha: 0.13, dash: [22, 11] },
      ]
      for (const ring of rings) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, Math.abs(Math.sin(ring.tilt)))
        ctx.rotate(t * ring.rotSpeed)
        ctx.beginPath()
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2)
        ctx.setLineDash(ring.dash)
        ctx.strokeStyle = `rgba(${c.r1},${c.g1},${c.b1},${ring.alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      // ── Clip to sphere ──────────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      // Sphere base
      const bg = ctx.createRadialGradient(cx - 18, cy - 18, 0, cx, cy, R)
      bg.addColorStop(0, '#1c0038')
      bg.addColorStop(0.45, '#0d0020')
      bg.addColorStop(1,  '#040009')
      ctx.fillStyle = bg
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Inner nebula
      const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.72)
      neb.addColorStop(0,   `rgba(${c.r1},${c.g1},${c.b1},0.14)`)
      neb.addColorStop(0.5, `rgba(${c.r2},${c.g2},${c.b2},0.06)`)
      neb.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = neb
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // ── Plasma streams ──────────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'screen'

      for (let i = 0; i < STREAMS.length; i++) {
        const st = STREAMS[i]
        const elapsed = t * st.speed * speedMult

        const speakOsc = isSpeaking  ? Math.sin(t * 8.5 + i * 0.72) * 0.45 : 0
        const lisOsc   = isListening ? Math.sin(t * 5.2 + i * 0.55) * 0.28 : 0
        const procOsc  = isProcessing ? Math.sin(t * 3.1 + i * 0.33) * 0.18 : 0

        const shakeMult = isSpeaking ? 1.0 : isListening ? 0.55 : 0
        const amp = st.amplitude * (1 + shakeMult * ((Math.sin(t * 6.3 + i * 1.1) + 1) * 0.5))

        const baseAngle = st.angle + elapsed * 0.15

        const startX = cx + Math.cos(baseAngle) * R * 0.08
        const startY = cy + Math.sin(baseAngle) * R * 0.08

        const cp1A = baseAngle + amp * Math.sin(elapsed + st.phase) + speakOsc + lisOsc + procOsc
        const cp1D = R * (0.45 + 0.22 * Math.sin(elapsed * 1.25 + st.phase))
        const cp1X = cx + Math.cos(cp1A) * cp1D
        const cp1Y = cy + Math.sin(cp1A) * cp1D

        const cp2A = baseAngle + amp * 1.3 * Math.cos(elapsed * 0.82 + st.phase + 1.1) + speakOsc * 0.65
        const cp2D = R * (0.65 + 0.2 * Math.cos(elapsed * 1.1 + st.phase + 2))
        const cp2X = cx + Math.cos(cp2A) * cp2D
        const cp2Y = cy + Math.sin(cp2A) * cp2D

        const endA = baseAngle + amp * 0.85 * Math.sin(elapsed * 1.2 + st.phase + 3)
        const endD = R * st.length * (0.82 + 0.18 * Math.abs(Math.sin(elapsed * 0.7 + i * 0.4)))
        const endX = cx + Math.cos(endA) * endD
        const endY = cy + Math.sin(endA) * endD

        // Blend primary ↔ accent
        const blend = (Math.sin(elapsed * 0.52 + i * 0.41) + 1) * 0.5
        const cr = Math.round(c.r1 * (1 - blend) + c.r3 * blend)
        const cg = Math.round(c.g1 * (1 - blend) + c.g3 * blend)
        const cb = Math.round(c.b1 * (1 - blend) + c.b3 * blend)

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY)
        ctx.lineCap = 'round'

        // Wide glow pass
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.15)`
        ctx.lineWidth = st.thickness * 5.5
        ctx.filter = 'blur(4px)'
        ctx.stroke()
        ctx.filter = 'none'

        // Medium pass
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.32)`
        ctx.lineWidth = st.thickness * 2.5
        ctx.stroke()

        // Core pass
        ctx.strokeStyle = `rgba(${Math.min(255, cr + 55)},${Math.min(255, cg + 55)},${Math.min(255, cb + 55)},0.68)`
        ctx.lineWidth = st.thickness * 0.5
        ctx.stroke()
      }

      ctx.globalCompositeOperation = 'source-over'

      // ── Edge vignette ───────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(cx, cy, R * 0.58, cx, cy, R)
      vig.addColorStop(0,   'rgba(0,0,0,0)')
      vig.addColorStop(0.7, 'rgba(0,0,0,0.08)')
      vig.addColorStop(1,   'rgba(0,0,0,0.78)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // ── Glass specular highlight (upper-left) ───────────────────────────────
      const spec = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.33, 0, cx - R * 0.25, cy - R * 0.28, R * 0.44)
      spec.addColorStop(0,   'rgba(255,255,255,0.22)')
      spec.addColorStop(0.4, 'rgba(255,255,255,0.06)')
      spec.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // ── Bottom reflection ───────────────────────────────────────────────────
      const refl = ctx.createRadialGradient(cx + R * 0.18, cy + R * 0.42, 0, cx + R * 0.18, cy + R * 0.42, R * 0.26)
      refl.addColorStop(0, `rgba(${c.r1},${c.g1},${c.b1},0.10)`)
      refl.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = refl
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      ctx.restore()

      // ── Sphere rim glow ─────────────────────────────────────────────────────
      const rim = ctx.createRadialGradient(cx, cy, R * 0.87, cx, cy, R * 1.06)
      rim.addColorStop(0, 'rgba(0,0,0,0)')
      rim.addColorStop(0.5, `rgba(${c.r1},${c.g1},${c.b1},${0.14 + c.glowAlpha * 0.2})`)
      rim.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rim
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2)
      ctx.fill()

      // ── Speaking pulse ring ─────────────────────────────────────────────────
      if (isSpeaking) {
        const pa = (Math.sin(t * 8.5) + 1) * 0.5 * 0.55
        ctx.beginPath()
        ctx.arc(cx, cy, R * (1.0 + 0.045 * Math.sin(t * 8.5)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${c.r1},${c.g1},${c.b1},${pa})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // ── Listening ripple rings ──────────────────────────────────────────────
      if (isListening) {
        for (let k = 0; k < 3; k++) {
          const rp = ((t * 1.4 + k * 0.33) % 1)
          const rr = R * (1.0 + rp * 0.55)
          const ra = (1 - rp) * 0.38
          ctx.beginPath()
          ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${c.r1},${c.g1},${c.b1},${ra})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(drawFrame)
    }

    rafRef.current = requestAnimationFrame(drawFrame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const renderIcon = () => {
    if (!isSupported) return <MicOff className="w-8 h-8 text-slate-500" />
    switch (state) {
      case 'listening':  return <Mic      className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,45,156,0.9)]"   style={{ color: '#ffe0f5' }} />
      case 'processing': return <Loader2  className="w-8 h-8 animate-spin drop-shadow-[0_0_10px_rgba(0,217,255,0.9)]" style={{ color: '#a0f0ff' }} />
      case 'wake':       return <Radio    className="w-8 h-8 drop-shadow-[0_0_8px_rgba(157,78,221,0.8)]"   style={{ color: '#e0c8ff' }} />
      case 'speaking':   return <Radio    className="w-8 h-8 drop-shadow-[0_0_10px_rgba(199,125,255,0.9)]" style={{ color: '#f0d8ff' }} />
      default:           return <Mic     className="w-8 h-8 drop-shadow-[0_0_6px_rgba(157,78,221,0.6)]"   style={{ color: '#d8c0ff' }} />
    }
  }

  return (
    <div
      className="relative select-none"
      style={{ animation: 'float 4s ease-in-out infinite' }}
    >
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        aria-label={
          !isSupported      ? 'Voice requires Chrome or Edge' :
          state === 'listening' ? 'Stop listening' :
          state === 'speaking'  ? 'Stop speaking'  :
          'Activate Jarvis'
        }
        title={!isSupported ? 'Voice requires Chrome or Edge' : undefined}
        className="relative block p-0 bg-transparent border-0 outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 rounded-full"
        style={{
          cursor: isSupported ? 'pointer' : 'not-allowed',
          opacity: isSupported ? 1 : 0.45,
          transition: 'transform 0.15s ease, filter 0.3s ease',
        }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e =>  { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e =>    { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
      >
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{ display: 'block' }}
        />

        {/* Icon centered over canvas */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {renderIcon()}
        </div>
      </button>

      {/* Speaking shake wrapper rendered around button so the canvas moves */}
      {state === 'speaking' && (
        <div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ animation: 'orb-shake 0.25s ease-in-out infinite' }}
        />
      )}

      {!isSupported && (
        <div
          className="absolute bottom-7 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
          style={{
            background: 'rgba(13,0,32,0.88)',
            border: '1px solid rgba(157,78,221,0.3)',
            color: 'rgba(157,78,221,0.7)',
          }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
