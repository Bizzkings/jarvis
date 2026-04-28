'use client'

import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick(): void
  isSupported: boolean
}

interface Ribbon {
  phase: number
  speed: number
  depth: number   // 0 = back, 1 = front
  r: number; g: number; b: number
  width: number
  jf: number      // jiggle responsiveness
}

interface RibbonPath {
  x1: number; y1: number; x2: number; y2: number
  cp1x: number; cp1y: number; cp2x: number; cp2y: number
}

interface Jiggle {
  dx: number; dy: number
  vx: number; vy: number
  mx: number; my: number
  inside: boolean
}

// Back-to-front depth order for correct layering
const RIBBONS: Ribbon[] = [
  { phase: 0.0,  speed: 0.28, depth: 0.08, r: 45,  g: 25,  b: 210, width: 30, jf: 0.22 },
  { phase: 2.3,  speed: 0.22, depth: 0.20, r: 65,  g: 12,  b: 195, width: 26, jf: 0.30 },
  { phase: 1.1,  speed: 0.34, depth: 0.32, r: 38,  g: 68,  b: 238, width: 24, jf: 0.40 },
  { phase: 3.7,  speed: 0.29, depth: 0.46, r: 115, g: 0,   b: 245, width: 22, jf: 0.52 },
  { phase: 0.8,  speed: 0.41, depth: 0.60, r: 175, g: 55,  b: 255, width: 20, jf: 0.63 },
  { phase: 2.9,  speed: 0.37, depth: 0.72, r: 0,   g: 172, b: 255, width: 18, jf: 0.74 },
  { phase: 1.6,  speed: 0.50, depth: 0.83, r: 238, g: 65,  b: 188, width: 15, jf: 0.84 },
  { phase: 4.2,  speed: 0.31, depth: 0.94, r: 115, g: 222, b: 255, width: 13, jf: 0.94 },
]

interface SP { sm: number; gm: number; rr: number; rg: number; rb: number }
const STATE_P: Record<AssistantState, SP> = {
  idle:       { sm: 0.75, gm: 1.00, rr: 95,  rg: 38,  rb: 228 },
  wake:       { sm: 0.95, gm: 1.15, rr: 115, rg: 48,  rb: 242 },
  listening:  { sm: 1.55, gm: 1.45, rr: 255, rg: 45,  rb: 156 },
  processing: { sm: 1.90, gm: 1.55, rr: 0,   rg: 212, rb: 255 },
  speaking:   { sm: 2.40, gm: 1.95, rr: 200, rg: 118, rb: 255 },
  error:      { sm: 1.85, gm: 1.60, rr: 255, rg: 68,  rb: 68  },
}

