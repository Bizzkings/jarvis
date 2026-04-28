'use client'

import { useEffect, useRef } from 'react'
import type { AssistantState } from '@/lib/assistant/types'

interface Props {
  state: AssistantState
  onClick: () => void
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
  listening: { speed: 0.85, glow: 1.10, pulse: true,  scan: false, wave: false, pb: 1.00 },
  thinking:  { speed: 1.70, glow: 0.90, pulse: false, scan: true,  wave: false, pb: 0.80 },
  speaking:  { speed: 1.10, glow: 1.20, pulse: true,  scan: false, wave: true,  pb: 1.00 },
}

const N_PT = 2200
const GOLD = Math.PI * (3 - Math.sqrt(5))

function fbm(x: number, y: number, t: number) {
  return (
    Math.sin(x*2.1 + t*0.4)  * Math.cos(y*1.7 + t*0.3)  * 0.40 +
    Math.sin(x*3.7 + y*2.3   + t*0.6)                    * 0.28 +
    Math.cos(x*1.3 - y*3.1   + t*0.2)                    * 0.18 +
    Math.sin(x*5.1 + y*4.3   - t*0.5)                    * 0.09 +
    Math.cos(x*0.8 - y*0.5   + t*0.15)                   * 0.05
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

    // Fibonacci sphere particles (init once)
    const pts = new Float32Array(N_PT * 5) // nx ny nz size bright
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
      { tilt: 0.35, ph: 0.0, spd: 0.08, rs: 0.92, gap: 0.45, w: 1.5, a: 0.55 },
      { tilt: 1.15, ph: 1.2, spd: 0.12, rs: 0.88, gap: 0.70, w: 1.0, a: 0.40 },
      { tilt: 0.75, ph: 2.5, spd: 0.06, rs: 1.02, gap: 0.30, w: 2.0, a: 0.35 },
      { tilt: 1.55, ph: 0.8, spd: 0.15, rs: 0.95, gap: 0.55, w: 0.8, a: 0.30 },
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

    // Mutable render state (no React state — no re-renders)
    let W = 0, H = 0, CX = 0, CY = 0, R = 0
    let bgCv: HTMLCanvasElement | null = null
    let T = 0, ft = performance.now()
    let mx = 0, my = 0, tx = 0, ty = 0
    let pulseQ:  { born: number }[] = []
    let lastP = 0
    let ripples: { x: number; y: number; born: number }[] = []
    let cFrame = 0
    const cOffCv = document.createElement('canvas')
    let cOffValid = false

    function geom() {
      W  = cv.width  = window.innerWidth
      H  = cv.height = window.innerHeight
      CX = W / 2
      const avail = H - 152 - 52
      R  = Math.min(W * 0.25, avail * 0.44, 290)
      CY = avail * 0.46 + R * 0.05
      bgCv = null; cOffValid = false
      geoRef.current?.(CX, CY, R)
    }

    function buildBg() {
      const bg = document.createElement('canvas')
      bg.width = W; bg.height = H
      const bc = bg.getContext('2d')!

      bc.fillStyle = '#000000'; bc.fillRect(0, 0, W, H)

      const vg = bc.createRadialGradient(W/2, H*0.4, R*0.8, W/2, H*0.4, Math.max(W,H)*0.8)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(0,2,8,0.4)'); vg.addColorStop(1, 'rgba(0,0,2,0.9)')
      bc.fillStyle = vg; bc.fillRect(0, 0, W, H)

      for (let p = 0; p < 6; p++) {
        const px = (p / 5) * W
        const gr = bc.createLinearGradient(px, 0, px, H)
        gr.addColorStop(0, 'rgba(0,60,90,0)'); gr.addColorStop(0.3, 'rgba(0,60,90,0.05)')
        gr.addColorStop(0.7, 'rgba(0,60,90,0.05)'); gr.addColorStop(1, 'rgba(0,60,90,0)')
        bc.strokeStyle = gr; bc.lineWidth = 0.5
        bc.beginPath(); bc.moveTo(px, 0); bc.lineTo(px, H); bc.stroke()
      }

      bc.strokeStyle = 'rgba(0,80,120,0.09)'; bc.lineWidth = 0.7
      const hs = 60, s3 = Math.sqrt(3)
      for (let gy = -1; gy * hs * 1.5 < H + hs; gy++) {
        for (let gx = -1; gx * hs * s3 < W + hs; gx++) {
          const ox = (((gy % 2) + 2) % 2) * hs * s3 / 2
          const hx = gx * hs * s3 + ox, hy = gy * hs * 1.5
          bc.beginPath()
          for (let e = 0; e < 6; e++) {
            const a = (e/6)*Math.PI*2 - Math.PI/6
            e === 0 ? bc.moveTo(hx+hs*Math.cos(a), hy+hs*Math.sin(a))
                    : bc.lineTo(hx+hs*Math.cos(a), hy+hs*Math.sin(a))
          }
          bc.closePath(); bc.stroke()
        }
      }

      const fg = bc.createRadialGradient(W/2, H*0.85, 0, W/2, H*0.85, W*0.45)
      fg.addColorStop(0, 'rgba(0,50,80,0.18)'); fg.addColorStop(0.4, 'rgba(0,30,50,0.08)'); fg.addColorStop(1, 'rgba(0,0,0,0)')
      bc.fillStyle = fg; bc.fillRect(0, 0, W, H)

      bc.strokeStyle = 'rgba(0,100,140,0.10)'; bc.lineWidth = 0.7
      const fY = H * 0.72
      for (let lx = -12; lx <= 12; lx++) {
        const x = W/2 + lx * W * 0.06
        bc.beginPath(); bc.moveTo(W/2, fY); bc.lineTo(x, H+10); bc.stroke()
      }
      for (let ly = 0; ly < 8; ly++) {
        const y = fY + ly*(H-fY)/7, sp = 0.2 + ly/7*0.8
        bc.beginPath(); bc.moveTo(W/2-W*sp, y); bc.lineTo(W/2+W*sp, y); bc.stroke()
      }
      bgCv = bg
    }

    function outerGlow(gm: number) {
      const gr = ctx.createRadialGradient(CX, CY, R*0.4, CX, CY, R*3.2)
      gr.addColorStop(0, `rgba(160,40,255,${0.32*gm})`); gr.addColorStop(0.25, `rgba(120,20,240,${0.20*gm})`)
      gr.addColorStop(0.55, `rgba(70,10,180,${0.08*gm})`); gr.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(CX, CY, R*3.2, 0, Math.PI*2); ctx.fill()

      const mid = ctx.createRadialGradient(CX, CY, R*0.5, CX, CY, R*1.6)
      mid.addColorStop(0, `rgba(200,60,255,${0.45*gm})`); mid.addColorStop(0.4, `rgba(160,30,240,${0.22*gm})`); mid.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(CX, CY, R*1.6, 0, Math.PI*2); ctx.fill()

      const bl = ctx.createRadialGradient(CX, CY, R*0.2, CX, CY, R*1.05)
      bl.addColorStop(0, `rgba(230,120,255,${0.55*gm})`); bl.addColorStop(0.5, `rgba(180,60,255,${0.25*gm})`); bl.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(CX, CY, R*1.05, 0, Math.PI*2); ctx.fill()
    }

    function sphereBase(gm: number) {
      const gr = ctx.createRadialGradient(CX-R*0.2, CY-R*0.2, R*0.05, CX, CY, R)
      gr.addColorStop(0, `rgba(60,10,140,${0.85*gm})`); gr.addColorStop(0.4, 'rgba(30,5,80,0.92)')
      gr.addColorStop(0.75, 'rgba(15,3,45,0.96)'); gr.addColorStop(1, 'rgba(5,0,20,0.98)')
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill()
    }

    function contourLines(t: number, spd: number) {
      cFrame++
      const G = 72, span = R*2.05, cs = span/G
      const x0 = CX - span/2, y0 = CY - span/2

      if (cFrame % 2 === 0 || !cOffValid) {
        const grid = new Float32Array((G+1)*(G+1))
        for (let gy = 0; gy <= G; gy++)
          for (let gx = 0; gx <= G; gx++)
            grid[gy*(G+1)+gx] = fbm((gx/G-0.5)*5.5, (gy/G-0.5)*5.5, t*spd)

        const sw = Math.ceil(span), sh = Math.ceil(span)
        cOffCv.width = sw; cOffCv.height = sh
        const oc = cOffCv.getContext('2d')!
        oc.clearRect(0, 0, sw, sh)

        const LVS = [
          { v: -0.52, a: 0.12, lw: 0.5 }, { v: -0.35, a: 0.18, lw: 0.7 },
          { v: -0.18, a: 0.28, lw: 0.9 }, { v:  0.00, a: 0.38, lw: 1.1 },
          { v:  0.18, a: 0.28, lw: 0.9 }, { v:  0.35, a: 0.18, lw: 0.7 },
          { v:  0.52, a: 0.12, lw: 0.5 },
        ]
        for (const lv of LVS) {
          oc.beginPath(); oc.strokeStyle = `rgba(160,60,255,${lv.a})`
          oc.lineWidth = lv.lw; oc.shadowColor = '#9933ff'; oc.shadowBlur = 3
          for (let gy = 0; gy < G; gy++) {
            for (let gx = 0; gx < G; gx++) {
              const v00=grid[gy*(G+1)+gx], v10=grid[gy*(G+1)+gx+1]
              const v01=grid[(gy+1)*(G+1)+gx], v11=grid[(gy+1)*(G+1)+gx+1]
              const th=lv.v
              const b=(v00>th?8:0)|(v10>th?4:0)|(v11>th?2:0)|(v01>th?1:0)
              if (b===0||b===15) continue
              const ex=gx*cs, ey=gy*cs
              const txp=ex+(th-v00)/(v10-v00)*cs, typ=ey
              const bxp=ex+(th-v01)/(v11-v01)*cs, byp=ey+cs
              const lxp=ex, lyp=ey+(th-v00)/(v01-v00)*cs
              const rxp=ex+cs, ryp=ey+(th-v10)/(v11-v10)*cs
              switch (b) {
                case 1: case 14: oc.moveTo(lxp,lyp); oc.lineTo(bxp,byp); break
                case 2: case 13: oc.moveTo(bxp,byp); oc.lineTo(rxp,ryp); break
                case 3: case 12: oc.moveTo(lxp,lyp); oc.lineTo(rxp,ryp); break
                case 4: case 11: oc.moveTo(txp,typ); oc.lineTo(rxp,ryp); break
                case 5: oc.moveTo(txp,typ); oc.lineTo(lxp,lyp); oc.moveTo(bxp,byp); oc.lineTo(rxp,ryp); break
                case 6: case 9: oc.moveTo(txp,typ); oc.lineTo(bxp,byp); break
                case 7: case 8: oc.moveTo(txp,typ); oc.lineTo(lxp,lyp); break
                case 10: oc.moveTo(txp,typ); oc.lineTo(rxp,ryp); oc.moveTo(bxp,byp); oc.lineTo(lxp,lyp); break
              }
            }
          }
          oc.stroke()
        }
        cOffValid = true
      }

      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R*0.995, 0, Math.PI*2); ctx.clip()
      ctx.drawImage(cOffCv, x0, y0)
      ctx.restore()
    }

    function drawParticles(spd: number, pb: number) {
      const ry = T*spd*0.2 + tx,  rx = T*spd*0.08 + ty
      const cy = Math.cos(ry), sy = Math.sin(ry)
      const cx2 = Math.cos(rx), sx = Math.sin(rx)
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.clip()
      for (let i = 0; i < N_PT; i++) {
        const o = i*5
        const nx=pts[o], ny=pts[o+1], nz=pts[o+2], sz=pts[o+3], br=pts[o+4]
        const nx2=nx*cy-nz*sy, nz2=nx*sy+nz*cy
        const ny2=ny*cx2-nz2*sx, nz3=ny*sx+nz2*cx2
        if (nz3 < -0.25) continue
        const px=CX+nx2*R, py=CY+ny2*R
        const depth=(nz3+1)/2, alpha=depth*br*pb, size=sz*(0.4+depth*0.6)
        if (alpha < 0.04) continue
        if (br > 0.7) {
          ctx.fillStyle=`rgba(220,160,255,${alpha*0.4})`
          ctx.beginPath(); ctx.arc(px,py,size*2.5,0,Math.PI*2); ctx.fill()
        }
        ctx.fillStyle=`rgba(200,130,255,${alpha})`
        ctx.beginPath(); ctx.arc(px,py,size,0,Math.PI*2); ctx.fill()
      }
      ctx.restore()
    }

    function drawRibbons(spd: number, gm: number) {
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R*0.96, 0, Math.PI*2); ctx.clip()
      for (const rb of RIBBONS) {
        const ph=rb.ph+T*rb.spd*spd, ph2=ph+1.8+Math.sin(T*0.3+rb.off)*0.8
        const sr=R*(0.72+Math.sin(ph+T*0.1)*0.18)
        const p1x=CX+Math.cos(ph)*sr, p1y=CY+Math.sin(ph)*sr*0.75
        const p2x=CX+Math.cos(ph2)*sr*0.9, p2y=CY+Math.sin(ph2)*sr*0.8
        const c1x=CX+Math.cos(ph+0.6+T*0.18)*R*(0.95+Math.sin(T*0.2)*0.3)
        const c1y=CY+Math.sin(ph+0.6+T*0.18)*R*0.65
        const c2x=CX+Math.cos(ph+2.3-T*0.12)*R*0.85
        const c2y=CY+Math.sin(ph+2.3-T*0.12)*R*(0.9+Math.cos(T*0.25)*0.2)
        const a=rb.br*gm*(0.75+0.25*Math.sin(T*2.5+rb.ph))
        ctx.lineWidth=rb.w*6; ctx.strokeStyle=`rgba(200,60,255,${a*0.5})`
        ctx.shadowColor='#cc00ff'; ctx.shadowBlur=30
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
        ctx.lineWidth=rb.w*2.2; ctx.strokeStyle=`rgba(220,110,255,${a*0.85})`; ctx.shadowBlur=14
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
        ctx.lineWidth=rb.w*0.6; ctx.strokeStyle=`rgba(255,220,255,${a*0.75})`
        ctx.shadowColor='#ffffff'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.moveTo(p1x,p1y); ctx.bezierCurveTo(c1x,c1y,c2x,c2y,p2x,p2y); ctx.stroke()
      }
      ctx.restore()
    }

    function drawCoreGlow(gm: number) {
      const p=0.8+0.2*Math.sin(T*1.8)*gm
      const gr=ctx.createRadialGradient(CX,CY,0,CX,CY,R*0.55)
      gr.addColorStop(0,`rgba(200,100,255,${0.55*p})`); gr.addColorStop(0.3,`rgba(140,40,220,${0.35*p})`)
      gr.addColorStop(0.7,`rgba(80,10,160,${0.15*p})`); gr.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(CX,CY,R*0.55,0,Math.PI*2); ctx.fill()
    }

    function drawScanLines() {
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip()
      for (let s=0; s<3; s++) {
        const sy=CY-R+((T*180*(0.8+s*0.15))%(R*2))
        const gr=ctx.createLinearGradient(CX-R,sy-4,CX-R,sy+4)
        gr.addColorStop(0,'rgba(180,100,255,0)'); gr.addColorStop(0.5,`rgba(180,100,255,${0.35-s*0.08})`); gr.addColorStop(1,'rgba(180,100,255,0)')
        ctx.fillStyle=gr; ctx.fillRect(CX-R,sy-4,R*2,8)
      }
      const sa=(T*2.5)%(Math.PI*2)
      ctx.strokeStyle='rgba(180,100,255,0.4)'; ctx.lineWidth=1.5; ctx.shadowColor='#aa44ff'; ctx.shadowBlur=10
      ctx.beginPath(); ctx.arc(CX,CY,R*0.7,sa,sa+1.2); ctx.stroke()
      ctx.beginPath(); ctx.arc(CX,CY,R*0.45,sa+Math.PI,sa+Math.PI+1.5); ctx.stroke()
      ctx.restore()
    }

    function drawOrbitRings(spd: number, gm: number) {
      for (const rg of RINGS) {
        const ang=rg.ph+T*rg.spd*spd
        const rx=R*rg.rs, ry=rx*Math.abs(Math.sin(rg.tilt))
        const a=rg.a*(0.7+0.3*Math.sin(T*0.8+rg.ph))*gm
        const arcL=Math.PI*2-rg.gap
        ctx.save(); ctx.translate(CX,CY); ctx.rotate(ang)
        ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,arcL)
        ctx.strokeStyle=`rgba(160,70,255,${a})`; ctx.lineWidth=rg.w
        ctx.shadowColor='#aa44ff'; ctx.shadowBlur=8; ctx.stroke()
        const ex=rx*Math.cos(arcL), ey=ry*Math.sin(arcL)
        ctx.fillStyle=`rgba(220,150,255,${a*1.5})`; ctx.shadowBlur=15
        ctx.beginPath(); ctx.arc(ex,ey,rg.w*2.5,0,Math.PI*2); ctx.fill()
        ctx.restore()
      }
    }

    function drawFiberBeams(gm: number) {
      for (const bm of BEAMS) {
        const a=bm.br*(0.5+0.5*Math.sin(T*1.2+bm.ang*3))*gm
        const ox=CX+Math.cos(bm.ang)*R*0.98, oy=CY+Math.sin(bm.ang)*R*0.98*Math.cos(bm.elv)
        const ex=CX+Math.cos(bm.ang)*R*(1+bm.len), ey=CY+Math.sin(bm.ang)*R*(1+bm.len)*Math.cos(bm.elv)
        const gr=ctx.createLinearGradient(ox,oy,ex,ey)
        gr.addColorStop(0,`rgba(200,100,255,${a*0.8})`); gr.addColorStop(0.3,`rgba(160,60,255,${a*0.4})`); gr.addColorStop(1,'rgba(100,20,200,0)')
        ctx.strokeStyle=gr; ctx.lineWidth=bm.w; ctx.shadowColor='#aa44ff'; ctx.shadowBlur=6
        ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ex,ey); ctx.stroke()
      }
    }

    function drawGlass(gm: number) {
      const hlg=ctx.createRadialGradient(CX-R*0.3,CY-R*0.32,0,CX-R*0.3,CY-R*0.32,R*0.45)
      hlg.addColorStop(0,`rgba(255,220,255,${0.13*gm})`); hlg.addColorStop(0.4,`rgba(220,160,255,${0.05*gm})`); hlg.addColorStop(1,'rgba(0,0,0,0)')
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip()
      ctx.fillStyle=hlg; ctx.beginPath(); ctx.arc(CX-R*0.3,CY-R*0.32,R*0.45,0,Math.PI*2); ctx.fill()
      ctx.restore()
      ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2)
      const bg=ctx.createLinearGradient(CX-R,CY-R,CX+R,CY+R)
      bg.addColorStop(0,`rgba(200,120,255,${0.6*gm})`); bg.addColorStop(0.5,`rgba(140,40,220,${0.3*gm})`); bg.addColorStop(1,`rgba(100,20,180,${0.4*gm})`)
      ctx.strokeStyle=bg; ctx.lineWidth=1.5; ctx.shadowColor='#cc66ff'; ctx.shadowBlur=20; ctx.stroke()
    }

    function drawHudArcs(spd: number, gm: number) {
      const ARCS=[
        {r:R*1.18,s:-0.6,e:-0.1,w:1.0,a:0.3},{r:R*1.18,s:0.15,e:0.65,w:1.0,a:0.3},
        {r:R*1.24,s:2.5,e:3.9,w:0.7,a:0.2},{r:R*1.30,s:1.0,e:1.8,w:0.6,a:0.18},
        {r:R*1.12,s:3.2,e:5.8,w:0.5,a:0.15},
      ]
      const rot=T*0.15*spd
      for (const arc of ARCS) {
        ctx.beginPath(); ctx.arc(CX,CY,arc.r,arc.s+rot,arc.e+rot)
        ctx.strokeStyle=`rgba(160,70,255,${arc.a*gm})`; ctx.lineWidth=arc.w
        ctx.shadowColor='#aa44ff'; ctx.shadowBlur=6; ctx.stroke()
      }
      for (let i=0; i<36; i++) {
        const ang=(i/36)*Math.PI*2+T*0.05, len=i%6===0?10:5, r1=R*1.35
        ctx.beginPath()
        ctx.moveTo(CX+Math.cos(ang)*r1, CY+Math.sin(ang)*r1)
        ctx.lineTo(CX+Math.cos(ang)*(r1+len), CY+Math.sin(ang)*(r1+len))
        ctx.strokeStyle=`rgba(140,60,220,${i%6===0?0.4:0.15})`; ctx.lineWidth=0.8; ctx.shadowBlur=0; ctx.stroke()
      }
    }

    function render(now: number) {
      const dt = Math.min((now - ft) / 1000, 0.05)
      ft = now; T += dt

      const rs  = STATE_MAP[stateRef.current]
      const cfg = CFG[rs]

      tx += (((mx-CX)/(W*0.5))*0.4 - tx) * 0.06
      ty += (((my-CY)/(H*0.5))*0.3 - ty) * 0.06

      if (cfg.pulse) {
        const iv = rs === 'listening' ? 1.4 : 0.9
        if (T - lastP > iv) { pulseQ.push({ born: T }); lastP = T }
      }

      ctx.clearRect(0, 0, W, H)
      if (!bgCv) buildBg()
      ctx.drawImage(bgCv!, 0, 0)

      outerGlow(cfg.glow)

      for (let i=ripples.length-1; i>=0; i--) {
        const cr=ripples[i], age=T-cr.born
        if (age>1.6){ripples.splice(i,1);continue}
        const p=age/1.6
        for (let ring=0;ring<3;ring++){
          const rp=Math.max(0,p-ring*0.15)
          ctx.beginPath(); ctx.arc(cr.x,cr.y,R*(0.2+rp*2.0),0,Math.PI*2)
          ctx.strokeStyle=`rgba(220,120,255,${(1-rp)*(0.7-ring*0.2)})`; ctx.lineWidth=2-ring*0.5
          ctx.shadowColor='#cc44ff'; ctx.shadowBlur=18; ctx.stroke()
        }
      }

      for (let i=pulseQ.length-1; i>=0; i--) {
        const pr=pulseQ[i], age=T-pr.born
        if (age>2.8){pulseQ.splice(i,1);continue}
        const p=age/2.8
        ctx.beginPath(); ctx.arc(CX,CY,R*(1.0+p*1.6),0,Math.PI*2)
        ctx.strokeStyle=`rgba(160,70,255,${(1-p)*0.55*cfg.glow})`; ctx.lineWidth=1.5*(1-p*0.5)
        ctx.shadowColor='#aa44ff'; ctx.shadowBlur=12; ctx.stroke()
      }

      if (cfg.wave) {
        for (let w=0;w<5;w++){
          const ph=(T*1.8+w*0.7)%(Math.PI*2)
          const rad=R*(1.0+(w/5)*0.8+Math.sin(ph)*0.05)
          const a=(1-w/5)*0.3*Math.abs(Math.sin(ph))*cfg.glow
          ctx.beginPath(); ctx.arc(CX,CY,rad,0,Math.PI*2)
          ctx.strokeStyle=`rgba(200,100,255,${a})`; ctx.lineWidth=1; ctx.shadowColor='#aa44ff'; ctx.shadowBlur=8; ctx.stroke()
        }
      }

      sphereBase(cfg.glow)
      contourLines(T, cfg.speed)
      drawParticles(cfg.speed, cfg.pb)
      drawRibbons(cfg.speed, cfg.glow)
      drawCoreGlow(cfg.glow)
      if (cfg.scan) drawScanLines()
      drawOrbitRings(cfg.speed, cfg.glow)
      drawFiberBeams(cfg.glow)
      drawGlass(cfg.glow)
      drawHudArcs(cfg.speed, cfg.glow)
    }

    geom()

    const onResize = () => { geom(); cOffValid = false }
    const onMove   = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      const dx=e.clientX-CX, dy=e.clientY-CY
      cv.style.cursor = Math.sqrt(dx*dx+dy*dy)<R*1.05 ? 'pointer' : 'default'
    }
    const onLeave  = () => { cv.style.cursor = 'default' }
    const onClick2 = (e: MouseEvent) => {
      const dx=e.clientX-CX, dy=e.clientY-CY
      if (Math.sqrt(dx*dx+dy*dy)<R*1.15) {
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
