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

// ── Volumetric plasma blobs ────────────────────────────────────────────────────
// Large soft radial gradients that drift inside the sphere.
// Screen-blend makes overlaps glow brighter — this creates the aurora / plasma ball look.
const BLOBS = [
  // Large base blobs (deep blue-violet)
  { phase: 0.00, ax: 0.38, ay: 0.28, sr: 0.86, r: 28,  g: 38,  b: 220, al: 0.62, sx: 0.18, sy: 0.15 },
  { phase: 1.10, ax: 0.42, ay: 0.36, sr: 0.90, r: 108, g: 20,  b: 245, al: 0.65, sx: 0.22, sy: 0.19 },
  // Mid blobs (violet / purple)
  { phase: 2.20, ax: 0.46, ay: 0.42, sr: 0.78, r: 168, g: 26,  b: 255, al: 0.58, sx: 0.26, sy: 0.22 },
  { phase: 3.30, ax: 0.34, ay: 0.48, sr: 0.70, r: 240, g: 40,  b: 195, al: 0.50, sx: 0.30, sy: 0.26 },
  { phase: 0.55, ax: 0.50, ay: 0.34, sr: 0.74, r: 14,  g: 26,  b: 208, al: 0.58, sx: 0.20, sy: 0.17 },
  // Bright hot-spot blobs (pink-white → create the luminous concentration)
  { phase: 1.72, ax: 0.30, ay: 0.38, sr: 0.48, r: 232, g: 175, b: 255, al: 0.75, sx: 0.36, sy: 0.30 },
  { phase: 2.95, ax: 0.52, ay: 0.28, sr: 0.40, r: 255, g: 200, b: 255, al: 0.65, sx: 0.28, sy: 0.24 },
  { phase: 4.15, ax: 0.22, ay: 0.44, sr: 0.44, r: 198, g: 60,  b: 255, al: 0.60, sx: 0.32, sy: 0.28 },
]

