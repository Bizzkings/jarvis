'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface Jiggle { dx: number; dy: number; vx: number; vy: number }

// ── 8 thick plasma ribbon streams ─────────────────────────────────────────────
// Each sweeps ~3 revolutions inside the sphere → chaotic loop pattern
const PLASMAS = [
  { phase: 0.00, speed: 0.19, r: 218, g: 38,  b: 255, width: 18, loops: 3.2 },
  { phase: 1.10, speed: 0.15, r: 255, g: 62,  b: 228, width: 22, loops: 2.8 },
  { phase: 2.20, speed: 0.23, r: 188, g: 28,  b: 255, width: 14, loops: 3.7 },
  { phase: 3.30, speed: 0.18, r: 240, g: 82,  b: 255, width: 17, loops: 2.5 },
  { phase: 0.55, speed: 0.26, r: 255, g: 48,  b: 210, width: 12, loops: 3.4 },
  { phase: 1.65, speed: 0.13, r: 198, g: 18,  b: 255, width: 20, loops: 3.0 },
  { phase: 2.75, speed: 0.30, r: 255, g: 88,  b: 242, width: 13, loops: 2.6 },
  { phase: 4.40, speed: 0.16, r: 208, g: 44,  b: 255, width: 16, loops: 3.8 },
]

// ── 700 surface sparkle particles (Fibonacci sphere) ─────────────────────────
const PARTICLES = (() => {
  const phi = Math.PI * (3 - Math.sqrt(5))
  let s = 0.618033988
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  return Array.from({ length: 700 }, (_, i) => {
    const y  = 1 - (i / 699) * 2
    const sr = Math.sqrt(Math.max(0, 1 - y * y))
    const th = phi * i
    return {
      theta: th, sinPhi: sr, cosPhi: y,
      r: 200 + Math.floor(rng() * 55),
      g: 30  + Math.floor(rng() * 60),
      b: 210 + Math.floor(rng() * 45),
      size: 0.5 + rng() * 1.8,
      ts: rng() * Math.PI * 2,
      tp: rng() * Math.PI * 2,
      // some particles are white flashes
      white: rng() > 0.82,
    }
  })
})()

// ── 8 equatorial energy beam bundles ─────────────────────────────────────────
const BEAM_ANGLES = [0.18, 0.95, 1.72, 2.20, 2.88, 3.55, 4.28, 5.05]

