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
type PT = { x: number; y: number; z: number } | null

// ── Primary sweeping paths: thick bright arcs that dominate the orb ──────────
const WIDE = [
  { phase: 0.00, turns: 1.12, speed: 0.20, pA: 0.88, wA: 0.04, wF: 3,  r: 255, g: 128, b: 255, w: 3.8 },
  { phase: 1.26, turns: 1.44, speed: 0.17, pA: 1.05, wA: 0.05, wF: 4,  r: 238, g: 70,  b: 255, w: 4.2 },
  { phase: 2.51, turns: 0.94, speed: 0.24, pA: 0.72, wA: 0.03, wF: 3,  r: 255, g: 175, b: 255, w: 3.2 },
  { phase: 3.77, turns: 1.56, speed: 0.14, pA: 0.98, wA: 0.06, wF: 5,  r: 218, g: 88,  b: 255, w: 4.5 },
  { phase: 5.03, turns: 1.22, speed: 0.19, pA: 0.82, wA: 0.04, wF: 4,  r: 255, g: 105, b: 242, w: 3.5 },
]

// ── Secondary squiggly paths: dense chaotic fill across sphere surface ────────
const SQUIG = [
  { phase: 0.31, turns: 1.62, speed: 0.28, pA: 0.28, wA: 0.32, wF: 8,  r: 180, g: 28, b: 228, w: 1.2 },
  { phase: 0.94, turns: 2.05, speed: 0.22, pA: 0.22, wA: 0.28, wF: 11, r: 162, g: 18, b: 218, w: 1.0 },
  { phase: 1.57, turns: 1.82, speed: 0.32, pA: 0.35, wA: 0.35, wF: 9,  r: 192, g: 35, b: 238, w: 1.3 },
  { phase: 2.20, turns: 2.38, speed: 0.18, pA: 0.18, wA: 0.25, wF: 13, r: 155, g: 22, b: 210, w: 0.9 },
  { phase: 2.83, turns: 1.28, speed: 0.35, pA: 0.42, wA: 0.38, wF: 7,  r: 200, g: 42, b: 245, w: 1.4 },
  { phase: 3.46, turns: 1.95, speed: 0.25, pA: 0.32, wA: 0.30, wF: 10, r: 175, g: 30, b: 232, w: 1.1 },
  { phase: 4.09, turns: 2.18, speed: 0.20, pA: 0.25, wA: 0.28, wF: 12, r: 165, g: 25, b: 222, w: 1.0 },
  { phase: 4.71, turns: 1.52, speed: 0.30, pA: 0.38, wA: 0.35, wF: 8,  r: 188, g: 35, b: 238, w: 1.2 },
  { phase: 5.34, turns: 2.02, speed: 0.23, pA: 0.20, wA: 0.22, wF: 14, r: 152, g: 18, b: 208, w: 0.9 },
  { phase: 0.63, turns: 1.72, speed: 0.33, pA: 0.30, wA: 0.33, wF: 9,  r: 185, g: 32, b: 235, w: 1.1 },
  { phase: 1.88, turns: 2.28, speed: 0.19, pA: 0.22, wA: 0.26, wF: 11, r: 168, g: 22, b: 220, w: 1.0 },
  { phase: 3.14, turns: 1.42, speed: 0.28, pA: 0.45, wA: 0.40, wF: 7,  r: 198, g: 40, b: 242, w: 1.3 },
  { phase: 4.40, turns: 2.12, speed: 0.21, pA: 0.28, wA: 0.30, wF: 10, r: 172, g: 28, b: 228, w: 1.0 },
  { phase: 5.65, turns: 1.65, speed: 0.26, pA: 0.35, wA: 0.32, wF: 8,  r: 182, g: 32, b: 232, w: 1.1 },
]

// ── 600 surface sparkle particles (Fibonacci sphere distribution) ─────────────
const PARTICLES = (() => {
  const phi = Math.PI * (3 - Math.sqrt(5))
  let s = 0.618033988
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  return Array.from({ length: 600 }, (_, i) => {
    const y  = 1 - (i / 599) * 2
    const sr = Math.sqrt(Math.max(0, 1 - y * y))
    const th = phi * i
    const white = rng() > 0.82
    return {
      theta: th, sinPhi: sr, cosPhi: y,
      r: white ? 248 : 175 + Math.floor(rng() * 65),
      g: white ? 230 : 20  + Math.floor(rng() * 52),
      b: white ? 255 : 205 + Math.floor(rng() * 50),
      size: 0.38 + rng() * 1.42, ts: rng() * Math.PI * 2, tp: rng() * Math.PI * 2, white,
    }
  })
})()

