'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface Particle {
  theta: number
  sinPhi: number
  cosPhi: number
  r: number; g: number; b: number
  size: number
  ts: number
  tp: number
}

interface Jiggle {
  dx: number; dy: number
  vx: number; vy: number
  inside: boolean
}

// Fibonacci sphere distribution — 420 particles on surface
const PARTICLES: Particle[] = (() => {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const out: Particle[] = []
  // Seed-like deterministic random using golden ratio
  let seed = 0.6180339887
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  for (let i = 0; i < 420; i++) {
    const y  = 1 - (i / 419) * 2
    const rr = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    const pr = 130 + Math.floor(rand() * 90)   // 130–220
    const pg = 10  + Math.floor(rand() * 55)    // 10–65
    const pb = 195 + Math.floor(rand() * 60)    // 195–255
    out.push({
      theta:  th,
      sinPhi: rr,
      cosPhi: y,
      r: pr, g: pg, b: pb,
      size: 0.7 + rand() * 1.5,
      ts:   rand() * Math.PI * 2,
      tp:   rand() * Math.PI * 2,
    })
  }
  return out
})()

// 12 thin plasma tendrils
const TENDRILS = [
  { phase: 0.00, speed: 0.31, r: 205, g: 55,  b: 255, width: 2.5 },
  { phase: 1.05, speed: 0.26, r: 245, g: 22,  b: 222, width: 2.0 },
  { phase: 2.10, speed: 0.38, r: 165, g: 35,  b: 255, width: 2.8 },
  { phase: 3.14, speed: 0.22, r: 255, g: 85,  b: 212, width: 1.8 },
  { phase: 0.52, speed: 0.44, r: 182, g: 22,  b: 248, width: 2.2 },
  { phase: 1.57, speed: 0.29, r: 222, g: 12,  b: 255, width: 2.8 },
  { phase: 2.62, speed: 0.35, r: 255, g: 42,  b: 202, width: 2.0 },
  { phase: 3.67, speed: 0.41, r: 142, g: 62,  b: 255, width: 3.2 },
  { phase: 0.26, speed: 0.27, r: 202, g: 32,  b: 242, width: 2.3 },
  { phase: 1.31, speed: 0.33, r: 255, g: 62,  b: 232, width: 1.7 },
  { phase: 2.36, speed: 0.48, r: 172, g: 42,  b: 255, width: 2.5 },
  { phase: 4.19, speed: 0.24, r: 242, g: 22,  b: 248, width: 2.0 },
]

const BEAM_ANGLES = [0.12, 1.10, 1.88, 2.72, 3.48, 4.32]

