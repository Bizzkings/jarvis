'use client'

import { useEffect, useRef } from 'react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state:       AssistantState
  onClick:     () => void
  isSupported: boolean
  onGeometry?: (cx: number, cy: number, r: number) => void
}

type RS = 'idle' | 'listening' | 'thinking' | 'speaking'

const STATE_MAP: Record<AssistantState, RS> = {
  idle:       'idle',
  wake:       'idle',
  listening:  'listening',
  processing: 'thinking',
  speaking:   'speaking',
  error:      'idle',
}

const CFG: Record<RS, { speed: number; glow: number; pulse: boolean; scan: boolean; wave: boolean; pb: number }> = {
  idle:      { speed: 0.35, glow: 0.72, pulse: false, scan: false, wave: false, pb: 0.55 },
  listening: { speed: 0.85, glow: 1.15, pulse: true,  scan: false, wave: false, pb: 1.00 },
  thinking:  { speed: 1.80, glow: 1.00, pulse: false, scan: true,  wave: false, pb: 0.85 },
  speaking:  { speed: 1.15, glow: 1.30, pulse: true,  scan: false, wave: true,  pb: 1.00 },
}

type Pal = {
  sr:number; sg:number; sb:number;
  gr:number; gg:number; gb:number;
  pr:number; pg:number; pb:number;
  cr:number; cg:number; cb:number;
  rr:number; rg:number; rb:number;
}
const PALS: Record<RS, Pal> = {
  idle:      { sr:60,  sg:10,  sb:140, gr:140, gg:35,  gb:255, pr:200, pg:130, pb:255, cr:155, cg:55,  cb:255, rr:195, rg:55,  rb:255 },
  listening: { sr:12,  sg:28,  sb:110, gr:0,   gg:155, gb:255, pr:80,  pg:205, pb:255, cr:40,  cg:165, cb:255, rr:0,   rg:155, rb:255 },
  thinking:  { sr:50,  sg:0,   sb:115, gr:195, gg:0,   gb:255, pr:220, pg:80,  pb:255, cr:185, cg:65,  cb:255, rr:195, rg:0,   rb:225 },
  speaking:  { sr:18,  sg:48,  sb:128, gr:0,   gg:215, gb:255, pr:70,  pg:235, pb:255, cr:35,  cg:215, cb:255, rr:0,   rg:200, rb:255 },
}

const N_PT       = 2200
const N_PT_SPEAK = 1400  // reduced particle count during speaking
const CONTOUR_G  = 64    // FBM grid resolution — was 72 (saves ~24 % per-frame FBM work)
const GOLD       = Math.PI * (3 - Math.sqrt(5))

function fbm(x: number, y: number, t: number) {
  return (
    Math.sin(x*2.1 + t*0.4) * Math.cos(y*1.7 + t*0.3) * 0.40 +
    Math.sin(x*3.7 + y*2.3  + t*0.6)                   * 0.28 +
    Math.cos(x*1.3 - y*3.1  + t*0.2)                   * 0.18 +
    Math.sin(x*5.1 + y*4.3  - t*0.5)                   * 0.09 +
    Math.cos(x*0.8 - y*0.5  + t*0.15)                  * 0.05
  )
}

