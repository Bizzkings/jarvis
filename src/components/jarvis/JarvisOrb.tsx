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
  radius: number
  tilt: number
  phase: number
  speed: number
  r: number; g: number; b: number
  lw: number
}

const RINGS: Ring[] = [
  { radius: 158, tilt:  0.28, phase: 0.0,  speed:  0.048, r: 75,  g: 5,   b: 195, lw: 1.4 },
  { radius: 144, tilt: -0.55, phase: 1.5,  speed: -0.080, r: 45,  g: 15,  b: 235, lw: 1.2 },
  { radius: 138, tilt:  0.13, phase: 0.9,  speed: -0.055, r: 20,  g: 75,  b: 240, lw: 1.0 },
  { radius: 132, tilt:  0.72, phase: 2.8,  speed:  0.108, r: 130, g: 0,   b: 250, lw: 1.5 },
  { radius: 124, tilt:  0.48, phase: 2.1,  speed:  0.092, r: 0,   g: 155, b: 255, lw: 1.3 },
]

interface StateParams {
  rimR: number; rimG: number; rimB: number
  aurR: number; aurG: number; aurB: number
  speedMult: number
  glowMult: number
}

const STATE_PARAMS: Record<AssistantState, StateParams> = {
  idle:       { rimR: 80,  rimG: 20,  rimB: 204, aurR: 80,  aurG: 20,  aurB: 200, speedMult: 0.70, glowMult: 1.00 },
  wake:       { rimR: 104, rimG: 32,  rimB: 221, aurR: 100, aurG: 40,  aurB: 220, speedMult: 0.90, glowMult: 1.15 },
  listening:  { rimR: 255, rimG: 45,  rimB: 156, aurR: 200, aurG: 0,   aurB: 120, speedMult: 1.60, glowMult: 1.40 },
  processing: { rimR: 0,   rimG: 212, rimB: 255, aurR: 0,   aurG: 150, aurB: 220, speedMult: 2.00, glowMult: 1.50 },
  speaking:   { rimR: 199, rimG: 125, rimB: 255, aurR: 130, aurG: 50,  aurB: 230, speedMult: 2.50, glowMult: 1.90 },
  error:      { rimR: 255, rimG: 68,  rimB: 68,  aurR: 200, aurG: 0,   aurB: 0,   speedMult: 1.80, glowMult: 1.55 },
}