interface SP { sm: number; gm: number; rr: number; rg: number; rb: number }
const STATE_P: Record<AssistantState, SP> = {
  idle:       { sm: 0.60, gm: 1.00, rr: 100, rg: 30,  rb: 225 },
  wake:       { sm: 0.80, gm: 1.18, rr: 118, rg: 45,  rb: 238 },
  listening:  { sm: 1.60, gm: 1.50, rr: 255, rg: 50,  rb: 158 },
  processing: { sm: 2.00, gm: 1.60, rr: 0,   rg: 200, rb: 255 },
  speaking:   { sm: 2.50, gm: 2.00, rr: 205, rg: 115, rb: 255 },
  error:      { sm: 1.80, gm: 1.65, rr: 255, rg: 65,  rb: 65  },
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

    const W = 360, H = 360, cx = 180, cy = 180, R = 138

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx   = (e.clientX - rect.left) * (W / rect.width)
      const my   = (e.clientY - rect.top)  * (H / rect.height)
      if (Math.hypot(mx - cx, my - cy) < R) {
        jigRef.current.vx += ((mx - cx) / R) * 2.6
        jigRef.current.vy += ((my - cy) / R) * 2.6
      }
    }
    canvas.addEventListener('mousemove', onMove)

    function drawFrame() {
      const t  = tRef.current
      const s  = stateRef.current
      const { sm, gm, rr, rg, rb } = STATE_P[s]
      const j  = jigRef.current

      // Spring physics (jiggle on mouse hover)
      j.vx -= j.dx * 0.10; j.vy -= j.dy * 0.10
      j.dx += j.vx;        j.dy += j.vy
      j.vx *= 0.86;        j.vy *= 0.86

      ctx.clearRect(0, 0, W, H)

      // ── 1. Outer atmospheric glow ─────────────────────────────────────────
      const og = ctx.createRadialGradient(cx, cy, R * 0.68, cx, cy, R * 2.0)
      og.addColorStop(0,   `rgba(${rr},${rg},${rb},${0.30 * gm})`)
      og.addColorStop(0.3, `rgba(${rr},${rg},${rb},${0.12 * gm})`)
      og.addColorStop(0.6, `rgba(${rr},${rg},${rb},${0.04 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // ── 2. Sphere clip ────────────────────────────────────────────────────
      const jx = j.dx * 0.12, jy = j.dy * 0.12
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx + jx, cy + jy, R, 0, Math.PI * 2)
      ctx.clip()

      // Dark base — deep indigo-black
      const bg = ctx.createRadialGradient(cx - R * 0.14, cy - R * 0.14, 0, cx, cy, R)
      bg.addColorStop(0,   '#180042')
      bg.addColorStop(0.35,'#0e0030')
      bg.addColorStop(0.72,'#08001c')
      bg.addColorStop(1,   '#030008')
      ctx.fillStyle = bg
      ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)

      // ── Volumetric plasma blobs ───────────────────────────────────────────
      ctx.globalCompositeOperation = 'screen'

      for (const b of BLOBS) {
        const bx = cx + Math.cos(t * b.sx * sm + b.phase * 1.08) * R * b.ax + j.dx * 0.22
        const by = cy + Math.sin(t * b.sy * sm * 0.73 + b.phase * 0.88) * R * b.ay + j.dy * 0.22
        const br = R * b.sr
        const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        const a  = b.al * gm
        g2.addColorStop(0,   `rgba(${b.r},${b.g},${b.b},${Math.min(1, a)})`)
        g2.addColorStop(0.40,`rgba(${b.r},${b.g},${b.b},${Math.min(1, a * 0.42)})`)
        g2.addColorStop(0.70,`rgba(${b.r},${b.g},${b.b},${Math.min(1, a * 0.10)})`)
        g2.addColorStop(1,   `rgba(${b.r},${b.g},${b.b},0)`)
        ctx.fillStyle = g2
        ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)
      }

      // State-tinted accent blob (gives the color shift per state)
      {
        const bx = cx + Math.cos(t * 0.28 * sm + 5.2) * R * 0.40 + j.dx * 0.22
        const by = cy + Math.sin(t * 0.20 * sm + 3.8) * R * 0.34 + j.dy * 0.22
        const br = R * 0.55
        const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        const a  = 0.55 * gm
        g2.addColorStop(0,   `rgba(${rr},${rg},${rb},${Math.min(1, a)})`)
        g2.addColorStop(0.45,`rgba(${rr},${rg},${rb},${Math.min(1, a * 0.35)})`)
        g2.addColorStop(1,   `rgba(${rr},${rg},${rb},0)`)
        ctx.fillStyle = g2
        ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)
      }

      ctx.globalCompositeOperation = 'source-over'

      // Edge vignette — critical for the 3D glass sphere illusion
      const vig = ctx.createRadialGradient(cx, cy, R * 0.48, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.55, 'rgba(0,0,0,0.10)')
      vig.addColorStop(0.78, 'rgba(0,0,0,0.65)')
      vig.addColorStop(0.92, 'rgba(0,0,0,0.88)')
      vig.addColorStop(1,    'rgba(0,0,0,0.98)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)

      // Glass specular — upper-left highlight
      const spec = ctx.createRadialGradient(
        cx - R * 0.40, cy - R * 0.44, 0,
        cx - R * 0.26, cy - R * 0.30, R * 0.48
      )
      spec.addColorStop(0,    'rgba(255,255,255,0.30)')
      spec.addColorStop(0.28, 'rgba(255,255,255,0.12)')
      spec.addColorStop(0.60, 'rgba(255,255,255,0.03)')
      spec.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = spec
      ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)

      ctx.restore()

      // ── 3. Rim lighting — makes it feel physically 3D ─────────────────────
      const rimH = ctx.createRadialGradient(cx, cy, R * 0.80, cx, cy, R * 1.22)
      rimH.addColorStop(0,   'rgba(0,0,0,0)')
      rimH.addColorStop(0.5, `rgba(${rr},${rg},${rb},${0.35 * gm})`)
      rimH.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = rimH
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill()

      // Concentric rim strokes
      for (let i = 5; i >= 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + i * 1.8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.52 - i * 0.09) * gm})`
        ctx.lineWidth   = 1.8 - i * 0.28
        ctx.stroke()
      }
      // Inner glass edge catch
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.24 * gm})`
      ctx.lineWidth   = 0.9; ctx.stroke()

      // ── 4. State effects ──────────────────────────────────────────────────
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * sm * 0.36 + k * 0.33) % 1)
          ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + prog * 0.88), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,50,160,${(1 - prog) * 0.35})`
          ctx.lineWidth   = 1.2; ctx.stroke()
        }
      }
      if (s === 'speaking') {
        const pa = (Math.sin(t * 8.5 * sm) + 1) * 0.5 * 0.55
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + 0.055 * Math.sin(t * 8.5 * sm)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(215,125,255,${pa})`
        ctx.lineWidth   = 3.2; ctx.stroke()
      }

      // ── 5. Holographic ground shadow ──────────────────────────────────────
      ctx.save()
      ctx.translate(cx, cy + R * 1.58)
      ctx.scale(1, 0.07)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(0, 0, R * (0.36 + i * 0.15), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.22 - i * 0.040) * gm})`
        ctx.lineWidth   = 1.1 - i * 0.18; ctx.stroke()
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
    if (!isSupported) return <MicOff style={{ width: 28, height: 28, color: '#3a2860' }} />
    switch (state) {
      case 'listening':  return <Mic     style={{ width: 28, height: 28, color: '#ffe2f5', filter: 'drop-shadow(0 0 10px rgba(255,50,160,1))'  }} />
      case 'processing': return <Loader2 style={{ width: 28, height: 28, color: '#e8daff', filter: 'drop-shadow(0 0 10px rgba(150,80,255,1))'  }} className="animate-spin" />
      case 'wake':       return <Radio   style={{ width: 28, height: 28, color: '#ddd4ff', filter: 'drop-shadow(0 0 8px rgba(140,80,255,0.9))' }} />
      case 'speaking':   return <Radio   style={{ width: 28, height: 28, color: '#f4d8ff', filter: 'drop-shadow(0 0 10px rgba(215,125,255,1))' }} />
      default:           return <Mic     style={{ width: 28, height: 28, color: '#ccc2f0', filter: 'drop-shadow(0 0 7px rgba(120,60,255,0.85))'}} />
    }
  }

  return (
    <div
      className="relative select-none"
      style={{
        animation: 'float 4s ease-in-out infinite',
        filter: 'drop-shadow(0 48px 64px rgba(90,10,240,0.42))',
      }}
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
          style={{ background: 'rgba(5,0,18,0.92)', border: '1px solid rgba(130,60,255,0.28)', color: 'rgba(180,140,255,0.70)' }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
