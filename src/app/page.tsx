'use client'

import { useRef, useCallback } from 'react'
import JarvisCore from '@/components/jarvis/JarvisCore'

function HudPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative px-4 py-3 ${className}`}
      style={{ background: 'rgba(6,0,18,0.88)', border: '1px solid rgba(110,50,240,0.14)' }}
    >
      <span className="absolute top-0 left-0  block w-3 h-px" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute top-0 left-0  block w-px h-3" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute top-0 right-0 block w-3 h-px" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute top-0 right-0 block w-px h-3" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute bottom-0 left-0  block w-3 h-px" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute bottom-0 left-0  block w-px h-3" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute bottom-0 right-0 block w-3 h-px" style={{ background: 'rgba(140,60,255,0.65)' }} />
      <span className="absolute bottom-0 right-0 block w-px h-3" style={{ background: 'rgba(140,60,255,0.65)' }} />
      {children}
    </div>
  )
}

function HudLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(168,100,255,0.88)' }}>{children}</p>
}
function HudStat({ value, dim }: { value: string; dim?: boolean }) {
  return (
    <p className="text-[9px] tracking-[0.2em] uppercase mb-0.5"
       style={{ color: dim ? 'rgba(130,80,220,0.38)' : 'rgba(158,108,240,0.65)' }}>
      {value}
    </p>
  )
}
function MiniWaveform() {
  const h = [2, 3, 5, 3, 4, 2, 5, 4, 3, 2, 4, 3]
  return (
    <div className="flex items-end gap-0.5 mt-2" style={{ height: 12 }}>
      {h.map((v, i) => (
        <div key={i} className="w-0.5 rounded-full"
             style={{ height: v * 2, background: `rgba(140,60,255,${0.12 + v * 0.08})` }} />
      ))}
    </div>
  )
}

export default function Home() {
  const bgRef  = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth  - 0.5) * 2
    const y = (e.clientY / window.innerHeight - 0.5) * 2
    if (bgRef.current)  bgRef.current.style.transform  = `translate(${x * -12}px, ${y * -12}px)`
    if (midRef.current) midRef.current.style.transform = `translate(${x * -24}px, ${y * -24}px)`
  }, [])

  return (
    <main
      className="relative flex flex-col items-center justify-start min-h-screen overflow-hidden"
      style={{ background: '#050010' }}
      onMouseMove={onMouseMove}
    >

      {/* ─── Deep layer: blurred room atmosphere ─────────────────────────────── */}
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ willChange: 'transform', transition: 'transform 0.15s ease-out' }}
      >
        {/* Left server rack column */}
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{
            width: '18%',
            background: 'linear-gradient(to right, rgba(20,5,40,0.85) 0%, rgba(15,4,32,0.40) 60%, transparent 100%)',
            filter: 'blur(1.5px)',
          }}
        >
          {/* Rack shelves */}
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: '12%', right: '5%',
              top: `${5 + i * 5.2}%`, height: '1px',
              background: `rgba(80,25,160,${i % 3 === 0 ? 0.22 : 0.08})`,
            }} />
          ))}
          {/* Rack vertical struts */}
          <div style={{ position: 'absolute', left: '10%', top: '4%', bottom: '4%', width: 1, background: 'rgba(70,20,140,0.18)' }} />
          <div style={{ position: 'absolute', left: '30%', top: '4%', bottom: '4%', width: 1, background: 'rgba(70,20,140,0.10)' }} />
        </div>

        {/* Right server rack column */}
        <div
          className="absolute top-0 right-0 bottom-0"
          style={{
            width: '18%',
            background: 'linear-gradient(to left, rgba(20,5,40,0.85) 0%, rgba(15,4,32,0.40) 60%, transparent 100%)',
            filter: 'blur(1.5px)',
          }}
        >
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: '5%', right: '12%',
              top: `${5 + i * 5.2}%`, height: '1px',
              background: `rgba(80,25,160,${i % 3 === 0 ? 0.22 : 0.08})`,
            }} />
          ))}
          <div style={{ position: 'absolute', right: '10%', top: '4%', bottom: '4%', width: 1, background: 'rgba(70,20,140,0.18)' }} />
          <div style={{ position: 'absolute', right: '30%', top: '4%', bottom: '4%', width: 1, background: 'rgba(70,20,140,0.10)' }} />
        </div>

        {/* Ceiling horizontal beams */}
        <div style={{ position: 'absolute', left: '15%', right: '15%', top: '5%',  height: 1, background: 'rgba(80,20,150,0.18)' }} />
        <div style={{ position: 'absolute', left: '18%', right: '18%', top: '9%',  height: 1, background: 'rgba(80,20,150,0.10)' }} />
        <div style={{ position: 'absolute', left: '20%', right: '20%', top: '13%', height: 1, background: 'rgba(80,20,150,0.06)' }} />
      </div>

      {/* ─── Mid layer: perspective floor grid ───────────────────────────────── */}
      <div
        ref={midRef}
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '50%', willChange: 'transform', transition: 'transform 0.15s ease-out' }}
      >
        <div style={{
          width: '100%', height: '100%',
          transform: 'perspective(420px) rotateX(65deg)',
          transformOrigin: 'bottom center',
          backgroundImage: `
            linear-gradient(rgba(100,28,220,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,28,220,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '55px 55px',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 85%)',
        }} />
      </div>

      {/* Central atmospheric glow */}
      <div className="absolute pointer-events-none" style={{
        top: '5%', left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 900,
        background: 'radial-gradient(circle, rgba(80,0,200,0.20) 0%, rgba(45,0,110,0.09) 32%, transparent 62%)',
        borderRadius: '50%',
      }} />

      {/* Scan line */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(120,50,255,0.22), rgba(165,80,255,0.42), rgba(120,50,255,0.22), transparent)',
        animation: 'scan 12s ease-in-out infinite',
      }} />

      {/* Page corner brackets */}
      <div className="absolute top-5 left-5  w-8 h-8 pointer-events-none" style={{ borderTop:    '1px solid rgba(130,60,255,0.35)', borderLeft:   '1px solid rgba(130,60,255,0.35)' }} />
      <div className="absolute top-5 right-5 w-8 h-8 pointer-events-none" style={{ borderTop:    '1px solid rgba(130,60,255,0.35)', borderRight:  '1px solid rgba(130,60,255,0.35)' }} />
      <div className="absolute bottom-5 left-5  w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(130,60,255,0.35)', borderLeft:   '1px solid rgba(130,60,255,0.35)' }} />
      <div className="absolute bottom-5 right-5 w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(130,60,255,0.35)', borderRight:  '1px solid rgba(130,60,255,0.35)' }} />

      {/* ─── HUD panels ────────────────────────────────────────────────────── */}
      <div className="absolute top-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HudLabel>JARVIS ONLINE</HudLabel>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#9040f0', boxShadow: '0 0 5px #9040f0', animation: 'hud-blink 3s ease-in-out infinite' }} />
            <HudStat value="SYSTEM ACTIVE" />
          </div>
          <HudStat value="VOICE ENABLED" dim />
          <MiniWaveform />
        </HudPanel>
      </div>

      <div className="absolute top-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right">
          <HudLabel>SYSTEM STATUS</HudLabel>
          <HudStat value="ONLINE" />
          <HudStat value="OPTIMAL" />
          <HudStat value="NEURAL NET" dim />
          <HudStat value="98.7%" />
        </HudPanel>
      </div>

      <div className="absolute bottom-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HudLabel>LEARNING</HudLabel>
          <HudStat value="ADAPTIVE MODE" dim />
          <HudStat value="ENGAGED" />
        </HudPanel>
      </div>

      <div className="absolute bottom-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right">
          <HudLabel>CONNECTIONS</HudLabel>
          <HudStat value="SECURE" dim />
          <HudStat value="ENCRYPTED" />
        </HudPanel>
      </div>

      {/* ─── Raised hexagonal floor platform ─────────────────────────────────── */}
      <div className="absolute pointer-events-none z-5" style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>
        <svg width="520" height="160" viewBox="0 0 520 160" fill="none">
          {/* Platform shadow blur */}
          <ellipse cx="260" cy="140" rx="200" ry="22"
            fill="rgba(80,0,180,0.18)" />

          {/* Outer rim ellipse */}
          <ellipse cx="260" cy="110" rx="230" ry="46"
            fill="rgba(8,3,20,0.82)"
            stroke="rgba(90,40,200,0.35)" strokeWidth="1.2" />

          {/* Mid ring */}
          <ellipse cx="260" cy="108" rx="185" ry="36"
            fill="rgba(6,2,16,0.70)"
            stroke="rgba(80,35,180,0.22)" strokeWidth="0.8" />

          {/* Inner ring */}
          <ellipse cx="260" cy="106" rx="135" ry="26"
            fill="rgba(5,1,14,0.60)"
            stroke="rgba(70,28,160,0.18)" strokeWidth="0.6" />

          {/* Radial spokes */}
          {[0,45,90,135,180,225,270,315].map(deg => (
            <line key={deg}
              x1="260" y1="108"
              x2={260 + Math.cos(deg * Math.PI / 180) * 225}
              y2={108 + Math.sin(deg * Math.PI / 180) * 45}
              stroke="rgba(80,30,180,0.12)" strokeWidth="0.6" />
          ))}

          {/* Left glowing screen panel */}
          <rect x="88" y="101" width="88" height="16" rx="3"
            fill="rgba(20,8,50,0.85)"
            stroke="rgba(80,180,255,0.55)" strokeWidth="0.8">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          </rect>
          {/* Screen interior glow */}
          <rect x="90" y="103" width="84" height="12" rx="2"
            fill="rgba(60,140,255,0.08)">
            <animate attributeName="fill" values="rgba(60,140,255,0.06);rgba(60,140,255,0.16);rgba(60,140,255,0.06)" dur="3s" repeatCount="indefinite" />
          </rect>
          {/* Screen scanlines */}
          {[0,3,6,9].map(dy => (
            <line key={dy} x1="92" y1={106+dy} x2="172" y2={106+dy}
              stroke="rgba(100,180,255,0.12)" strokeWidth="0.5" />
          ))}

          {/* Right glowing screen panel */}
          <rect x="344" y="101" width="88" height="16" rx="3"
            fill="rgba(20,8,50,0.85)"
            stroke="rgba(80,180,255,0.55)" strokeWidth="0.8">
            <animate attributeName="opacity" values="1;0.7;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="346" y="103" width="84" height="12" rx="2"
            fill="rgba(60,140,255,0.08)">
            <animate attributeName="fill" values="rgba(60,140,255,0.16);rgba(60,140,255,0.06);rgba(60,140,255,0.16)" dur="3s" repeatCount="indefinite" />
          </rect>
          {[0,3,6,9].map(dy => (
            <line key={dy} x1="346" y1={106+dy} x2="426" y2={106+dy}
              stroke="rgba(100,180,255,0.12)" strokeWidth="0.5" />
          ))}

          {/* Center node */}
          <circle cx="260" cy="108" r="5" fill="rgba(130,60,255,0.25)" stroke="rgba(150,80,255,0.55)" strokeWidth="0.8" />
          <circle cx="260" cy="108" r="2.5" fill="rgba(180,100,255,0.70)">
            <animate attributeName="r" values="2;3.2;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Outer accent dots */}
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <circle key={deg}
              cx={260 + Math.cos(deg * Math.PI / 180) * 228}
              cy={108 + Math.sin(deg * Math.PI / 180) * 45.5}
              r="2" fill="rgba(130,60,255,0.55)" />
          ))}
        </svg>
      </div>

      {/* ─── Main content ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-full min-h-screen">
        <JarvisCore />
        <p className="text-[9px] tracking-[0.35em] uppercase mt-1"
           style={{ color: 'rgba(130,70,255,0.24)' }}>
          HOW CAN I ASSIST YOU TODAY?
        </p>
      </div>
    </main>
  )
}