// Precomputed aurora blob offsets so they don't move identically
const AURORA_SEEDS = [
  { ox: -0.15, oy: -0.25, sz: 0.55, ts: 0.38, tp: 0.0  },
  { ox:  0.20, oy:  0.10, sz: 0.48, ts: 0.44, tp: 1.3  },
  { ox: -0.10, oy:  0.30, sz: 0.42, ts: 0.31, tp: 2.5  },
  { ox:  0.05, oy: -0.05, sz: 0.38, ts: 0.52, tp: 0.7  },
  { ox: -0.22, oy:  0.15, sz: 0.35, ts: 0.29, tp: 3.8  },
]

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const tRef      = useRef(0)
  const stateRef  = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    const W  = 360
    const H  = 360
    const cx = 180
    const cy = 180
    const R  = 110   // sphere radius

    function drawRingArc(
      ring: Ring,
      orbitAngle: number,
      startA: number,
      endA: number,
      alphaMult: number,
      glowMult: number,
    ) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(orbitAngle)
      ctx.scale(1, Math.cos(ring.tilt))

      // Glow pass
      ctx.beginPath()
      ctx.arc(0, 0, ring.radius, startA, endA)
      ctx.strokeStyle = `rgba(${ring.r},${ring.g},${ring.b},${0.15 * alphaMult * glowMult})`
      ctx.lineWidth = ring.lw * 7
      ctx.lineCap = 'round'
      ctx.stroke()

      // Core pass
      ctx.beginPath()
      ctx.arc(0, 0, ring.radius, startA, endA)
      ctx.strokeStyle = `rgba(${ring.r},${ring.g},${ring.b},${alphaMult * glowMult})`
      ctx.lineWidth = ring.lw
      ctx.stroke()

      ctx.restore()
    }

    function drawSpark(
      ring: Ring,
      orbitAngle: number,
      sparkAngle: number,
      glowMult: number,
    ) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(orbitAngle)
      ctx.scale(1, Math.cos(ring.tilt))

      const sx = Math.cos(sparkAngle) * ring.radius
      const sy = Math.sin(sparkAngle) * ring.radius

      // Halo
      ctx.beginPath()
      ctx.arc(sx, sy, 5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${ring.r},${ring.g},${ring.b},${0.40 * glowMult})`
      ctx.fill()

      // Core dot
      ctx.beginPath()
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fill()

      ctx.restore()
    }

    function drawFrame() {
      const t  = tRef.current
      const s  = stateRef.current
      const sp = STATE_PARAMS[s]
      const sm = sp.speedMult
      const gm = sp.glowMult
      const { rimR, rimG, rimB, aurR, aurG, aurB } = sp

      ctx.clearRect(0, 0, W, H)

      // ── 1. Ambient outer glow ─────────────────────────────────────────────
      const og = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.85)
      og.addColorStop(0,   `rgba(${rimR},${rimG},${rimB},${0.18 * gm})`)
      og.addColorStop(0.45, `rgba(${rimR},${rimG},${rimB},${0.07 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // ── 2. Back ring arcs (behind sphere) ─────────────────────────────────
      ctx.globalCompositeOperation = 'screen'

      for (const ring of RINGS) {
        const oa = ring.phase + t * ring.speed * sm
        const sa = t * ring.speed * sm * 3.5 + ring.phase  // spark angle

        // Back arc: PI → 2*PI (goes through top = away from viewer)
        drawRingArc(ring, oa, Math.PI, Math.PI * 2, 0.30, gm)

        // Spark on back if in back half (sin < 0 = top half)
        if (Math.sin(sa) < 0) drawSpark(ring, oa, sa, gm * 0.55)
      }

      ctx.globalCompositeOperation = 'source-over'

      // ── 3. Solid sphere ───────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      // Base: deep dark gradient (physically solid ball — NOT transparent)
      const base = ctx.createRadialGradient(cx - R * 0.18, cy - R * 0.18, 0, cx, cy, R)
      base.addColorStop(0,   '#22004a')
      base.addColorStop(0.35, '#12002e')
      base.addColorStop(0.70, '#08001a')
      base.addColorStop(1,   '#030008')
      ctx.fillStyle = base
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Inner energy core (breathes)
      const breathe = 0.40 + Math.sin(t * 1.4) * 0.06
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * breathe)
      core.addColorStop(0,   `rgba(${aurR + 60},${aurG + 30},${aurB + 60},0.45)`)
      core.addColorStop(0.45, `rgba(${aurR},${aurG},${aurB},0.18)`)
      core.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Aurora blobs (screen blend — additive inner glow)
      ctx.globalCompositeOperation = 'screen'
      for (const seed of AURORA_SEEDS) {
        const bx = cx + seed.ox * R + Math.cos(t * seed.ts + seed.tp) * R * 0.12
        const by = cy + seed.oy * R + Math.sin(t * seed.ts * 1.3 + seed.tp) * R * 0.10
        const br = seed.sz * R

        const blob = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        blob.addColorStop(0,   `rgba(${aurR},${aurG},${aurB},0.10)`)
        blob.addColorStop(0.5, `rgba(${aurR},${aurG},${aurB},0.04)`)
        blob.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.fillStyle = blob
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
      }
      ctx.globalCompositeOperation = 'source-over'

      // Edge vignette (makes sphere look THICK and SOLID)
      const vig = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.62, 'rgba(0,0,0,0.08)')
      vig.addColorStop(0.85, 'rgba(0,0,0,0.45)')
      vig.addColorStop(1,    'rgba(0,0,0,0.88)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Glass specular (upper-left — key 3D cue)
      const spec = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.42, 0,
        cx - R * 0.30, cy - R * 0.34, R * 0.52,
      )
      spec.addColorStop(0,    'rgba(255,255,255,0.28)')
      spec.addColorStop(0.30, 'rgba(255,255,255,0.08)')
      spec.addColorStop(0.65, 'rgba(255,255,255,0.02)')
      spec.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Secondary soft specular (lower-right, subtle counter-light)
      const spec2 = ctx.createRadialGradient(
        cx + R * 0.35, cy + R * 0.38, 0,
        cx + R * 0.30, cy + R * 0.32, R * 0.35,
      )
      spec2.addColorStop(0, `rgba(${rimR},${rimG},${rimB},0.06)`)
      spec2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = spec2
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      ctx.restore()   // end sphere clip

      // ── Rim lighting (KEY to 3D depth) ────────────────────────────────────
      for (let i = 3; i >= 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + i * 2.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rimR},${rimG},${rimB},${(0.28 - i * 0.06) * gm})`
        ctx.lineWidth = 2.2 - i * 0.4
        ctx.stroke()
      }

      // ── 4. Front ring arcs (in front of sphere) ───────────────────────────
      ctx.globalCompositeOperation = 'screen'

      for (const ring of RINGS) {
        const oa = ring.phase + t * ring.speed * sm
        const sa = t * ring.speed * sm * 3.5 + ring.phase

        // Front arc: 0 → PI (goes through bottom = toward viewer, brighter)
        drawRingArc(ring, oa, 0, Math.PI, 0.70, gm)

        // Spark on front if in front half (sin > 0 = bottom half)
        if (Math.sin(sa) > 0) drawSpark(ring, oa, sa, gm)
      }

      ctx.globalCompositeOperation = 'source-over'

      // ── 5. Holographic ground platform ───────────────────────────────────
      const groundY = cy + R * 1.45
      ctx.save()
      ctx.translate(cx, groundY)
      ctx.scale(1, 0.10)
      for (let i = 0; i < 3; i++) {
        const gr = R * (0.55 + i * 0.18)
        ctx.beginPath()
        ctx.arc(0, 0, gr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rimR},${rimG},${rimB},${(0.14 - i * 0.04) * gm})`
        ctx.lineWidth = 1.2 - i * 0.25
        ctx.stroke()
      }
      ctx.restore()

      // ── 6. State effect overlays ──────────────────────────────────────────

      // Listening: expanding ripple rings
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * 0.65 + k * 0.33) % 1)
          ctx.beginPath()
          ctx.arc(cx, cy, R * (1.02 + prog * 0.7), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,45,156,${(1 - prog) * 0.38})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      // Speaking: rim pulse
      if (s === 'speaking') {
        const pa = (Math.sin(t * 9.5) + 1) * 0.5 * 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, R * (1.02 + 0.04 * Math.sin(t * 9.5)), 0, Math.PI * 2)
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
      case 'listening':
        return <Mic     className="w-7 h-7" style={{ color: '#ffe0f5', filter: 'drop-shadow(0 0 8px rgba(255,45,156,0.9))' }} />
      case 'processing':
        return <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#a0f0ff', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.9))' }} />
      case 'wake':
        return <Radio   className="w-7 h-7" style={{ color: '#c8f0ff', filter: 'drop-shadow(0 0 6px rgba(0,200,255,0.8))' }} />
      case 'speaking':
        return <Radio   className="w-7 h-7" style={{ color: '#e8d0ff', filter: 'drop-shadow(0 0 8px rgba(199,125,255,0.9))' }} />
      default:
        return <Mic     className="w-7 h-7" style={{ color: '#c0e8ff', filter: 'drop-shadow(0 0 5px rgba(0,200,255,0.6))' }} />
    }
  }

  return (
    <div className="relative select-none" style={{ animation: 'float 5s ease-in-out infinite' }}>
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        className="block p-0 bg-transparent border-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-cyan-500/60"
        style={{
          cursor:     isSupported ? 'pointer' : 'not-allowed',
          opacity:    isSupported ? 1 : 0.45,
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e  => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e    => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        aria-label={
          !isSupported          ? 'Voice requires Chrome or Edge' :
          state === 'listening' ? 'Stop listening' :
          state === 'speaking'  ? 'Stop speaking'  :
          'Activate Jarvis'
        }
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          style={{ display: 'block', width: 'min(360px, calc(100vw - 48px))', height: 'auto' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {renderIcon()}
        </div>
      </button>

      {!isSupported && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
          style={{
            background: 'rgba(0,10,28,0.9)',
            border:     '1px solid rgba(0,212,255,0.2)',
            color:      'rgba(0,180,255,0.6)',
          }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
