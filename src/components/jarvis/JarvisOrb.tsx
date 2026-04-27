'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface StateConfig {
  r: number; g: number; b: number
  amp: [number, number, number, number, number]
  speed: number
  glowAlpha: number
}

const STATE_CONFIG: Record<AssistantState, StateConfig> = {
  idle:       { r: 123,  g: 47,  b: 255, amp: [2,  1.5, 1,   0.5, 0.3], speed: 0.50, glowAlpha: 0.30 },
  wake:       { r: 157,  g: 78,  b: 221, amp: [4,  2.5, 1.5, 0.8, 0.4], speed: 0.70, glowAlpha: 0.38 },
  listening:  { r: 255,  g: 45,  b: 156, amp: [8,  5,   3,   1.5, 0.8], speed: 1.50, glowAlpha: 0.55 },
  processing: { r: 0,    g: 217, b: 255, amp: [10, 6,   3.5, 2,   1  ], speed: 1.80, glowAlpha: 0.50 },
  speaking:   { r: 199,  g: 125, b: 255, amp: [20, 12,  7,   4,   2  ], speed: 2.50, glowAlpha: 0.65 },
  error:      { r: 255,  g: 68,  b: 68,  amp: [16, 10,  6,   3,   1.5], speed: 2.00, glowAlpha: 0.55 },
}