// ── 4 volumetric blobs: underlying glow depth ─────────────────────────────────
const BLOBS = [
  { phase: 0.0, ax: 0.34, ay: 0.27, sr: 0.84, r: 30,  g: 35,  b: 215, al: 0.42, sx: 0.18, sy: 0.15 },
  { phase: 1.1, ax: 0.40, ay: 0.33, sr: 0.88, r: 110, g: 20,  b: 240, al: 0.48, sx: 0.22, sy: 0.18 },
  { phase: 2.2, ax: 0.44, ay: 0.40, sr: 0.76, r: 168, g: 25,  b: 255, al: 0.40, sx: 0.26, sy: 0.22 },
  { phase: 3.3, ax: 0.31, ay: 0.46, sr: 0.70, r: 240, g: 38,  b: 196, al: 0.36, sx: 0.30, sy: 0.26 },
]

const BEAM_ANGLES = [0.22, 1.02, 1.78, 2.26, 2.98, 3.62, 4.32, 5.08]

interface SP { sm: number; gm: number; rr: number; rg: number; rb: number }
const STATE_P: Record<AssistantState, SP> = {
  idle:       { sm: 0.55, gm: 0.95, rr: 95,  rg: 28,  rb: 220 },
  wake:       { sm: 0.78, gm: 1.12, rr: 112, rg: 42,  rb: 235 },
  listening:  { sm: 1.55, gm: 1.48, rr: 255, rg: 50,  rb: 155 },
  processing: { sm: 2.05, gm: 1.58, rr: 0,   rg: 205, rb: 255 },
  speaking:   { sm: 2.55, gm: 2.05, rr: 205, rg: 112, rb: 255 },
  error:      { sm: 1.82, gm: 1.62, rr: 255, rg: 65,  rb: 65  },
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
    const W = 400, H = 400, cx = 200, cy = 200, R = 150

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx   = (e.clientX - rect.left) * (W / rect.width)
      const my   = (e.clientY - rect.top)  * (H / rect.height)
      if (Math.hypot(mx - cx, my - cy) < R) {
        jigRef.current.vx += ((mx - cx) / R) * 2.8
        jigRef.current.vy += ((my - cy) / R) * 2.8
      }
    }
    canvas.addEventListener('mousemove', onMove)

    // ── Build a spherical surface path ────────────────────────────────────────
    // Points are projected orthographically; null = behind sphere (creates breaks)
    function buildPath(
      phase: number, turns: number, speed: number,
      pA: number, wA: number, wF: number,
      t: number, sm: number, j: Jiggle
    ): PT[] {
      const N   = 110
      const out: PT[] = []
      for (let i = 0; i <= N; i++) {
        const u = i / N
        const theta =
          u * Math.PI * 2 * turns
          + phase * 0.58
          + t * speed * sm * 0.33

        const phi =
          Math.PI / 2
          + pA * Math.sin(u * Math.PI * 1.82 + t * speed * sm * 0.70 + phase)
          + wA * Math.sin(u * Math.PI * wF   + t * speed * sm * 1.12 + phase * 1.22)
          + wA * 0.52 * Math.cos(u * Math.PI * wF * 1.58 + t * speed * sm * 0.78 + phase * 0.74)

        const sinP = Math.sin(phi), cosP = Math.cos(phi)
        const sinT = Math.sin(theta), cosT = Math.cos(theta)

        const px = sinP * cosT   // screen-X on unit sphere
        const py = cosP          // screen-Y on unit sphere
        const pz = sinP * sinT   // depth (positive = front)

        if (pz < -0.04) {
          out.push(null)
        } else {
          out.push({
            x: cx + px * R * 0.90 + j.dx * 0.24,
            y: cy + py * R * 0.90 + j.dy * 0.24,
            z: pz,
          })
        }
      }
      return out
    }

    // ── Stroke a path with gaps where null (behind sphere) ───────────────────
    function strokeSegs(pts: PT[], lw: number, color: string) {
      ctx.lineWidth = lw
      ctx.strokeStyle = color
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      let open = false
      ctx.beginPath()
      for (const p of pts) {
        if (!p) { if (open) { ctx.stroke(); ctx.beginPath(); open = false } ; continue }
        if (!open) { ctx.moveTo(p.x, p.y); open = true } else ctx.lineTo(p.x, p.y)
      }
      if (open) ctx.stroke()
    }

    function drawPath(pts: PT[], r: number, g: number, b: number, w: number, gm: number) {
      ctx.globalCompositeOperation = 'screen'
      strokeSegs(pts, w * 8,   `rgba(${r},${g},${b},${0.052 * gm})`)
      strokeSegs(pts, w * 2.8, `rgba(${r},${g},${b},${0.20  * gm})`)
      const cr = Math.min(255, r + 45), cg = Math.min(255, g + 55), cb = Math.min(255, b + 20)
      strokeSegs(pts, w, `rgba(${cr},${cg},${cb},${0.76 * gm})`)
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Blobs: soft underlying volumetric glow ────────────────────────────────
    function drawBlobs(t: number, sm: number, gm: number, j: Jiggle) {
      ctx.globalCompositeOperation = 'screen'
      for (const b of BLOBS) {
        const bx = cx + Math.cos(t * b.sx * sm + b.phase * 1.1) * R * b.ax + j.dx * 0.20
        const by = cy + Math.sin(t * b.sy * sm * 0.73 + b.phase * 0.88) * R * b.ay + j.dy * 0.20
        const gr = ctx.createRadialGradient(bx, by, 0, bx, by, R * b.sr)
        const a  = Math.min(1, b.al * gm)
        gr.addColorStop(0,   `rgba(${b.r},${b.g},${b.b},${a})`)
        gr.addColorStop(0.42,`rgba(${b.r},${b.g},${b.b},${a * 0.40})`)
        gr.addColorStop(0.72,`rgba(${b.r},${b.g},${b.b},${a * 0.09})`)
        gr.addColorStop(1,   `rgba(${b.r},${b.g},${b.b},0)`)
        ctx.fillStyle = gr
        ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)
      }
      // State-tinted accent
      const { sm: _, gm: __, rr, rg, rb } = STATE_P[stateRef.current]
      const bx2 = cx + Math.cos(t * 0.26 * sm + 5.1) * R * 0.38 + j.dx * 0.20
      const by2 = cy + Math.sin(t * 0.19 * sm + 3.8) * R * 0.32 + j.dy * 0.20
      const gr2  = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, R * 0.52)
      const a2   = Math.min(1, 0.52 * gm)
      gr2.addColorStop(0,  `rgba(${rr},${rg},${rb},${a2})`)
      gr2.addColorStop(0.45,`rgba(${rr},${rg},${rb},${a2 * 0.35})`)
      gr2.addColorStop(1,  `rgba(${rr},${rg},${rb},0)`)
      ctx.fillStyle = gr2
      ctx.fillRect(cx - R - 5, cy - R - 5, R * 2 + 10, R * 2 + 10)
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Particles: sparkle dust on sphere surface ─────────────────────────────
    function drawParticles(t: number, sm: number, gm: number, j: Jiggle) {
      const rot = t * 0.042 * sm
      ctx.globalCompositeOperation = 'screen'
      for (const p of PARTICLES) {
        const theta = p.theta + rot
        const px    = p.sinPhi * Math.cos(theta)
        const py    = p.cosPhi
        const pz    = p.sinPhi * Math.sin(theta)
        if (pz < -0.08) continue

        const sx = cx + px * R * 0.95 + j.dx * 0.14
        const sy = cy + py * R * 0.95 + j.dy * 0.14

        const twinkle  = 0.42 + Math.sin(t * 2.1 + p.ts) * 0.32 + Math.sin(t * 3.6 + p.tp) * 0.26
        const rimDist  = Math.sqrt(px * px + py * py)          // 0=center, 1=edge
        const rimBoost = 0.65 + rimDist * 0.45
        const alpha    = Math.min(1, twinkle * (0.35 + pz * 0.65) * gm * 0.85 * rimBoost)
        if (alpha < 0.03) continue

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(0.3, p.size * (0.5 + pz * 0.6)), 0, Math.PI * 2)
        ctx.fillStyle = p.white
          ? `rgba(248,230,255,${alpha * 0.92})`
          : `rgba(${p.r},${p.g},${p.b},${alpha})`
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ── Energy beams radiating from sphere edge ───────────────────────────────
    function drawBeams(t: number, sm: number, rr: number, rg: number, rb: number, gm: number) {
      for (const angle of BEAM_ANGLES) {
        const len    = R * (1.68 + Math.sin(t * 0.65 + angle) * 0.30)
        const spread = 0.016
        for (let k = -2; k <= 2; k++) {
          const a    = angle + k * spread
          const x1   = cx + Math.cos(a) * (R + 2)
          const y1   = cy + Math.sin(a) * (R + 2)
          const x2   = cx + Math.cos(a) * (R + len)
          const y2   = cy + Math.sin(a) * (R + len)
          const grad = ctx.createLinearGradient(x1, y1, x2, y2)
          const a0   = (0.28 - Math.abs(k) * 0.06) * gm
          grad.addColorStop(0,    `rgba(${rr},${rg},${rb},${a0})`)
          grad.addColorStop(0.38, `rgba(${rr},${rg},${rb},${a0 * 0.48})`)
          grad.addColorStop(1,    `rgba(${rr},${rg},${rb},0)`)
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
          ctx.strokeStyle = grad
          ctx.lineWidth   = k === 0 ? 1.4 : 0.55
          ctx.stroke()
        }
      }
    }

    // ── Main draw loop ────────────────────────────────────────────────────────
    function drawFrame() {
      const t   = tRef.current
      const s   = stateRef.current
      const { sm, gm, rr, rg, rb } = STATE_P[s]
      const j   = jigRef.current

      j.vx -= j.dx * 0.10; j.vy -= j.dy * 0.10
      j.dx += j.vx;        j.dy += j.vy
      j.vx *= 0.86;        j.vy *= 0.86

      ctx.clearRect(0, 0, W, H)

      // 1 – Outer atmospheric glow
      const og = ctx.createRadialGradient(cx, cy, R * 0.68, cx, cy, R * 2.05)
      og.addColorStop(0,   `rgba(${rr},${rg},${rb},${0.32 * gm})`)
      og.addColorStop(0.3, `rgba(${rr},${rg},${rb},${0.13 * gm})`)
      og.addColorStop(0.6, `rgba(${rr},${rg},${rb},${0.04 * gm})`)
      og.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = og; ctx.fillRect(0, 0, W, H)

      // 2 – Sphere clip
      const jx = j.dx * 0.11, jy = j.dy * 0.11
      ctx.save()
      ctx.beginPath(); ctx.arc(cx + jx, cy + jy, R, 0, Math.PI * 2); ctx.clip()

      // 2a – Dark base
      const bg = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.15, 0, cx, cy, R)
      bg.addColorStop(0,   '#1c0046')
      bg.addColorStop(0.35,'#100030')
      bg.addColorStop(0.70,'#08001c')
      bg.addColorStop(1,   '#030008')
      ctx.fillStyle = bg; ctx.fillRect(cx - R - 6, cy - R - 6, R * 2 + 12, R * 2 + 12)

      // 2b – Volumetric blobs (underlying glow)
      drawBlobs(t, sm, gm, j)

      // 2c – Primary sweeping paths
      for (const p of WIDE) {
        drawPath(buildPath(p.phase, p.turns, p.speed, p.pA, p.wA, p.wF, t, sm, j),
          p.r, p.g, p.b, p.w, gm)
      }

      // 2d – Secondary squiggly paths
      for (const p of SQUIG) {
        drawPath(buildPath(p.phase, p.turns, p.speed, p.pA, p.wA, p.wF, t, sm, j),
          p.r, p.g, p.b, p.w, gm)
      }

      // 2e – Surface particles
      drawParticles(t, sm, gm, j)

      // 2f – Dark glass center reflection
      const dc = ctx.createRadialGradient(cx - R * 0.06, cy - R * 0.08, 0, cx, cy, R * 0.50)
      dc.addColorStop(0,   'rgba(0,0,0,0.58)')
      dc.addColorStop(0.5, 'rgba(0,0,0,0.28)')
      dc.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = dc; ctx.fillRect(cx - R - 6, cy - R - 6, R * 2 + 12, R * 2 + 12)

      // 2g – Edge vignette
      const vig = ctx.createRadialGradient(cx, cy, R * 0.46, cx, cy, R)
      vig.addColorStop(0,    'rgba(0,0,0,0)')
      vig.addColorStop(0.54, 'rgba(0,0,0,0.08)')
      vig.addColorStop(0.80, 'rgba(0,0,0,0.60)')
      vig.addColorStop(0.92, 'rgba(0,0,0,0.90)')
      vig.addColorStop(1,    'rgba(0,0,0,0.98)')
      ctx.fillStyle = vig; ctx.fillRect(cx - R - 6, cy - R - 6, R * 2 + 12, R * 2 + 12)

      // 2h – Glass specular
      const sp = ctx.createRadialGradient(cx - R*0.38, cy - R*0.42, 0, cx - R*0.24, cy - R*0.28, R*0.46)
      sp.addColorStop(0,    'rgba(255,255,255,0.28)')
      sp.addColorStop(0.30, 'rgba(255,255,255,0.10)')
      sp.addColorStop(0.65, 'rgba(255,255,255,0.02)')
      sp.addColorStop(1,    'rgba(255,255,255,0)')
      ctx.fillStyle = sp; ctx.fillRect(cx - R - 6, cy - R - 6, R * 2 + 12, R * 2 + 12)

      ctx.restore()

      // 3 – Energy beams
      drawBeams(t, sm, rr, rg, rb, gm)

      // 4 – Rim lighting
      const rimH = ctx.createRadialGradient(cx, cy, R * 0.80, cx, cy, R * 1.24)
      rimH.addColorStop(0,   'rgba(0,0,0,0)')
      rimH.addColorStop(0.5, `rgba(${rr},${rg},${rb},${0.38 * gm})`)
      rimH.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = rimH; ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2); ctx.fill()

      for (let i = 5; i >= 0; i--) {
        ctx.beginPath(); ctx.arc(cx, cy, R + i * 1.8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.52 - i * 0.09) * gm})`
        ctx.lineWidth   = 1.8 - i * 0.28; ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.26 * gm})`; ctx.lineWidth = 0.9; ctx.stroke()

      // 5 – State effects
      if (s === 'listening') {
        for (let k = 0; k < 3; k++) {
          const prog = ((t * sm * 0.36 + k * 0.33) % 1)
          ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + prog * 0.90), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,50,160,${(1 - prog) * 0.38})`
          ctx.lineWidth   = 1.3; ctx.stroke()
        }
      }
      if (s === 'processing') {
        const sweep = (t * sm * 0.8) % (Math.PI * 2)
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, sweep, sweep + Math.PI * 0.8)
        ctx.strokeStyle = `rgba(0,210,255,${0.45 * gm})`; ctx.lineWidth = 1.5; ctx.stroke()
      }
      if (s === 'speaking') {
        const pa = (Math.sin(t * 8.5 * sm) + 1) * 0.5 * 0.58
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.02 + 0.055 * Math.sin(t * 8.5 * sm)), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(215,125,255,${pa})`; ctx.lineWidth = 3.2; ctx.stroke()
      }

      // 6 – Holographic ground shadow
      ctx.save(); ctx.translate(cx, cy + R * 1.60); ctx.scale(1, 0.07)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(0, 0, R * (0.34 + i * 0.15), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.22 - i * 0.040) * gm})`
        ctx.lineWidth   = 1.1 - i * 0.18; ctx.stroke()
      }
      ctx.restore()

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(drawFrame)
    }

    rafRef.current = requestAnimationFrame(drawFrame)
    return () => { cancelAnimationFrame(rafRef.current); canvas.removeEventListener('mousemove', onMove) }
  }, [])

  const icon = () => {
    if (!isSupported) return <MicOff style={{ width: 28, height: 28, color: '#3a2860' }} />
    switch (state) {
      case 'listening':  return <Mic     style={{ width: 28, height: 28, color: '#ffe2f5', filter: 'drop-shadow(0 0 10px rgba(255,50,160,1))' }} />
      case 'processing': return <Loader2 style={{ width: 28, height: 28, color: '#d0f8ff', filter: 'drop-shadow(0 0 10px rgba(0,210,255,1))' }} className="animate-spin" />
      case 'wake':       return <Radio   style={{ width: 28, height: 28, color: '#ddd4ff', filter: 'drop-shadow(0 0 8px rgba(140,80,255,0.9))' }} />
      case 'speaking':   return <Radio   style={{ width: 28, height: 28, color: '#f4d8ff', filter: 'drop-shadow(0 0 10px rgba(215,125,255,1))' }} />
      default:           return <Mic     style={{ width: 28, height: 28, color: '#ccc2f0', filter: 'drop-shadow(0 0 7px rgba(120,60,255,0.85))' }} />
    }
  }

  return (
    <div
      className="relative select-none"
      style={{
        animation: 'float 4s ease-in-out infinite',
        filter: 'drop-shadow(0 52px 72px rgba(90,10,240,0.45))',
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
          ref={canvasRef} width={400} height={400}
          style={{ display: 'block', width: 'min(400px, calc(100vw - 48px))', height: 'auto' }}
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