interface SP { sm: number; gm: number; rr: number; rg: number; rb: number }
const STATE_P: Record<AssistantState, SP> = {
  idle:       { sm: 0.65, gm: 1.00, rr: 92,  rg: 28,  rb: 218 },
  wake:       { sm: 0.85, gm: 1.18, rr: 112, rg: 44,  rb: 235 },
  listening:  { sm: 1.65, gm: 1.50, rr: 255, rg: 45,  rb: 155 },
  processing: { sm: 2.10, gm: 1.60, rr: 0,   rg: 210, rb: 255 },
  speaking:   { sm: 2.60, gm: 2.05, rr: 200, rg: 115, rb: 255 },
  error:      { sm: 1.85, gm: 1.65, rr: 255, rg: 65,  rb: 65  },
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const tRef      = useRef(0)
  const stateRef  = useRef(state)
  const jigRef    = useRef<Jiggle>({ dx: 0, dy: 0, vx: 0, vy: 0 })

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    const W = 380, H = 380, cx = 190, cy = 190, R = 142

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx   = (e.clientX - rect.left) * (W / rect.width)
      const my   = (e.clientY - rect.top)  * (H / rect.height)
      const dist = Math.hypot(mx - cx, my - cy)
      if (dist < R) {
        jigRef.current.vx += ((mx - cx) / R) * 2.8
        jigRef.current.vy += ((my - cy) / R) * 2.8
      }
    }
    canvas.addEventListener('mousemove', onMove)

    // ── Build 80-point plasma spline path ────────────────────────────────────
    function buildPlasmaPath(
      phase: number, speed: number, loops: number,
      t: number, sm: number, j: Jiggle
    ): [number, number][] {
      const N = 80
      const pts: [number, number][] = []
      const p = phase, s = speed
      for (let i = 0; i <= N; i++) {
        const u     = i / N
        const sweep = u * Math.PI * 2 * loops + p

        // Radius: oscillates between ~0.18R and ~0.90R
        const rad = R * Math.max(0.10, Math.min(0.91,
          0.58
          + Math.sin(sweep * 0.88 + t * s * sm * 1.10 + p      ) * 0.23
          + Math.cos(sweep * 1.42 + t * s * sm * 0.72 + p * 1.3) * 0.15
          + Math.sin(sweep * 2.18 + t * s * sm * 0.44 + p * 0.7) * 0.09
        ))

        // Angular wobble — creates the crossing-over loop shapes
        const wobble =
          Math.sin(sweep * 0.62 + t * s * sm * 0.88 + p * 0.9) * 0.82
          + Math.cos(sweep * 1.21 + t * s * sm * 0.55 + p * 1.4) * 0.52

        const a = sweep + wobble
        pts.push([
          cx + Math.cos(a) * rad + j.dx * 0.28,
          cy + Math.sin(a) * rad + j.dy * 0.28,
        ])
      }
      return pts
    }

    // ── Draw spline as smooth quadratic bezier chain ──────────────────────────
    function strokeSpline(pts: [number, number][]) {
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) * 0.5
        const my = (pts[i][1] + pts[i + 1][1]) * 0.5
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
      }
      const last = pts[pts.length - 1]
      ctx.lineTo(last[0], last[1])
    }

    function drawPlasmaPaths(t: number, sm: number, gm: number, j: Jiggle) {
      ctx.globalCompositeOperation = 'screen'
      ctx.lineCap = 'round'
      for (const pl of PLASMAS) {
        const { phase, speed, loops, r, g: gv, b, width } = pl
        const pts = buildPlasmaPath(phase, speed, loops, t, sm, j)

        // Pass 1 – wide outer glow
        strokeSpline(pts)
        ctx.strokeStyle = `rgba(${r},${gv},${b},${0.07 * gm})`
        ctx.lineWidth   = width * 7
        ctx.stroke()

        // Pass 2 – mid glow
        strokeSpline(pts)
        ctx.strokeStyle = `rgba(${r},${gv},${b},${0.22 * gm})`
        ctx.lineWidth   = width * 2.4
        ctx.stroke()

        // Pass 3 – bright neon core
        strokeSpline(pts)
        const cr = Math.min(255, r + 45)
        const cg = Math.min(255, gv + 55)
        const cb = Math.min(255, b + 30)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.78 * gm})`
        ctx.lineWidth   = width * 0.30
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Surface sparkle particles ─────────────────────────────────────────────
    function drawParticles(t: number, sm: number, gm: number, j: Jiggle) {
      const rot = t * 0.045 * sm
      ctx.globalCompositeOperation = 'screen'
      for (const p of PARTICLES) {
        const theta = p.theta + rot
        const px3   = p.sinPhi * Math.cos(theta)
        const py3   = p.cosPhi
        const pz3   = p.sinPhi * Math.sin(theta)
        if (pz3 < -0.10) continue

        const sx = cx + px3 * R * 0.97 + j.dx * 0.15
        const sy = cy + py3 * R * 0.97 + j.dy * 0.15

        const twinkle = 0.4 + Math.sin(t * 2.1 + p.ts) * 0.34 + Math.sin(t * 3.6 + p.tp) * 0.26
        const depth   = 0.30 + pz3 * 0.70
        const alpha   = Math.min(1, twinkle * depth * gm * 0.85)
        if (alpha < 0.03) continue

        const sz = Math.max(0.3, p.size * (0.5 + pz3 * 0.6))
        ctx.beginPath()
        ctx.arc(sx, sy, sz, 0, Math.PI * 2)
        ctx.fillStyle = p.white
          ? `rgba(240,220,255,${alpha * 0.9})`
          : `rgba(${p.r},${p.g},${p.b},${alpha})`
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Outward energy beams (after sphere restore) ───────────────────────────
    function drawBeams(t: number, sm: number, rr: number, rg: number, rb: number, gm: number) {
      for (const angle of BEAM_ANGLES) {
        const len    = R * (1.65 + Math.sin(t * 0.7 + angle) * 0.30)
        const spread = 0.018
        for (let k = -2; k <= 2; k++) {
          const a    = angle + k * spread
          const x1   = cx + Math.cos(a) * (R + 2)
          const y1   = cy + Math.sin(a) * (R + 2)
          const x2   = cx + Math.cos(a) * (R + len)
          const y2   = cy + Math.sin(a) * (R + len)
          const grad = ctx.createLinearGradient(x1, y1, x2, y2)
          const a0   = (0.30 - Math.abs(k) * 0.07) * gm
          grad.addColorStop(0,    `rgba(${rr},${rg},${rb},${a0})`)
          grad.addColorStop(0.35, `rgba(${rr},${rg},${rb},${a0 * 0.50})`)
          grad.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`)
          ctx.beginPath()
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
          ctx.strokeStyle = grad
          ctx.lineWidth   = k === 0 ? 1.4 : 0.6
          ctx.stroke()
        }
      }
    }

    // ── Main draw loop ────────────────────────────────────────────────────────
    function drawFrame() {
      const t = tRef.current
      const s = stateRef.current
      const { sm, gm, rr, rg, rb } = STATE_P[s]
      const j = jigRef.current

      // Spring physics
      j.vx -= j.dx * 0.10; j.vy -= j.dy * 0.10
      j.dx += j.vx;        j.dy += j.vy
      j.vx *= 0.86;        j.vy *= 0.86

      ctx.clearRect(0, 0, W, H)

      // 1 – Outer atmospheric glow
      const og = ctx.createRadialGradient(cx, cy, R * 0.70, cx, cy, R * 2.10)
      og.addColorStop(0,   `rgba(${rr},${rg},${rb},${0.28 * gm})`)
      og.addColorStop(0.3, `rgba(${rr},${rg},${rb},${0.12 * gm})`)
      og.addColorStop(0.6, `rgba(${rr},${rg},${rb},${0.04 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // 2 – Sphere clip region
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx + j.dx * 0.12, cy + j.dy * 0.12, R, 0, Math.PI * 2)
      ctx.clip()

      // Base fill — deep purple-black glass
      const bg = ctx.createRadialGradient(cx - R * 0.16, cy - R * 0.16, 0, cx, cy, R)
      bg.addColorStop(0,   '#2a0052')
      bg.addColorStop(0.3, '#180038')
      bg.addColorStop(0.7, '#0a001e')
      bg.addColorStop(1,   '#040008')
      ctx.fillStyle = bg
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Breathing energy core
      const breathe = 0.30 + Math.sin(t * 1.35 * sm) * 0.07
      const core    = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * breathe)
      core.addColorStop(0,   `rgba(${rr},${rg},${rb},0.40)`)
      core.addColorStop(0.4, `rgba(${rr},${rg},${rb},0.15)`)
      core.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Thick plasma ribbon streams
      drawPlasmaPaths(t, sm, gm, j)

      // Surface sparkle
      drawParticles(t, sm, gm, j)

      // Dark glass center reflection (sells the 3D glass look)
      const darkC = ctx.createRadialGradient(cx - R * 0.05, cy - R * 0.08, 0, cx, cy, R * 0.52)
      darkC.addColorStop(0,   'rgba(0,0,0,0.62)')
      darkC.addColorStop(0.4, 'rgba(0,0,0,0.35)')
      darkC.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = darkC
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Edge vignette — makes sphere feel thick/solid
      const vig = ctx.createRadialGradient(cx, cy, R * 0.42, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.50, 'rgba(0,0,0,0.08)')
      vig.addColorStop(0.80, 'rgba(0,0,0,0.55)')
      vig.addColorStop(1,    'rgba(0,0,0,0.97)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Glass specular highlight — upper left
      const spec = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.40, 0, cx - R * 0.24, cy - R * 0.28, R * 0.50)
      spec.addColorStop(0,    'rgba(255,255,255,0.28)')
      spec.addColorStop(0.30, 'rgba(255,255,255,0.10)')
      spec.addColorStop(0.65, 'rgba(255,255,255,0.02)')
      spec.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      ctx.restore()

      // 3 – Outward energy beams
      drawBeams(t, sm, rr, rg, rb, gm)

      // 4 – Rim lighting (critical for 3D depth)
      const rimH = ctx.createRadialGradient(cx, cy, R * 0.80, cx, cy, R * 1.24)
      rimH.addColorStop(0,   'rgba(0,0,0,0)')
      rimH.addColorStop(0.5, `rgba(${rr},${rg},${rb},${0.32 * gm})`)
      rimH.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = rimH
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2); ctx.fill()

      for (let i = 5; i >= 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + i * 1.8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.48 - i * 0.08) * gm})`
        ctx.lineWidth   = 1.8 - i * 0.28
        ctx.stroke()
      }
      // Inner bright glass edge
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * gm})`
      ctx.lineWidth   = 0.9; ctx.stroke()

      // 5 – State effects
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * sm * 0.38 + k * 0.33) % 1)
          ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + prog * 0.85), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,45,156,${(1 - prog) * 0.38})`
          ctx.lineWidth   = 1.2; ctx.stroke()
        }
      }
      if (s === 'speaking') {
        const pa = (Math.sin(t * 9 * sm) + 1) * 0.5 * 0.58
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + 0.055 * Math.sin(t * 9 * sm)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(210,120,255,${pa})`
        ctx.lineWidth   = 3.0; ctx.stroke()
      }

      // 6 – Holographic ground shadow
      ctx.save()
      ctx.translate(cx, cy + R * 1.60)
      ctx.scale(1, 0.07)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(0, 0, R * (0.38 + i * 0.15), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.20 - i * 0.036) * gm})`
        ctx.lineWidth   = 1.0 - i * 0.17; ctx.stroke()
      }
      ctx.restore()

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(drawFrame)
    }

    rafRef.current = requestAnimationFrame(drawFrame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [])

  const icon = () => {
    if (!isSupported) return <MicOff style={{ width: 28, height: 28, color: '#4a4060' }} />
    switch (state) {
      case 'listening':  return <Mic     style={{ width: 28, height: 28, color: '#ffe0f5', filter: 'drop-shadow(0 0 9px rgba(255,45,156,1))' }} />
      case 'processing': return <Loader2 style={{ width: 28, height: 28, color: '#ecd8ff', filter: 'drop-shadow(0 0 9px rgba(160,80,255,1))' }} className="animate-spin" />
      case 'wake':       return <Radio   style={{ width: 28, height: 28, color: '#dcd0ff', filter: 'drop-shadow(0 0 7px rgba(140,80,255,0.9))' }} />
      case 'speaking':   return <Radio   style={{ width: 28, height: 28, color: '#f2d8ff', filter: 'drop-shadow(0 0 9px rgba(210,120,255,1))' }} />
      default:           return <Mic     style={{ width: 28, height: 28, color: '#ccc0f0', filter: 'drop-shadow(0 0 6px rgba(120,60,255,0.8))' }} />
    }
  }

  return (
    <div
      className="relative select-none"
      style={{ animation: 'float 4s ease-in-out infinite', filter: 'drop-shadow(0 40px 60px rgba(100,20,255,0.35))' }}
    >
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        className="block p-0 bg-transparent border-0 outline-none rounded-full"
        style={{ cursor: isSupported ? 'pointer' : 'not-allowed', opacity: isSupported ? 1 : 0.45 }}
        aria-label={
          !isSupported            ? 'Voice requires Chrome or Edge'
          : state === 'listening' ? 'Stop listening'
          : state === 'speaking'  ? 'Stop speaking'
          : 'Activate Jarvis'
        }
      >
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          style={{ display: 'block', width: 'min(380px, calc(100vw - 48px))', height: 'auto' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {icon()}
        </div>
      </button>

      {!isSupported && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
          style={{ background: 'rgba(5,0,18,0.92)', border: '1px solid rgba(130,60,255,0.28)', color: 'rgba(180,140,255,0.68)' }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