export default function JarvisOrb({ state, onClick, isSupported }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const tRef      = useRef(0)
  const stateRef  = useRef(state)
  const jigRef    = useRef<Jiggle>({ dx: 0, dy: 0, vx: 0, vy: 0, mx: 180, my: 180, inside: false })

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    const W = 360, H = 360
    const cx = 180, cy = 180, R = 125

    // ── Mouse events (spring jiggle + parallax) ──────────────────────────────
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scale = W / rect.width
      const mx = (e.clientX - rect.left) * scale
      const my = (e.clientY - rect.top)  * scale
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2)
      const j = jigRef.current
      j.mx = mx; j.my = my; j.inside = dist < R * 1.1
      if (dist < R) {
        j.vx += ((mx - cx) / R) * 2.4
        j.vy += ((my - cy) / R) * 2.4
      }
    }
    const onLeave = () => { jigRef.current.inside = false }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    // ── Ribbon path ───────────────────────────────────────────────────────────
    function getPath(rib: Ribbon, t: number, j: Jiggle): RibbonPath {
      const { phase: p, speed: s, depth: d, jf } = rib

      const a1 = p + t * s * 0.27
      const a2 = a1 + Math.PI * (1.0 + Math.sin(t * s * 0.17 + p * 0.82) * 0.24)

      const x1 = cx + Math.cos(a1) * R * 0.88
      const y1 = cy + Math.sin(a1) * R * 0.88
      const x2 = cx + Math.cos(a2) * R * 0.88
      const y2 = cy + Math.sin(a2) * R * 0.88

      const ca1 = a1 + 1.35 + Math.sin(t * s * 0.62 + p)      * 1.12
      const ca2 = a2 - 1.20 + Math.cos(t * s * 0.54 + p * 1.2) * 0.98
      const r1  = R * (0.30 + Math.abs(Math.sin(t * s * 0.40 + p * 0.73)) * 0.38)
      const r2  = R * (0.36 + Math.abs(Math.cos(t * s * 0.46 + p * 0.58)) * 0.32)

      // Parallax: near ribbons shift more when mouse moves inside orb
      const px = j.inside ? (j.mx - cx) * d * 0.095 : 0
      const py = j.inside ? (j.my - cy) * d * 0.095 : 0

      return {
        x1, y1, x2, y2,
        cp1x: cx + Math.cos(ca1) * r1 + j.dx * jf       + px,
        cp1y: cy + Math.sin(ca1) * r1 + j.dy * jf       + py,
        cp2x: cx + Math.cos(ca2) * r2 + j.dx * jf * 0.6 + px * 0.6,
        cp2y: cy + Math.sin(ca2) * r2 + j.dy * jf * 0.6 + py * 0.6,
      }
    }

    function drawRibbon(rib: Ribbon, path: RibbonPath, alpha: number) {
      const { r, g, b, width } = rib
      const { x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y } = path
      ctx.lineCap = 'round'

      // Wide outer glow
      ctx.beginPath()
      ctx.moveTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.11})`
      ctx.lineWidth = width * 3.2
      ctx.stroke()

      // Ribbon body
      ctx.beginPath()
      ctx.moveTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.48})`
      ctx.lineWidth = width
      ctx.stroke()

      // Bright core thread
      ctx.beginPath()
      ctx.moveTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2)
      ctx.strokeStyle = `rgba(${Math.min(255,r+88)},${Math.min(255,g+72)},${Math.min(255,b+60)},${alpha * 0.78})`
      ctx.lineWidth = width * 0.15
      ctx.stroke()
    }

    // ── Frame loop ────────────────────────────────────────────────────────────
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

      // ── 1. Outer glow halo ─────────────────────────────────────────────────
      const og = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R * 1.92)
      og.addColorStop(0,   `rgba(${rr},${rg},${rb},${0.18 * gm})`)
      og.addColorStop(0.4, `rgba(${rr},${rg},${rb},${0.07 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og
      ctx.fillRect(0, 0, W, H)

      // ── 2. Sphere (clipped) ────────────────────────────────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      // Base dark fill (the glass sphere interior)
      const bg = ctx.createRadialGradient(cx - R * 0.22, cy - R * 0.22, 0, cx, cy, R)
      bg.addColorStop(0,    '#1e003c')
      bg.addColorStop(0.28, '#100024')
      bg.addColorStop(0.62, '#060016')
      bg.addColorStop(1,    '#020008')
      ctx.fillStyle = bg
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Subtle tech grid
      ctx.strokeStyle = 'rgba(65,38,185,0.030)'
      ctx.lineWidth = 0.5
      for (let gx = cx - R; gx <= cx + R; gx += 18) {
        ctx.beginPath(); ctx.moveTo(gx, cy - R); ctx.lineTo(gx, cy + R); ctx.stroke()
      }
      for (let gy = cy - R; gy <= cy + R; gy += 18) {
        ctx.beginPath(); ctx.moveTo(cx - R, gy); ctx.lineTo(cx + R, gy); ctx.stroke()
      }

      // Inner energy bloom (breathes with state)
      const breathe = 0.38 + Math.sin(t * 1.35) * 0.06
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * breathe)
      bloom.addColorStop(0,   `rgba(${rr},${rg},${rb},0.22)`)
      bloom.addColorStop(0.5, `rgba(${rr},${rg},${rb},0.07)`)
      bloom.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = bloom
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Ribbons with screen blend (additive glow at intersections)
      ctx.globalCompositeOperation = 'screen'
      for (const rib of RIBBONS) {
        const path  = getPath(rib, t * sm, j)
        const alpha = (0.26 + rib.depth * 0.74) * gm
        drawRibbon(rib, path, alpha)
      }
      ctx.globalCompositeOperation = 'source-over'

      // Edge vignette — darkens sphere rim, makes it look solid and thick
      const vig = ctx.createRadialGradient(cx, cy, R * 0.48, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.55, 'rgba(0,0,0,0.05)')
      vig.addColorStop(0.78, 'rgba(0,0,0,0.38)')
      vig.addColorStop(1,    'rgba(0,0,0,0.92)')
      ctx.fillStyle = vig
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Glass specular highlight (upper-left)
      const sp = ctx.createRadialGradient(cx - R*0.40, cy - R*0.44, 0, cx - R*0.30, cy - R*0.33, R*0.56)
      sp.addColorStop(0,    'rgba(255,255,255,0.32)')
      sp.addColorStop(0.26, 'rgba(255,255,255,0.11)')
      sp.addColorStop(0.58, 'rgba(255,255,255,0.03)')
      sp.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = sp
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      // Subtle secondary light (lower-right counter-shine)
      const sp2 = ctx.createRadialGradient(cx + R*0.36, cy + R*0.40, 0, cx + R*0.30, cy + R*0.33, R*0.38)
      sp2.addColorStop(0, `rgba(${rr},${rg},${rb},0.08)`)
      sp2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sp2
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2)

      ctx.restore()

      // ── 3. Glass rim — the #1 3D depth cue ────────────────────────────────
      // Soft outer atmospheric halo
      const rimHalo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.18)
      rimHalo.addColorStop(0,   'rgba(0,0,0,0)')
      rimHalo.addColorStop(0.5, `rgba(${rr},${rg},${rb},${0.22 * gm})`)
      rimHalo.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = rimHalo
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill()

      // Concentric rim strokes (progressively brighter toward sphere edge)
      for (let i = 4; i >= 0; i--) {
        ctx.beginPath()
        ctx.arc(cx, cy, R + i * 2.2, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.38 - i * 0.07) * gm})`
        ctx.lineWidth = 1.8 - i * 0.30
        ctx.stroke()
      }
      // Thin bright inner rim (glass edge catching light)
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.20 * gm})`
      ctx.lineWidth = 0.9
      ctx.stroke()

      // ── 4. State effects ────────────────────────────────────────────────────
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * sm * 0.40 + k * 0.33) % 1)
          ctx.beginPath()
          ctx.arc(cx, cy, R * (1.02 + prog * 0.74), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,45,156,${(1 - prog) * 0.40})`
          ctx.lineWidth = 1.3
          ctx.stroke()
        }
      }
      if (s === 'speaking') {
        const pa = (Math.sin(t * 9.5 * sm) + 1) * 0.5 * 0.52
        ctx.beginPath()
        ctx.arc(cx, cy, R * (1.02 + 0.046 * Math.sin(t * 9.5 * sm)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(200,120,255,${pa})`
        ctx.lineWidth = 2.6
        ctx.stroke()
      }

      // ── 5. Holographic ground shadow ────────────────────────────────────────
      ctx.save()
      ctx.translate(cx, cy + R * 1.52)
      ctx.scale(1, 0.09)
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(0, 0, R * (0.44 + i * 0.17), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.14 - i * 0.032) * gm})`
        ctx.lineWidth = 1.1 - i * 0.22
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
    if (!isSupported) return <MicOff style={{ width: 28, height: 28, color: '#64748b' }} />
    switch (state) {
      case 'listening':  return <Mic     style={{ width: 28, height: 28, color: '#ffe0f5', filter: 'drop-shadow(0 0 8px rgba(255,45,156,0.9))' }} />
      case 'processing': return <Loader2 style={{ width: 28, height: 28, color: '#a0f0ff', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.9))' }} className="animate-spin" />
      case 'wake':       return <Radio   style={{ width: 28, height: 28, color: '#c8f0ff', filter: 'drop-shadow(0 0 6px rgba(0,200,255,0.8))' }} />
      case 'speaking':   return <Radio   style={{ width: 28, height: 28, color: '#e8d0ff', filter: 'drop-shadow(0 0 8px rgba(199,125,255,0.9))' }} />
      default:           return <Mic     style={{ width: 28, height: 28, color: '#c0e8ff', filter: 'drop-shadow(0 0 5px rgba(0,200,255,0.6))' }} />
    }
  }

  return (
    <div className="relative select-none" style={{ animation: 'float 5s ease-in-out infinite' }}>
      <button
        onClick={isSupported ? onClick : undefined}
        disabled={!isSupported}
        className="block p-0 bg-transparent border-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-cyan-500/60"
        style={{ cursor: isSupported ? 'pointer' : 'not-allowed', opacity: isSupported ? 1 : 0.45, transition: 'transform 0.15s ease' }}
        onMouseEnter={e => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e  => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
        onMouseUp={e    => { if (isSupported) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)' }}
        aria-label={!isSupported ? 'Voice requires Chrome or Edge' : state === 'listening' ? 'Stop listening' : state === 'speaking' ? 'Stop speaking' : 'Activate Jarvis'}
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
          style={{ background: 'rgba(0,10,28,0.9)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(0,180,255,0.6)' }}
        >
          Chrome / Edge required
        </div>
      )}
    </div>
  )
}