interface SP { sm: number; gm: number; rr: number; rg: number; rb: number }
const STATE_P: Record<AssistantState, SP> = {
  idle:       { sm: 0.70, gm: 1.00, rr: 95,  rg: 30,  rb: 220 },
  wake:       { sm: 0.90, gm: 1.15, rr: 115, rg: 45,  rb: 235 },
  listening:  { sm: 1.60, gm: 1.45, rr: 255, rg: 45,  rb: 156 },
  processing: { sm: 2.00, gm: 1.55, rr: 0,   rg: 212, rb: 255 },
  speaking:   { sm: 2.50, gm: 1.95, rr: 200, rg: 118, rb: 255 },
  error:      { sm: 1.80, gm: 1.60, rr: 255, rg: 68,  rb: 68  },
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const tRef      = useRef(0)
  const stateRef  = useRef(state)
  const jigRef    = useRef<Jiggle>({ dx: 0, dy: 0, vx: 0, vy: 0, inside: false })

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    const W = 360, H = 360
    const cx = 180, cy = 180, R = 115

    const onMove = (e: MouseEvent) => {
      const rect  = canvas.getBoundingClientRect()
      const scale = W / rect.width
      const mx    = (e.clientX - rect.left) * scale
      const my    = (e.clientY - rect.top)  * scale
      const dist  = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)
      const j     = jigRef.current
      j.inside = dist < R * 1.1
      if (dist < R) {
        j.vx += ((mx - cx) / R) * 2.4
        j.vy += ((my - cy) / R) * 2.4
      }
    }
    const onLeave = () => { jigRef.current.inside = false }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    // ── Draw helpers ──────────────────────────────────────────────────────────

    function drawBeams(t: number, rr: number, rg: number, rb: number, gm: number) {
      const spread = 0.022
      for (const angle of BEAM_ANGLES) {
        const len = R * (1.80 + Math.sin(t * 0.65 + angle) * 0.28)
        for (let k = -2; k <= 2; k++) {
          const a   = angle + k * spread
          const x1  = cx + Math.cos(a) * (R + 1)
          const y1  = cy + Math.sin(a) * (R + 1)
          const x2  = cx + Math.cos(a) * (R + len)
          const y2  = cy + Math.sin(a) * (R + len)
          const grad = ctx.createLinearGradient(x1, y1, x2, y2)
          const alpha = (0.28 - Math.abs(k) * 0.07) * gm
          grad.addColorStop(0,   `rgba(${rr},${rg},${rb},${alpha})`)
          grad.addColorStop(0.4, `rgba(${rr},${rg},${rb},${alpha * 0.45})`)
          grad.addColorStop(1,   `rgba(${rr},${rg},${rb},0)`)
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = grad
          ctx.lineWidth   = k === 0 ? 1.6 : 0.7
          ctx.stroke()
        }
      }
    }

    function drawParticles(t: number, sm: number, gm: number, j: Jiggle) {
      const rot = t * 0.055 * sm
      ctx.globalCompositeOperation = 'screen'
      for (const p of PARTICLES) {
        const theta  = p.theta + rot
        const px3    = p.sinPhi * Math.cos(theta)
        const py3    = p.cosPhi
        const pz3    = p.sinPhi * Math.sin(theta)

        // Skip back hemisphere (facing away)
        if (pz3 < -0.12) continue

        const sx = cx + px3 * R * 0.96 + j.dx * 0.18
        const sy = cy + py3 * R * 0.96 + j.dy * 0.18

        const twinkle = 0.45 + Math.sin(t * 2.1 + p.ts) * 0.30 + Math.sin(t * 3.7 + p.tp) * 0.25
        const depth   = 0.35 + pz3 * 0.65
        const alpha   = Math.min(1, twinkle * depth * gm * 0.72)
        if (alpha < 0.02) continue

        const sz = Math.max(0.3, p.size * (0.55 + pz3 * 0.55))
        ctx.beginPath()
        ctx.arc(sx, sy, sz, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    function drawTendrils(t: number, sm: number, gm: number, j: Jiggle) {
      ctx.globalCompositeOperation = 'screen'
      ctx.lineCap = 'round'
      for (const td of TENDRILS) {
        const { phase: p, speed: s, r, g: gv, b, width } = td
        const startA = p + t * s * sm * 0.42
        const endA   = startA + Math.PI + Math.sin(t * s * 0.6 + p) * 0.55

        const wave1 = 0.80 + Math.sin(t * s * 0.8  + p) * 0.12
        const wave2 = 0.80 + Math.cos(t * s * 0.75 + p * 1.1) * 0.12

        const x1 = cx + Math.cos(startA) * R * wave1 + j.dx * 0.25
        const y1 = cy + Math.sin(startA) * R * wave1 + j.dy * 0.25
        const x2 = cx + Math.cos(endA)   * R * wave2 + j.dx * 0.25
        const y2 = cy + Math.sin(endA)   * R * wave2 + j.dy * 0.25

        // Control point orbits the center
        const cpA = startA + Math.PI * 0.5 + t * s * 0.55
        const cpR = R * (0.22 + Math.abs(Math.sin(t * s * 0.45 + p)) * 0.30)
        const cpx = cx + Math.cos(cpA) * cpR
        const cpy = cy + Math.sin(cpA) * cpR

        const alpha = (0.32 + Math.sin(t * s * 0.9 + p) * 0.14) * gm

        // Glow pass
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(cpx, cpy, x2, y2)
        ctx.strokeStyle = `rgba(${r},${gv},${b},${alpha * 0.28})`
        ctx.lineWidth   = width * 4.5
        ctx.stroke()

        // Core pass
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(cpx, cpy, x2, y2)
        ctx.strokeStyle = `rgba(${r},${gv},${b},${alpha})`
        ctx.lineWidth   = width
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Frame loop ─────────────────────────────────────────────────────────────
    function drawFrame() {
      const t = tRef.current
      const s = stateRef.current
      const { sm, gm, rr, rg, rb } = STATE_P[s]
      const j = jigRef.current

      // Spring physics
      j.vx -= j.dx * 0.10; j.vy -= j.dy * 0.10
      j.dx += j.vx;        j.dy += j.vy
      j.vx *= 0.87;        j.vy *= 0.87

      ctx.clearRect(0, 0, W, H)

      // 1. Ambient outer glow
      const og = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R * 2.05)
      og.addColorStop(0,   `rgba(${rr},${rg},${rb},${0.24 * gm})`)
      og.addColorStop(0.3, `rgba(${rr},${rg},${rb},${0.10 * gm})`)
      og.addColorStop(0.6, `rgba(${rr},${rg},${rb},${0.03 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // 2. Sphere (clipped)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx + j.dx * 0.15, cy + j.dy * 0.15, R, 0, Math.PI * 2)
      ctx.clip()

      // Base fill: deep purple-black
      const bg = ctx.createRadialGradient(cx - R*0.18, cy - R*0.18, 0, cx, cy, R)
      bg.addColorStop(0,    '#26004e')
      bg.addColorStop(0.32, '#150030')
      bg.addColorStop(0.68, '#08001c')
      bg.addColorStop(1,    '#030008')
      ctx.fillStyle = bg
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Inner energy core (breathes)
      const breathe = 0.28 + Math.sin(t * 1.4 * sm) * 0.07
      const core    = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * breathe)
      core.addColorStop(0,   `rgba(${rr},${rg},${rb},0.35)`)
      core.addColorStop(0.4, `rgba(${rr},${rg},${rb},0.12)`)
      core.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = core
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Particle dust field
      drawParticles(t, sm, gm, j)

      // Plasma tendrils
      drawTendrils(t, sm, gm, j)

      // Dark glass center reflection
      const darkC = ctx.createRadialGradient(cx - R*0.06, cy - R*0.06, 0, cx, cy, R * 0.50)
      darkC.addColorStop(0,   'rgba(0,0,0,0.50)')
      darkC.addColorStop(0.5, 'rgba(0,0,0,0.26)')
      darkC.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = darkC
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Edge vignette
      const vig = ctx.createRadialGradient(cx, cy, R * 0.44, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.52, 'rgba(0,0,0,0.06)')
      vig.addColorStop(0.80, 'rgba(0,0,0,0.52)')
      vig.addColorStop(1,    'rgba(0,0,0,0.96)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      // Glass specular (upper-left)
      const spec = ctx.createRadialGradient(cx - R*0.38, cy - R*0.42, 0, cx - R*0.26, cy - R*0.30, R * 0.52)
      spec.addColorStop(0,    'rgba(255,255,255,0.26)')
      spec.addColorStop(0.30, 'rgba(255,255,255,0.09)')
      spec.addColorStop(0.65, 'rgba(255,255,255,0.02)')
      spec.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(cx - R - 20, cy - R - 20, R * 2 + 40, R * 2 + 40)

      ctx.restore()

      // 3. Outward energy beams
      drawBeams(t * sm, rr, rg, rb, gm)

      // 4. Rim lighting
      const rimH = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.22)
      rimH.addColorStop(0,   'rgba(0,0,0,0)')
      rimH.addColorStop(0.5, `rgba(${rr},${rg},${rb},${0.28 * gm})`)
      rimH.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = rimH
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill()

      for (let i = 4; i >= 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + i * 2.0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.44 - i * 0.08) * gm})`
        ctx.lineWidth   = 1.8 - i * 0.30
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.18 * gm})`
      ctx.lineWidth   = 0.8
      ctx.stroke()

      // 5. State effects
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * sm * 0.38 + k * 0.33) % 1)
          ctx.beginPath()
          ctx.arc(cx, cy, R * (1.02 + prog * 0.82), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,45,156,${(1 - prog) * 0.36})`
          ctx.lineWidth   = 1.2
          ctx.stroke()
        }
      }
      if (s === 'speaking') {
        const pa = (Math.sin(t * 9.5 * sm) + 1) * 0.5 * 0.55
        ctx.beginPath()
        ctx.arc(cx, cy, R * (1.02 + 0.05 * Math.sin(t * 9.5 * sm)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(200,120,255,${pa})`
        ctx.lineWidth   = 2.8
        ctx.stroke()
      }

      // 6. Holographic ground shadow
      ctx.save()
      ctx.translate(cx, cy + R * 1.58)
      ctx.scale(1, 0.08)
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(0, 0, R * (0.40 + i * 0.16), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.18 - i * 0.038) * gm})`
        ctx.lineWidth   = 1.0 - i * 0.20
        ctx.stroke()
      }
      ctx.restore()

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(drawFrame)
    }

    rafRef.current = requestAnimationFrame(drawFrame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const icon = () => {
    if (!isSupported) return <MicOff style={{ width: 26, height: 26, color: '#64748b' }} />
    switch (state) {
      case 'listening':  return <Mic     style={{ width: 26, height: 26, color: '#ffe0f5', filter: 'drop-shadow(0 0 8px rgba(255,45,156,0.9))' }} />
      case 'processing': return <Loader2 style={{ width: 26, height: 26, color: '#e8d0ff', filter: 'drop-shadow(0 0 8px rgba(140,80,255,0.9))' }} className="animate-spin" />
      case 'wake':       return <Radio   style={{ width: 26, height: 26, color: '#ded0ff', filter: 'drop-shadow(0 0 6px rgba(130,70,255,0.8))' }} />
      case 'speaking':   return <Radio   style={{ width: 26, height: 26, color: '#f0d8ff', filter: 'drop-shadow(0 0 8px rgba(200,120,255,0.9))' }} />
      default:           return <Mic     style={{ width: 26, height: 26, color: '#d0c8ff', filter: 'drop-shadow(0 0 5px rgba(110,55,255,0.7))' }} />
    }
  }

  return (
    <div className="relative select-none" style={{ animation: 'float 5s ease-in-out infinite' }}>
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        className="block p-0 bg-transparent border-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-purple-500/60"
        style={{ cursor: isSupported ? 'pointer' : 'not-allowed', opacity: isSupported ? 1 : 0.45, transition: 'transform 0.15s ease' }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e  => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e    => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        aria-label={
          !isSupported       ? 'Voice requires Chrome or Edge'
          : state === 'listening' ? 'Stop listening'
          : state === 'speaking'  ? 'Stop speaking'
          : 'Activate Jarvis'
        }
      >
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          style={{ display: 'block', width: 'min(360px, calc(100vw - 48px))', height: 'auto' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {icon()}
        </div>
      </button>

      {!isSupported && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-widest uppercase px-3 py-1 rounded-full pointer-events-none whitespace-nowrap"
          style={{ background: 'rgba(5,0,18,0.9)', border: '1px solid rgba(130,60,255,0.25)', color: 'rgba(170,130,255,0.65)' }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