export default function JarvisOrb({ state, onClick, onGeometry }: Props) {
  const cvRef    = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const clickRef = useRef(onClick)
  const geoRef   = useRef(onGeometry)
  useEffect(() => { stateRef.current = state },      [state])
  useEffect(() => { clickRef.current = onClick },    [onClick])
  useEffect(() => { geoRef.current   = onGeometry }, [onGeometry])

  useEffect(() => {
    if (!cvRef.current) return
    const cv  = cvRef.current as HTMLCanvasElement
    const ctx = cv.getContext('2d')!

    // Fibonacci sphere particles
    const pts = new Float32Array(N_PT * 5)
    for (let i = 0; i < N_PT; i++) {
      const y  = 1 - (i / (N_PT - 1)) * 2
      const r  = Math.sqrt(Math.max(0, 1 - y * y))
      const th = GOLD * i
      const o  = i * 5
      pts[o]   = r * Math.cos(th)
      pts[o+1] = y
      pts[o+2] = r * Math.sin(th)
      pts[o+3] = 0.6  + Math.random() * 1.6
      pts[o+4] = 0.25 + Math.random() * 0.75
    }

    const RINGS = [
      { tilt:0.35, ph:0.0, spd:0.08, rs:0.92, gap:0.45, w:1.5, a:0.55 },
      { tilt:1.15, ph:1.2, spd:0.12, rs:0.88, gap:0.70, w:1.0, a:0.40 },
      { tilt:0.75, ph:2.5, spd:0.06, rs:1.02, gap:0.30, w:2.0, a:0.35 },
      { tilt:1.55, ph:0.8, spd:0.15, rs:0.95, gap:0.55, w:0.8, a:0.30 },
    ]

    const RIBBONS = Array.from({ length: 6 }, (_, i) => ({
      ph:  (i / 6) * Math.PI * 2,
      spd: 0.28 + i * 0.12,
      w:   1.5  + (i % 3) * 1.2,
      br:  0.5  + (i % 2) * 0.3,
      off: i * 1.1,
    }))

    const BEAMS = Array.from({ length: 16 }, (_, i) => ({
      ang: (i / 16) * Math.PI * 2,
      len: 0.35 + Math.random() * 0.55,
      elv: (Math.random() - 0.5) * 0.4,
      w:   0.2  + Math.random() * 0.5,
      br:  0.15 + Math.random() * 0.35,
    }))

    // ── Per-frame state ───────────────────────────────────────────────────
    let W = 0, H = 0, CX = 0, CY = 0, R = 0
    let bgCv: HTMLCanvasElement | null = null
    let T = 0, ft = performance.now()
    let mx = 0, my = 0, tx = 0, ty = 0
    let pulseQ:  { born: number }[] = []
    let lastP = 0
    let ripples: { x: number; y: number; born: number }[] = []
    let frameCount = 0

    // Pre-allocated contour buffer — avoids a 5 329-float GC allocation every frame
    const contourBuf = new Float32Array((CONTOUR_G + 1) * (CONTOUR_G + 1))

    const pal: Pal = { ...PALS.idle }

    function geom() {
      W  = cv.width  = window.innerWidth
      H  = cv.height = window.innerHeight
      CX = W / 2
      const TOP_CHROME = 118
      const BOT_CHROME = 210
      const usable = H - TOP_CHROME - BOT_CHROME
      R  = Math.min(W * 0.18, usable * 0.44, 190)
      CY = TOP_CHROME + R + Math.max(18, usable * 0.12)
      bgCv = null
      geoRef.current?.(CX, CY, R)
    }

    // ── Background panel helpers ──────────────────────────────────────────

    function panelPath(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
      bc.beginPath()
      bc.moveTo(x + c, y);          bc.lineTo(x + w - c, y)
      bc.lineTo(x + w, y + c);      bc.lineTo(x + w, y + h - c)
      bc.lineTo(x + w - c, y + h);  bc.lineTo(x + c, y + h)
      bc.lineTo(x, y + h - c);      bc.lineTo(x, y + c)
      bc.closePath()
    }

    function drawWaveforms(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const waves = [
        { freq: 0.040, amp: 0.28, phase: 0.0, r:0,   g:200, b:255, a:0.68 },
        { freq: 0.068, amp: 0.17, phase: 1.1, r:160, g:40,  b:255, a:0.52 },
        { freq: 0.026, amp: 0.38, phase: 2.3, r:0,   g:255, b:175, a:0.38 },
      ]
      for (const wv of waves) {
        bc.beginPath()
        bc.strokeStyle = `rgba(${wv.r},${wv.g},${wv.b},${wv.a})`
        bc.lineWidth = 1.2
        bc.shadowColor = `rgba(${wv.r},${wv.g},${wv.b},0.6)`; bc.shadowBlur = 4
        for (let xi = 0; xi <= w; xi++) {
          const v = Math.sin(xi * wv.freq + wv.phase) * wv.amp * h
                  + Math.sin(xi * wv.freq * 2.4 + wv.phase + 0.5) * wv.amp * 0.38 * h
          xi === 0 ? bc.moveTo(x + xi, y + h / 2 + v) : bc.lineTo(x + xi, y + h / 2 + v)
        }
        bc.stroke(); bc.shadowBlur = 0
      }
      bc.strokeStyle = 'rgba(0,140,200,0.20)'; bc.lineWidth = 0.5
      bc.beginPath(); bc.moveTo(x, y + h/2); bc.lineTo(x + w, y + h/2); bc.stroke()
    }

    function drawBarChart(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const heights = [0.62, 0.38, 0.82, 0.52, 0.91, 0.33, 0.68]
      const bw = (w - (heights.length - 1) * 3) / heights.length
      for (let i = 0; i < heights.length; i++) {
        const bx = x + i * (bw + 3)
        const bh = h * heights[i]
        const by = y + h - bh
        const gr = bc.createLinearGradient(bx, by, bx, y + h)
        gr.addColorStop(0,   'rgba(0,220,255,0.78)')
        gr.addColorStop(0.5, 'rgba(0,150,220,0.55)')
        gr.addColorStop(1,   'rgba(0,75,160,0.28)')
        bc.fillStyle = gr; bc.fillRect(bx, by, bw, bh)
        bc.fillStyle = 'rgba(130,245,255,0.85)'; bc.fillRect(bx, by, bw, 1.5)
      }
    }

    function drawGauges(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const gauges = [
        { label: 'CORE', val: 0.72, r:0,   g:200, b:255 },
        { label: 'NET',  val: 0.54, r:160, g:40,  b:255 },
      ]
      const gr = w / 2 - 10
      const cy2 = y + h * 0.46
      for (let i = 0; i < gauges.length; i++) {
        const gd = gauges[i]
        const cx2 = x + (i + 0.5) * w / 2
        const sAng = -Math.PI / 2 - Math.PI * 0.62
        const eAng = -Math.PI / 2 + Math.PI * 0.62
        bc.strokeStyle = 'rgba(255,255,255,0.07)'; bc.lineWidth = 3; bc.shadowBlur = 0
        bc.beginPath(); bc.arc(cx2, cy2, gr * 0.65, sAng, eAng); bc.stroke()
        bc.strokeStyle = `rgba(${gd.r},${gd.g},${gd.b},0.82)`; bc.lineWidth = 3
        bc.shadowColor = `rgba(${gd.r},${gd.g},${gd.b},0.65)`; bc.shadowBlur = 6
        bc.beginPath(); bc.arc(cx2, cy2, gr * 0.65, sAng, sAng + (eAng - sAng) * gd.val); bc.stroke()
        bc.shadowBlur = 0
        bc.fillStyle = `rgba(${gd.r},${gd.g},${gd.b},0.88)`
        bc.beginPath(); bc.arc(cx2, cy2, 2, 0, Math.PI*2); bc.fill()
        bc.fillStyle = 'rgba(0,175,215,0.55)'; bc.font = 'bold 7px monospace'; bc.textAlign = 'center'
        bc.fillText(gd.label, cx2, cy2 + gr * 0.65 + 11)
      }
    }

    function drawHexGrid(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const hs = 11, s3 = Math.sqrt(3)
      for (let row = -1; row * hs * 1.5 < h + hs; row++) {
        for (let col = -1; col * hs * s3 < w + hs; col++) {
          const ox = (((row % 2) + 2) % 2) * hs * s3 / 2
          const hx = x + col * hs * s3 + ox
          const hy = y + row * hs * 1.5
          if (hx < x - hs || hx > x + w + hs || hy < y - hs || hy > y + h + hs) continue
          const dx = (hx - (x + w/2)) / w, dy = (hy - (y + h/2)) / h
          const a = Math.max(0.04, 0.58 - Math.sqrt(dx*dx + dy*dy) * 0.85)
          bc.strokeStyle = `rgba(0,162,255,${a})`; bc.lineWidth = 0.7
          bc.shadowColor = 'rgba(0,162,255,0.5)'; bc.shadowBlur = a > 0.28 ? 4 : 0
          bc.beginPath()
          for (let e = 0; e < 6; e++) {
            const ang = (e / 6) * Math.PI * 2 - Math.PI / 6
            e === 0
              ? bc.moveTo(hx + hs * 0.88 * Math.cos(ang), hy + hs * 0.88 * Math.sin(ang))
              : bc.lineTo(hx + hs * 0.88 * Math.cos(ang), hy + hs * 0.88 * Math.sin(ang))
          }
          bc.closePath(); bc.stroke(); bc.shadowBlur = 0
        }
      }
    }

    function drawRadar(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const cx2 = x + w / 2, cy2 = y + h * 0.46
      const maxR = Math.min(w, h) * 0.42
      for (let i = 1; i <= 4; i++) {
        bc.strokeStyle = `rgba(0,180,255,${0.10 + i * 0.04})`; bc.lineWidth = 0.7; bc.shadowBlur = 0
        bc.beginPath(); bc.arc(cx2, cy2, maxR * i / 4, 0, Math.PI * 2); bc.stroke()
      }
      bc.strokeStyle = 'rgba(0,180,255,0.18)'; bc.lineWidth = 0.5
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI
        bc.beginPath()
        bc.moveTo(cx2 - Math.cos(ang) * maxR, cy2 - Math.sin(ang) * maxR)
        bc.lineTo(cx2 + Math.cos(ang) * maxR, cy2 + Math.sin(ang) * maxR)
        bc.stroke()
      }
      const sweepAng = Math.PI * 0.72
      bc.fillStyle = 'rgba(0,200,255,0.07)'
      bc.beginPath(); bc.moveTo(cx2, cy2)
      bc.arc(cx2, cy2, maxR, sweepAng - 1.1, sweepAng); bc.closePath(); bc.fill()
      bc.strokeStyle = 'rgba(0,230,255,0.62)'; bc.lineWidth = 1
      bc.shadowColor = 'rgba(0,220,255,0.8)'; bc.shadowBlur = 6
      bc.beginPath(); bc.moveTo(cx2, cy2)
      bc.lineTo(cx2 + Math.cos(sweepAng) * maxR, cy2 + Math.sin(sweepAng) * maxR); bc.stroke()
      bc.shadowBlur = 0
      const blips = [{a:0.28,r:0.54}, {a:1.75,r:0.36}, {a:2.20,r:0.68}, {a:4.05,r:0.43}]
      for (const bl of blips) {
        bc.fillStyle = 'rgba(0,255,195,0.72)'; bc.shadowColor = 'rgba(0,255,195,0.8)'; bc.shadowBlur = 4
        bc.beginPath()
        bc.arc(cx2 + Math.cos(bl.a) * maxR * bl.r, cy2 + Math.sin(bl.a) * maxR * bl.r, 1.8, 0, Math.PI*2)
        bc.fill(); bc.shadowBlur = 0
      }
    }

    function drawHudPanel(bc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, side: 'left'|'right') {
      const c = 10
      panelPath(bc, x, y, w, h, c); bc.fillStyle = 'rgba(6,1,26,0.80)'; bc.fill()
      panelPath(bc, x, y, w, h, c)
      bc.strokeStyle = 'rgba(0,142,215,0.70)'; bc.lineWidth = 1.2
      bc.shadowColor = 'rgba(0,165,255,0.8)'; bc.shadowBlur = 10; bc.stroke(); bc.shadowBlur = 0
      const tl = bc.createLinearGradient(x + c, y, x + w - c, y)
      tl.addColorStop(0, 'rgba(0,200,255,0)'); tl.addColorStop(0.3, 'rgba(0,200,255,0.92)')
      tl.addColorStop(0.7, 'rgba(0,200,255,0.92)'); tl.addColorStop(1, 'rgba(0,200,255,0)')
      bc.strokeStyle = tl; bc.lineWidth = 1.5
      bc.beginPath(); bc.moveTo(x + c, y); bc.lineTo(x + w - c, y); bc.stroke()
      const sX = side === 'left' ? x + w - 3 : x + 3
      const sg = bc.createLinearGradient(sX, y + 12, sX, y + h - 12)
      sg.addColorStop(0, 'rgba(130,0,255,0)'); sg.addColorStop(0.3, 'rgba(130,0,255,0.60)')
      sg.addColorStop(0.7, 'rgba(130,0,255,0.60)'); sg.addColorStop(1, 'rgba(130,0,255,0)')
      bc.strokeStyle = sg; bc.lineWidth = 1
      bc.beginPath(); bc.moveTo(sX, y + 12); bc.lineTo(sX, y + h - 12); bc.stroke()
      const ip = 11
      bc.save()
      panelPath(bc, x + ip, y + ip, w - ip*2, h - ip*2, c * 0.5); bc.clip()
      const ix = x + ip, iy = y + ip, iw = w - ip*2, ih = h - ip*2
      if (side === 'left') {
        drawWaveforms(bc, ix, iy + 4,           iw, ih * 0.32)
        drawBarChart( bc, ix, iy + ih * 0.36,   iw, ih * 0.24)
        drawGauges(   bc, ix, iy + ih * 0.65,   iw, ih * 0.32)
      } else {
        drawHexGrid(  bc, ix, iy + 4,           iw, ih * 0.52)
        drawRadar(    bc, ix, iy + ih * 0.57,   iw, ih * 0.40)
      }
      bc.restore()
    }

    function buildBg() {
      const bg = document.createElement('canvas')
      bg.width = W; bg.height = H
      const bc = bg.getContext('2d')!

      const bgg = bc.createRadialGradient(W/2, H*0.30, 0, W/2, H*0.55, Math.max(W, H) * 0.80)
      bgg.addColorStop(0,    '#180a34')
      bgg.addColorStop(0.22, '#0e0522')
      bgg.addColorStop(0.55, '#070219')
      bgg.addColorStop(1,    '#02010b')
      bc.fillStyle = bgg; bc.fillRect(0, 0, W, H)

      const haze = bc.createRadialGradient(W/2, H*0.36, 0, W/2, H*0.36, W * 0.50)
      haze.addColorStop(0,   'rgba(95,22,185,0.22)')
      haze.addColorStop(0.42,'rgba(50,10,125,0.12)')
      haze.addColorStop(1,   'rgba(0,0,0,0)')
      bc.fillStyle = haze; bc.fillRect(0, 0, W, H)

      const skyY = H * 0.63
      bc.fillStyle = 'rgba(3,1,15,0.92)'
      for (let i = 0; i < 28; i++) {
        const bx  = W * 0.04 + (i / 27) * W * 0.92
        const bw2 = W * 0.021 + Math.abs(Math.sin(i * 6.31)) * W * 0.012
        const bh2 = H * 0.048 + Math.abs(Math.sin(i * 3.12 + 0.8)) * H * 0.128
        bc.fillRect(bx - bw2/2, skyY - bh2, bw2, bh2 + H * 0.06)
      }
      bc.fillStyle = 'rgba(90,40,190,0.16)'
      for (let i = 0; i < 28; i++) {
        const bx  = W * 0.04 + (i / 27) * W * 0.92
        const bh2 = H * 0.048 + Math.abs(Math.sin(i * 3.12 + 0.8)) * H * 0.128
        for (let wy = 0; wy < 5; wy++) {
          bc.fillRect(bx - 4, skyY - bh2 * 0.88 + wy * 9, 2, 3)
          bc.fillRect(bx + 2, skyY - bh2 * 0.88 + wy * 9, 2, 3)
        }
      }
      const cBloom = bc.createLinearGradient(0, skyY - H*0.08, 0, skyY + H*0.04)
      cBloom.addColorStop(0, 'rgba(120,0,210,0.14)'); cBloom.addColorStop(1, 'rgba(0,0,0,0)')
      bc.fillStyle = cBloom; bc.fillRect(0, skyY - H*0.08, W, H*0.12)

      bc.shadowBlur = 0
      const topStrips = [{ y:3, lw:2.0, a:0.88 }, { y:7, lw:1.0, a:0.50 }, { y:12, lw:0.5, a:0.24 }]
      for (const ts of topStrips) {
        const tg = bc.createLinearGradient(W*0.04, ts.y, W*0.96, ts.y)
        tg.addColorStop(0,   'rgba(0,200,255,0)');  tg.addColorStop(0.1, `rgba(0,200,255,${ts.a})`)
        tg.addColorStop(0.9, `rgba(0,200,255,${ts.a})`); tg.addColorStop(1, 'rgba(0,200,255,0)')
        bc.strokeStyle = tg; bc.lineWidth = ts.lw
        bc.shadowColor = 'rgba(0,200,255,0.85)'; bc.shadowBlur = ts.lw * 7
        bc.beginPath(); bc.moveTo(W*0.04, ts.y); bc.lineTo(W*0.96, ts.y); bc.stroke()
      }
      bc.shadowBlur = 0

      for (const sx of [W * 0.018, W * 0.982]) {
        const vg = bc.createLinearGradient(sx, 0, sx, H * 0.75)
        vg.addColorStop(0,   'rgba(0,180,255,0.55)'); vg.addColorStop(0.3, 'rgba(0,180,255,0.30)')
        vg.addColorStop(0.7, 'rgba(100,0,220,0.20)'); vg.addColorStop(1,  'rgba(0,0,0,0)')
        bc.strokeStyle = vg; bc.lineWidth = 1.2
        bc.shadowColor = 'rgba(0,180,255,0.7)'; bc.shadowBlur = 8
        bc.beginPath(); bc.moveTo(sx, 0); bc.lineTo(sx, H * 0.75); bc.stroke()
        bc.shadowBlur = 0
      }

      if (W >= 1100) {
        const pW = Math.min(245, W * 0.154), pH = Math.min(405, H * 0.46)
        const pY = Math.max(H * 0.25, 120)
        const padX = Math.max(18, W * 0.018)
        drawHudPanel(bc, padX, pY, pW, pH, 'left')
        drawHudPanel(bc, W - pW - padX, pY, pW, pH, 'right')
      }

      const fY = CY + R * 1.14
      bc.strokeStyle = 'rgba(65,0,155,0.14)'; bc.lineWidth = 0.6
      for (let lx = -16; lx <= 16; lx++) {
        bc.beginPath(); bc.moveTo(W/2, fY)
        bc.lineTo(W/2 + lx * W * 0.043, H + 12); bc.stroke()
      }
      for (let ly = 0; ly < 8; ly++) {
        const y2 = fY + (ly / 7) * (H - fY + 20)
        const sp = 0.10 + (ly / 7) * 0.90
        bc.beginPath(); bc.moveTo(W/2 - W*sp, y2); bc.lineTo(W/2 + W*sp, y2); bc.stroke()
      }

      const botAmbient = bc.createLinearGradient(0, H * 0.80, 0, H)
      botAmbient.addColorStop(0, 'rgba(0,0,0,0)'); botAmbient.addColorStop(1, 'rgba(18,0,48,0.38)')
      bc.fillStyle = botAmbient; bc.fillRect(0, H * 0.80, W, H * 0.20)

      bgCv = bg
    }

    // ── Orb draw functions ────────────────────────────────────────────────

    function outerGlow(gm: number) {
      const {gr, gg, gb} = pal
      const g1 = ctx.createRadialGradient(CX, CY, R*0.4, CX, CY, R*3.2)
      g1.addColorStop(0,    `rgba(${gr},${gg},${gb},${0.30*gm})`)
      g1.addColorStop(0.25, `rgba(${Math.round(gr*0.8)},${Math.round(gg*0.55)},${gb},${0.18*gm})`)
      g1.addColorStop(0.55, `rgba(${Math.round(gr*0.5)},${Math.round(gg*0.28)},${Math.round(gb*0.7)},${0.07*gm})`)
      g1.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(CX, CY, R*3.2, 0, Math.PI*2); ctx.fill()
      const g2 = ctx.createRadialGradient(CX, CY, R*0.5, CX, CY, R*1.6)
      g2.addColorStop(0,   `rgba(${gr},${gg},${gb},${0.42*gm})`)
      g2.addColorStop(0.4, `rgba(${Math.round(gr*0.78)},${Math.round(gg*0.5)},${gb},${0.20*gm})`)
      g2.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(CX, CY, R*1.6, 0, Math.PI*2); ctx.fill()
      const g3 = ctx.createRadialGradient(CX, CY, R*0.2, CX, CY, R*1.05)
      g3.addColorStop(0,   `rgba(${Math.min(255,gr+70)},${Math.min(255,gg+80)},${Math.min(255,gb+20)},${0.50*gm})`)
      g3.addColorStop(0.5, `rgba(${gr},${gg},${gb},${0.22*gm})`)
      g3.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(CX, CY, R*1.05, 0, Math.PI*2); ctx.fill()
    }

    function sphereBase(gm: number) {
      const {sr, sg, sb} = pal
      const gr = ctx.createRadialGradient(CX-R*0.2, CY-R*0.2, R*0.05, CX, CY, R)
      gr.addColorStop(0,    `rgba(${sr},${sg},${sb},${0.88*gm})`)
      gr.addColorStop(0.4,  `rgba(${Math.round(sr*0.5)},${Math.round(sg*0.5)},${Math.round(sb*0.6)},0.93)`)
      gr.addColorStop(0.75, `rgba(${Math.round(sr*0.25)},${Math.round(sg*0.3)},${Math.round(sb*0.32)},0.96)`)
      gr.addColorStop(1,    'rgba(5,0,20,0.98)')
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill()
    }

    // OPTIMIZED: pre-allocated buffer + speaking throttle + no per-level shadow blur
    function contourLines(t: number, spd: number, rs: RS) {
      const {cr, cg, cb} = pal
      const G = CONTOUR_G
      const span = R*2.05, cs = span/G
      const x0 = CX - span/2, y0 = CY - span/2

      // Only recompute FBM grid every other frame during speaking — halves the cost
      // of the most expensive CPU operation (5 184 trig calls at 72²; 4 096 at 64²)
      const skipRecompute = rs === 'speaking' && (frameCount & 1) === 1
      if (!skipRecompute) {
        for (let gy = 0; gy <= G; gy++)
          for (let gx = 0; gx <= G; gx++)
            contourBuf[gy*(G+1)+gx] = fbm((gx/G-0.5)*5.5, (gy/G-0.5)*5.5, t*spd)
      }

      const LVS = [
        {v:-0.52,a:0.11,lw:0.5},{v:-0.35,a:0.17,lw:0.7},{v:-0.18,a:0.27,lw:0.9},
        {v: 0.00,a:0.36,lw:1.1},{v: 0.18,a:0.27,lw:0.9},{v: 0.35,a:0.17,lw:0.7},
        {v: 0.52,a:0.11,lw:0.5},
      ]

      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R*0.995, 0, Math.PI*2); ctx.clip()
      // No shadow on contour lines — removes 7 GPU blur pipeline flushes per frame
      ctx.shadowBlur = 0
      for (const lv of LVS) {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${lv.a})`
        ctx.lineWidth = lv.lw
        for (let gy = 0; gy < G; gy++) {
          for (let gx = 0; gx < G; gx++) {
            const v00=contourBuf[gy*(G+1)+gx],      v10=contourBuf[gy*(G+1)+gx+1]
            const v01=contourBuf[(gy+1)*(G+1)+gx],  v11=contourBuf[(gy+1)*(G+1)+gx+1]
            const th=lv.v
            const b=(v00>th?8:0)|(v10>th?4:0)|(v11>th?2:0)|(v01>th?1:0)
            if (b===0||b===15) continue
            const ex=x0+gx*cs, ey=y0+gy*cs
            const txp=ex+(th-v00)/(v10-v00)*cs, typ=ey
            const bxp=ex+(th-v01)/(v11-v01)*cs, byp=ey+cs
            const lxp=ex, lyp=ey+(th-v00)/(v01-v00)*cs
            const rxp=ex+cs, ryp=ey+(th-v10)/(v11-v10)*cs
            switch (b) {
              case 1: case 14: ctx.moveTo(lxp,lyp); ctx.lineTo(bxp,byp); break
              case 2: case 13: ctx.moveTo(bxp,byp); ctx.lineTo(rxp,ryp); break
              case 3: case 12: ctx.moveTo(lxp,lyp); ctx.lineTo(rxp,ryp); break
              case 4: case 11: ctx.moveTo(txp,typ); ctx.lineTo(rxp,ryp); break
              case 5: ctx.moveTo(txp,typ); ctx.lineTo(lxp,lyp); ctx.moveTo(bxp,byp); ctx.lineTo(rxp,ryp); break
              case 6: case 9: ctx.moveTo(txp,typ); ctx.lineTo(bxp,byp); break
              case 7: case 8: ctx.moveTo(txp,typ); ctx.lineTo(lxp,lyp); break
              case 10: ctx.moveTo(txp,typ); ctx.lineTo(rxp,ryp); ctx.moveTo(bxp,byp); ctx.lineTo(lxp,lyp); break
            }
          }
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // OPTIMIZED: accepts maxPt to cap particle count in speaking mode
    function drawParticles(spd: number, pb: number, maxPt: number) {
      const {pr, pg, pb: pbl} = pal
      const ry = T*spd*0.2+tx, rx = T*spd*0.08+ty
      const cy = Math.cos(ry), sy = Math.sin(ry)
      const cx2 = Math.cos(rx), sx = Math.sin(rx)
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.clip()
      for (let i = 0; i < maxPt; i++) {
        const o = i*5
        const nx=pts[o], ny=pts[o+1], nz=pts[o+2], sz=pts[o+3], br=pts[o+4]
        const nx2=nx*cy-nz*sy, nz2=nx*sy+nz*cy
        const ny2=ny*cx2-nz2*sx, nz3=ny*sx+nz2*cx2
        if (nz3 < -0.25) continue
        const px=CX+nx2*R, py=CY+ny2*R
        const depth=(nz3+1)/2, alpha=depth*br*pb, size=sz*(0.4+depth*0.6)
        if (alpha < 0.04) continue
        if (br > 0.7) {
          ctx.fillStyle=`rgba(${Math.min(255,pr+55)},${Math.min(255,pg+55)},${Math.min(255,pbl+20)},${alpha*0.4})`
          ctx.beginPath(); ctx.arc(px,py,size*2.5,0,Math.PI*2); ctx.fill()
        }
        ctx.fillStyle=`rgba(${pr},${pg},${pbl},${alpha})`
        ctx.beginPath(); ctx.arc(px,py,size,0,Math.PI*2); ctx.fill()
      }
      ctx.restore()
    }

    // OPTIMIZED: cap wide-glow shadow blur in speaking mode (30 → 14)
    function drawRibbons(spd: number, gm: number, rs: RS) {
      const {rr, rg, rb} = pal
      // Wide glow pass uses blur=30 normally; cap it during speaking to cut GPU cost
      const glowBlur = rs === 'speaking' ? 14 : 30
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R*0.96, 0, Math.PI*2); ctx.clip()
      for (const rb2 of RIBBONS) {
        const ph=rb2.ph+T*rb2.spd*spd, ph2=ph+1.8+Math.sin(T*0.3+rb2.off)*0.8
        const sr2=R*(0.72+Math.sin(ph+T*0.1)*0.18)
        const p1x=CX+Math.cos(ph)*sr2, p1y=CY+Math.sin(ph)*sr2*0.75
        const p2x=CX+Math.cos(ph2)*sr2*0.9, p2y=CY+Math.sin(ph2)*sr2*0.8
        const c1x=CX+Math.cos(ph+0.6+T*0.18)*R*(0.95+Math.sin(T*0.2)*0.3)
        const c1y=CY+Math.sin(ph+0.6+T*0.18)*R*0.65
        const c2x=CX+Math.cos(ph+2.3-T*0.12)*R*0.85
        const c2y=CY+Math.sin(ph+2.3-T*0.12)*R*(0.9+Math.cos(T*0.25)*0.2)
        const a=rb2.br*gm*(0.75+0.25*Math.sin(T*2.5+rb2.ph))
        const shadow=`rgba(${rr},${rg},${rb},0.9)`
        ctx.lineWidth=rb2.w*6; ctx.strokeStyle=`rgba(${rr},${rg},${rb},${a*0.45})`
        ctx.shadowColor=shadow; ctx.shadowBlur=glowBlur
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
        ctx.lineWidth=rb2.w*2.2; ctx.strokeStyle=`rgba(${rr},${rg},${rb},${a*0.80})`; ctx.shadowBlur=14
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
        const br3=Math.min(255,rr+60), bg3=Math.min(255,rg+60), bb3=Math.min(255,rb+20)
        ctx.lineWidth=rb2.w*0.6; ctx.strokeStyle=`rgba(${br3},${bg3},${bb3},${a*0.70})`
        ctx.shadowColor='#ffffff'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
      }
      ctx.restore()
    }

    function drawCoreGlow(gm: number) {
      const {gr, gg, gb} = pal
      const p=0.8+0.2*Math.sin(T*1.8)*gm
      const g=ctx.createRadialGradient(CX,CY,0,CX,CY,R*0.55)
      g.addColorStop(0,`rgba(${gr},${gg},${gb},${0.50*p})`)
      g.addColorStop(0.3,`rgba(${Math.round(gr*0.7)},${Math.round(gg*0.4)},${gb},${0.30*p})`)
      g.addColorStop(0.7,`rgba(${Math.round(gr*0.5)},${Math.round(gg*0.1)},${Math.round(gb*0.65)},${0.12*p})`)
      g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(CX,CY,R*0.55,0,Math.PI*2); ctx.fill()
    }

    function drawScanLines() {
      const {cr, cg, cb} = pal
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip()
      for (let s=0; s<3; s++) {
        const sy=CY-R+((T*180*(0.8+s*0.15))%(R*2))
        const gr=ctx.createLinearGradient(CX-R,sy-4,CX-R,sy+4)
        gr.addColorStop(0,`rgba(${cr},${cg},${cb},0)`)
        gr.addColorStop(0.5,`rgba(${cr},${cg},${cb},${0.32-s*0.08})`)
        gr.addColorStop(1,`rgba(${cr},${cg},${cb},0)`)
        ctx.fillStyle=gr; ctx.fillRect(CX-R,sy-4,R*2,8)
      }
      const sa=(T*2.5)%(Math.PI*2)
      ctx.strokeStyle=`rgba(${cr},${cg},${cb},0.38)`; ctx.lineWidth=1.5
      ctx.shadowColor=`rgba(${cr},${cg},${cb},0.8)`; ctx.shadowBlur=10
      ctx.beginPath(); ctx.arc(CX,CY,R*0.7,sa,sa+1.2); ctx.stroke()
      ctx.beginPath(); ctx.arc(CX,CY,R*0.45,sa+Math.PI,sa+Math.PI+1.5); ctx.stroke()
      ctx.restore()
    }

    // OPTIMIZED: shadowColor hoisted outside loop (4 state changes → 1)
    function drawOrbitRings(spd: number, gm: number) {
      const {gr, gg, gb} = pal
      ctx.shadowColor = `rgba(${gr},${gg},${gb},0.8)`
      for (const rg of RINGS) {
        const ang=rg.ph+T*rg.spd*spd
        const rx=R*rg.rs, ry=rx*Math.abs(Math.sin(rg.tilt))
        const a=rg.a*(0.7+0.3*Math.sin(T*0.8+rg.ph))*gm
        ctx.save(); ctx.translate(CX,CY); ctx.rotate(ang)
        ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2-rg.gap)
        ctx.strokeStyle=`rgba(${gr},${gg},${gb},${a})`; ctx.lineWidth=rg.w
        ctx.shadowBlur=8; ctx.stroke()
        const ex=rx*Math.cos(Math.PI*2-rg.gap), ey=ry*Math.sin(Math.PI*2-rg.gap)
        ctx.fillStyle=`rgba(${Math.min(255,gr+80)},${Math.min(255,gg+80)},${gb},${a*1.5})`
        ctx.shadowBlur=15
        ctx.beginPath(); ctx.arc(ex,ey,rg.w*2.5,0,Math.PI*2); ctx.fill()
        ctx.restore()
      }
      ctx.shadowBlur = 0
    }

    // OPTIMIZED: shadowColor/shadowBlur hoisted outside loop (16 state changes → 1)
    function drawFiberBeams(gm: number) {
      const {gr, gg, gb} = pal
      ctx.shadowColor = `rgba(${gr},${gg},${gb},0.8)`
      ctx.shadowBlur  = 6
      for (const bm of BEAMS) {
        const a=bm.br*(0.5+0.5*Math.sin(T*1.2+bm.ang*3))*gm
        const ox=CX+Math.cos(bm.ang)*R*0.98, oy=CY+Math.sin(bm.ang)*R*0.98*Math.cos(bm.elv)
        const ex=CX+Math.cos(bm.ang)*R*(1+bm.len), ey=CY+Math.sin(bm.ang)*R*(1+bm.len)*Math.cos(bm.elv)
        const g=ctx.createLinearGradient(ox,oy,ex,ey)
        g.addColorStop(0,`rgba(${gr},${gg},${gb},${a*0.75})`)
        g.addColorStop(0.3,`rgba(${Math.round(gr*0.8)},${Math.round(gg*0.6)},${gb},${a*0.35})`)
        g.addColorStop(1,'rgba(0,0,0,0)')
        ctx.strokeStyle=g; ctx.lineWidth=bm.w
        ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ex,ey); ctx.stroke()
      }
      ctx.shadowBlur = 0
    }

    function drawGlass(gm: number) {
      const {gr, gg, gb} = pal
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip()
      const hlg=ctx.createRadialGradient(CX-R*0.3,CY-R*0.32,0,CX-R*0.3,CY-R*0.32,R*0.45)
      hlg.addColorStop(0,`rgba(255,240,255,${0.12*gm})`)
      hlg.addColorStop(0.4,`rgba(${Math.min(255,gr+80)},${Math.min(255,gg+80)},${gb},${0.04*gm})`)
      hlg.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=hlg; ctx.beginPath(); ctx.arc(CX-R*0.3,CY-R*0.32,R*0.45,0,Math.PI*2); ctx.fill()
      ctx.restore()
      ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2)
      const bg=ctx.createLinearGradient(CX-R,CY-R,CX+R,CY+R)
      bg.addColorStop(0,`rgba(${Math.min(255,gr+60)},${Math.min(255,gg+50)},${gb},${0.55*gm})`)
      bg.addColorStop(0.5,`rgba(${gr},${Math.round(gg*0.6)},${gb},${0.28*gm})`)
      bg.addColorStop(1,`rgba(${Math.round(gr*0.7)},${Math.round(gg*0.2)},${Math.round(gb*0.72)},${0.38*gm})`)
      ctx.strokeStyle=bg; ctx.lineWidth=1.5
      ctx.shadowColor=`rgba(${gr},${gg},${gb},0.7)`; ctx.shadowBlur=20; ctx.stroke()
      ctx.shadowBlur=0
    }

    function drawHudArcs(spd: number, gm: number) {
      const {gr, gg, gb} = pal
      const ARCS=[
        {r:R*1.18,s:-0.6,e:-0.1,w:1.0,a:0.28},{r:R*1.18,s:0.15,e:0.65,w:1.0,a:0.28},
        {r:R*1.24,s:2.5,e:3.9,w:0.7,a:0.18},{r:R*1.30,s:1.0,e:1.8,w:0.6,a:0.16},
        {r:R*1.12,s:3.2,e:5.8,w:0.5,a:0.13},
      ]
      const rot=T*0.15*spd
      ctx.shadowColor = `rgba(${gr},${gg},${gb},0.5)`
      for (const arc of ARCS) {
        ctx.beginPath(); ctx.arc(CX,CY,arc.r,arc.s+rot,arc.e+rot)
        ctx.strokeStyle=`rgba(${gr},${gg},${gb},${arc.a*gm})`; ctx.lineWidth=arc.w
        ctx.shadowBlur=5; ctx.stroke()
      }
      ctx.shadowBlur = 0
      for (let i=0; i<36; i++) {
        const ang=(i/36)*Math.PI*2+T*0.05, len=i%6===0?10:5, r1=R*1.35
        ctx.beginPath()
        ctx.moveTo(CX+Math.cos(ang)*r1, CY+Math.sin(ang)*r1)
        ctx.lineTo(CX+Math.cos(ang)*(r1+len), CY+Math.sin(ang)*(r1+len))
        ctx.strokeStyle=`rgba(${gr},${Math.round(gg*0.6)},${gb},${i%6===0?0.35:0.12})`
        ctx.lineWidth=0.8; ctx.stroke()
      }
    }

    function drawFloor(gm: number) {
      const {gr, gg, gb} = pal
      const fy = CY + R + R * 0.07
      const floorRadii = [0.52, 0.82, 1.18, 1.60, 2.12]
      ctx.shadowColor = `rgba(${gr},${gg},${gb},0.55)`
      for (let i = 0; i < floorRadii.length; i++) {
        const rx = R * floorRadii[i]
        const ry = rx * 0.11
        const pulse = 0.05 + 0.035 * Math.sin(T * 0.8 + i * 0.5)
        const a = pulse * gm * (1 - (i / floorRadii.length) * 0.55)
        ctx.strokeStyle = `rgba(${gr},${gg},${gb},${a})`
        ctx.lineWidth   = i < 2 ? 1.4 : 0.7
        ctx.shadowBlur  = i < 2 ? 10 : 3
        ctx.beginPath(); ctx.ellipse(CX, fy, rx, ry, 0, 0, Math.PI*2); ctx.stroke()
      }
      ctx.shadowBlur = 0
      const cR = R * 2.12, cRY = cR * 0.11
      ctx.strokeStyle = `rgba(${gr},${gg},${gb},${0.10 * gm})`; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(CX - cR, fy); ctx.lineTo(CX + cR, fy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(CX, fy - cRY * 1.5); ctx.lineTo(CX, fy + cRY * 2.2); ctx.stroke()
    }

    // ── Render loop ───────────────────────────────────────────────────────
    function render(now: number) {
      frameCount++
      const dt = Math.min((now - ft) / 1000, 0.05)
      ft = now; T += dt

      const rs  = STATE_MAP[stateRef.current]
      const cfg = CFG[rs]

      // Smooth palette lerp
      const lf = 0.04
      const tgt = PALS[rs]
      pal.sr += (tgt.sr - pal.sr)*lf; pal.sg += (tgt.sg - pal.sg)*lf; pal.sb += (tgt.sb - pal.sb)*lf
      pal.gr += (tgt.gr - pal.gr)*lf; pal.gg += (tgt.gg - pal.gg)*lf; pal.gb += (tgt.gb - pal.gb)*lf
      pal.pr += (tgt.pr - pal.pr)*lf; pal.pg += (tgt.pg - pal.pg)*lf; pal.pb += (tgt.pb - pal.pb)*lf
      pal.cr += (tgt.cr - pal.cr)*lf; pal.cg += (tgt.cg - pal.cg)*lf; pal.cb += (tgt.cb - pal.cb)*lf
      pal.rr += (tgt.rr - pal.rr)*lf; pal.rg += (tgt.rg - pal.rg)*lf; pal.rb += (tgt.rb - pal.rb)*lf

      tx += (((mx-CX)/(W*0.5))*0.4 - tx)*0.06
      ty += (((my-CY)/(H*0.5))*0.3 - ty)*0.06

      if (cfg.pulse) {
        const iv = rs==='listening' ? 1.4 : 0.9
        if (T-lastP > iv) { pulseQ.push({born:T}); lastP=T }
      }

      // Safety reset — prevents stale shadow state leaking across frames
      ctx.shadowBlur = 0
      ctx.clearRect(0, 0, W, H)
      if (!bgCv) buildBg()
      ctx.drawImage(bgCv!, 0, 0)

      drawFloor(cfg.glow)
      outerGlow(cfg.glow)

      // Ripples
      const {gr: gr2, gg: gg2, gb: gb2} = pal
      ctx.shadowColor = `rgba(${gr2},${gg2},${gb2},0.9)`
      for (let i=ripples.length-1; i>=0; i--) {
        const cr=ripples[i], age=T-cr.born
        if (age>1.6){ripples.splice(i,1);continue}
        const p=age/1.6
        for (let ring=0;ring<3;ring++){
          const rp=Math.max(0,p-ring*0.15)
          ctx.beginPath(); ctx.arc(cr.x,cr.y,R*(0.2+rp*2.0),0,Math.PI*2)
          ctx.strokeStyle=`rgba(${Math.min(255,gr2+80)},${Math.min(255,gg2+80)},${gb2},${(1-rp)*(0.65-ring*0.18)})`
          ctx.lineWidth=2-ring*0.5; ctx.shadowBlur=18; ctx.stroke()
        }
      }
      ctx.shadowBlur = 0

      // Pulse rings
      ctx.shadowColor = `rgba(${gr2},${gg2},${gb2},0.8)`
      for (let i=pulseQ.length-1; i>=0; i--) {
        const pr=pulseQ[i], age=T-pr.born
        if (age>2.8){pulseQ.splice(i,1);continue}
        const p=age/2.8
        ctx.beginPath(); ctx.arc(CX,CY,R*(1.0+p*1.6),0,Math.PI*2)
        ctx.strokeStyle=`rgba(${gr2},${gg2},${gb2},${(1-p)*0.50*cfg.glow})`
        ctx.lineWidth=1.5*(1-p*0.5); ctx.shadowBlur=12; ctx.stroke()
      }
      ctx.shadowBlur = 0

      // OPTIMIZED: wave rings — no shadow (they're semi-transparent; blur adds cost, not much visual)
      if (cfg.wave) {
        for (let w=0;w<5;w++){
          const ph=(T*1.8+w*0.7)%(Math.PI*2)
          const rad=R*(1.0+(w/5)*0.8+Math.sin(ph)*0.05)
          const a=(1-w/5)*0.28*Math.abs(Math.sin(ph))*cfg.glow
          ctx.beginPath(); ctx.arc(CX,CY,rad,0,Math.PI*2)
          ctx.strokeStyle=`rgba(${gr2},${gg2},${gb2},${a})`; ctx.lineWidth=1; ctx.stroke()
        }
      }

      sphereBase(cfg.glow)
      contourLines(T, cfg.speed, rs)
      // Reduced particle count during speaking: 1 400 vs 2 200
      const ptCount = rs === 'speaking' ? N_PT_SPEAK : N_PT
      drawParticles(cfg.speed, cfg.pb, ptCount)
      drawRibbons(cfg.speed, cfg.glow, rs)
      drawCoreGlow(cfg.glow)
      if (cfg.scan) drawScanLines()
      drawOrbitRings(cfg.speed, cfg.glow)
      drawFiberBeams(cfg.glow)
      drawGlass(cfg.glow)
      drawHudArcs(cfg.speed, cfg.glow)
    }

    geom()

    const onResize  = () => geom()
    const onMove    = (e: MouseEvent) => {
      mx=e.clientX; my=e.clientY
      const dx=e.clientX-CX, dy=e.clientY-CY
      cv.style.cursor = Math.sqrt(dx*dx+dy*dy)<R*1.05?'pointer':'default'
    }
    const onLeave   = () => { cv.style.cursor='default' }
    const onClick2  = (e: MouseEvent) => {
      const dx=e.clientX-CX, dy=e.clientY-CY
      if (Math.sqrt(dx*dx+dy*dy)<R*1.15){
        ripples.push({x:e.clientX,y:e.clientY,born:T})
        clickRef.current()
      }
    }

    window.addEventListener('resize', onResize)
    cv.addEventListener('mousemove', onMove)
    cv.addEventListener('mouseleave', onLeave)
    cv.addEventListener('click', onClick2)

    let rafId: number
    const loop = (now: number) => { render(now); rafId = requestAnimationFrame(loop) }
    rafId = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', onResize)
      cv.removeEventListener('mousemove', onMove)
      cv.removeEventListener('mouseleave', onLeave)
      cv.removeEventListener('click', onClick2)
      cancelAnimationFrame(rafId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />
}