// Wave frequencies: each sine operates at a different harmonic so they beat against each other
const FREQS: [number, number, number, number, number] = [2, 3, 5, 7, 11]
// Wave time-speed multipliers for organic motion
const TSPEEDS: [number, number, number, number, number] = [0.80, -1.10, 0.60, -0.90, 1.40]

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
    const R = 128
    const N = 256  // waveform sample points

    function buildDistortedPath(cfg: StateConfig, t: number): Path2D {
      const path = new Path2D()
      for (let i = 0; i <= N; i++) {
        const angle = (i / N) * Math.PI * 2
        let displacement = 0
        for (let k = 0; k < 5; k++) {
          displacement += Math.sin(angle * FREQS[k] + t * TSPEEDS[k]) * cfg.amp[k]
        }
        const r = R + displacement
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        if (i === 0) path.moveTo(x, y)
        else path.lineTo(x, y)
      }
      path.closePath()
      return path
    }

    function drawFrame() {
      const t = tRef.current
      const s = stateRef.current
      const cfg = STATE_CONFIG[s]
      const { r: cr, g: cg, b: cb, glowAlpha } = cfg

      ctx.clearRect(0, 0, W, H)

      // ── 1. Ambient outer glow ───────────────────────────────────────────────
      const outerGlow = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.7)
      outerGlow.addColorStop(0,   `rgba(${cr},${cg},${cb},${glowAlpha * 0.6})`)
      outerGlow.addColorStop(0.45, `rgba(${cr},${cg},${cb},${glowAlpha * 0.22})`)
      outerGlow.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`)
      ctx.fillStyle = outerGlow
      ctx.fillRect(0, 0, W, H)

      // ── 2. Orbital rings (outside sphere) ──────────────────────────────────
      const rings = [
        { radius: R * 1.18, tilt: 0.42,  rotSpeed:  0.22, alpha: 0.28, dash: [14, 10] },
        { radius: R * 1.34, tilt: -0.55, rotSpeed: -0.14, alpha: 0.18, dash: [7, 18]  },
        { radius: R * 1.50, tilt: 0.20,  rotSpeed:  0.09, alpha: 0.12, dash: [24, 12] },
      ]
      for (const ring of rings) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, Math.abs(Math.sin(ring.tilt)))
        ctx.rotate(t * ring.rotSpeed * cfg.speed)
        ctx.beginPath()
        ctx.arc(0, 0, ring.radius, 0, Math.PI * 2)
        ctx.setLineDash(ring.dash)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ring.alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      // ── 3. Distorted sphere fill ────────────────────────────────────────────
      const distortedPath = buildDistortedPath(cfg, t)

      ctx.save()
      ctx.clip(distortedPath)

      const bgGrad = ctx.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, R)
      bgGrad.addColorStop(0,   '#1c0038')
      bgGrad.addColorStop(0.4, '#0d0020')
      bgGrad.addColorStop(1,   '#040009')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      // Inner color tint
      const innerTint = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75)
      innerTint.addColorStop(0,   `rgba(${cr},${cg},${cb},0.12)`)
      innerTint.addColorStop(0.6, `rgba(${cr},${cg},${cb},0.04)`)
      innerTint.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = innerTint
      ctx.fillRect(0, 0, W, H)

      // ── 5. Latitude lines (depth detail) ───────────────────────────────────
      const latitudeCount = 7
      for (let li = 0; li < latitudeCount; li++) {
        const fraction = (li + 1) / (latitudeCount + 1)  // 0..1 top to bottom
        const latY = cy - R + fraction * R * 2
        const distFromCenter = Math.abs(latY - cy)
        const latR = Math.sqrt(Math.max(0, R * R - distFromCenter * distFromCenter))
        if (latR < 4) continue

        // Slight waveform distortion on latitude lines too
        const latDisp = Math.sin(fraction * Math.PI * 3 + t * 0.6) * cfg.amp[0] * 0.3

        ctx.save()
        ctx.translate(cx, latY)
        ctx.scale(1, 0.18)
        ctx.beginPath()
        ctx.ellipse(0, latDisp * 0.5, latR, latR, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.06 + 0.04 * Math.sin(t * 0.5 + li)})`
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.restore()
      }

      // ── 6. Edge vignette ───────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(cx, cy, R * 0.52, cx, cy, R)
      vig.addColorStop(0,   'rgba(0,0,0,0)')
      vig.addColorStop(0.65, 'rgba(0,0,0,0.06)')
      vig.addColorStop(1,   'rgba(0,0,0,0.80)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // ── 7. Glass specular highlight ────────────────────────────────────────
      const spec = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.36, 0, cx - R * 0.26, cy - R * 0.30, R * 0.46)
      spec.addColorStop(0,   'rgba(255,255,255,0.20)')
      spec.addColorStop(0.38, 'rgba(255,255,255,0.06)')
      spec.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(0, 0, W, H)

      ctx.restore()  // end distorted clip

      // ── 4. Glow outline (outside clip so it bleeds outward) ────────────────
      // Pass 1: wide blurred glow
      ctx.save()
      ctx.filter = 'blur(5px)'
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.35 + glowAlpha * 0.25})`
      ctx.lineWidth = 14
      ctx.stroke(distortedPath)
      ctx.filter = 'none'
      ctx.restore()

      // Pass 2: sharp bright edge
      ctx.strokeStyle = `rgba(${Math.min(255, cr + 50)},${Math.min(255, cg + 50)},${Math.min(255, cb + 50)},0.82)`
      ctx.lineWidth = 1.8
      ctx.stroke(distortedPath)

      // ── 8. Listening ripple rings ──────────────────────────────────────────
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const progress = ((t * 0.8 + k * 0.33) % 1)
          const rr = R * (1.0 + progress * 0.65)
          const ra = (1 - progress) * 0.45
          ctx.beginPath()
          ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ra})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // ── 9. Speaking rim pulse ──────────────────────────────────────────────
      if (s === 'speaking') {
        const pa = (Math.sin(t * 8.5) + 1) * 0.5 * 0.6
        ctx.beginPath()
        ctx.arc(cx, cy, R * (1.0 + 0.05 * Math.sin(t * 8.5)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pa})`
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
    if (!isSupported) return <MicOff className="w-8 h-8 text-slate-500" />
    switch (state) {
      case 'listening':
        return <Mic className="w-8 h-8" style={{ color: '#ffe0f5', filter: 'drop-shadow(0 0 10px rgba(255,45,156,0.9))' }} />
      case 'processing':
        return <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#a0f0ff', filter: 'drop-shadow(0 0 10px rgba(0,217,255,0.9))' }} />
      case 'wake':
        return <Radio className="w-8 h-8" style={{ color: '#e0c8ff', filter: 'drop-shadow(0 0 8px rgba(157,78,221,0.8))' }} />
      case 'speaking':
        return <Radio className="w-8 h-8" style={{ color: '#f0e0ff', filter: 'drop-shadow(0 0 10px rgba(199,125,255,0.9))' }} />
      default:
        return <Mic className="w-8 h-8" style={{ color: '#d0b8ff', filter: 'drop-shadow(0 0 6px rgba(123,47,255,0.7))' }} />
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
          !isSupported          ? 'Voice requires Chrome or Edge' :
          state === 'listening' ? 'Stop listening' :
          state === 'speaking'  ? 'Stop speaking'  :
          'Activate Jarvis'
        }
        title={!isSupported ? 'Voice requires Chrome or Edge' : undefined}
        className="block p-0 bg-transparent border-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-purple-500/60"
        style={{
          cursor: isSupported ? 'pointer' : 'not-allowed',
          opacity: isSupported ? 1 : 0.45,
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e =>  { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e =>    { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
      >
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{ display: 'block' }}
        />

        {/* Icon overlay centered */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {renderIcon()}
        </div>
      </button>

      {!isSupported && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
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
