'use client'

import { useRef, useCallback } from 'react'
import JarvisCore from '@/components/jarvis/JarvisCore'

function HudPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative px-4 py-3 ${className}`}
         style={{ background: 'rgba(5,0,16,0.88)', border: '1px solid rgba(110,50,240,0.14)' }}>
      {[['top-0 left-0','w-3 h-px'],['top-0 left-0','w-px h-3'],
        ['top-0 right-0','w-3 h-px'],['top-0 right-0','w-px h-3'],
        ['bottom-0 left-0','w-3 h-px'],['bottom-0 left-0','w-px h-3'],
        ['bottom-0 right-0','w-3 h-px'],['bottom-0 right-0','w-px h-3'],
      ].map(([pos, size], i) => (
        <span key={i} className={`absolute ${pos} block ${size}`}
              style={{ background: 'rgba(140,60,255,0.62)' }} />
      ))}
      {children}
    </div>
  )
}
function HL({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] tracking-[0.25em] uppercase mb-2 font-mono"
             style={{ color: 'rgba(168,100,255,0.88)' }}>{children}</p>
}
function HS({ value, dim }: { value: string; dim?: boolean }) {
  return <p className="text-[9px] tracking-[0.2em] uppercase mb-0.5 font-mono"
             style={{ color: dim ? 'rgba(130,80,220,0.38)' : 'rgba(158,108,240,0.65)' }}>{value}</p>
}
function MiniWave() {
  const h = [2,3,5,3,4,2,5,4,3,2,4,3]
  return (
    <div className="flex items-end gap-0.5 mt-2" style={{ height: 12 }}>
      {h.map((v,i) => <div key={i} className="w-0.5 rounded-full"
        style={{ height: v*2, background: `rgba(140,60,255,${0.12+v*0.08})` }} />)}
    </div>
  )
}

export default function Home() {
  const bgRef  = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth  - 0.5) * 2
    const y = (e.clientY / window.innerHeight - 0.5) * 2
    if (bgRef.current)  bgRef.current.style.transform  = `translate(${x * -14}px, ${y * -14}px)`
    if (midRef.current) midRef.current.style.transform = `translate(${x * -28}px, ${y * -28}px)`
  }, [])

  return (
    <main
      className="relative flex flex-col items-center justify-start min-h-screen overflow-hidden"
      style={{ background: '#04000e' }}
      onMouseMove={onMouseMove}
    >

      {/* ── Deep background: dark room atmosphere ─────────────────────────── */}
      <div ref={bgRef} className="absolute inset-0 pointer-events-none"
           style={{ willChange: 'transform', transition: 'transform 0.14s ease-out' }}>

        {/* Left server rack */}
        <div className="absolute top-0 left-0 bottom-0" style={{
          width: '16%',
          background: 'linear-gradient(to right, rgba(18,4,38,0.90) 0%, rgba(12,2,28,0.45) 55%, transparent 100%)',
          filter: 'blur(1px)',
        }}>
          {Array.from({ length: 22 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: '14%', right: '6%',
              top: `${4 + i * 4.3}%`, height: 1,
              background: `rgba(70,20,150,${i % 3 === 0 ? 0.24 : 0.07})` }} />
          ))}
          <div style={{ position: 'absolute', left: '10%', top: '5%', bottom: '5%', width: 1, background: 'rgba(60,15,130,0.22)' }} />
          <div style={{ position: 'absolute', left: '28%', top: '5%', bottom: '5%', width: 1, background: 'rgba(60,15,130,0.12)' }} />
          {/* LEDs */}
          {[14,28,44,60,76,88].map(pct => (
            <div key={pct} style={{ position: 'absolute', right: '14%', top: `${pct}%`,
              width: 3, height: 3, borderRadius: '50%',
              background: '#7b2fff', boxShadow: '0 0 6px #7b2fff',
              animation: `hud-blink ${3+pct*0.02}s ease-in-out infinite`, animationDelay: `${pct*0.03}s` }} />
          ))}
        </div>

        {/* Right server rack */}
        <div className="absolute top-0 right-0 bottom-0" style={{
          width: '16%',
          background: 'linear-gradient(to left, rgba(18,4,38,0.90) 0%, rgba(12,2,28,0.45) 55%, transparent 100%)',
          filter: 'blur(1px)',
        }}>
          {Array.from({ length: 22 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: '6%', right: '14%',
              top: `${4 + i * 4.3}%`, height: 1,
              background: `rgba(70,20,150,${i % 3 === 0 ? 0.24 : 0.07})` }} />
          ))}
          <div style={{ position: 'absolute', right: '10%', top: '5%', bottom: '5%', width: 1, background: 'rgba(60,15,130,0.22)' }} />
          <div style={{ position: 'absolute', right: '28%', top: '5%', bottom: '5%', width: 1, background: 'rgba(60,15,130,0.12)' }} />
          {[8,24,38,55,70,85].map(pct => (
            <div key={pct} style={{ position: 'absolute', left: '14%', top: `${pct}%`,
              width: 3, height: 3, borderRadius: '50%',
              background: '#c77dff', boxShadow: '0 0 6px #c77dff',
              animation: `hud-blink ${3.5+pct*0.02}s ease-in-out infinite`, animationDelay: `${pct*0.04}s` }} />
          ))}
        </div>

        {/* Ceiling beams */}
        {[4,9,14].map(p => (
          <div key={p} style={{ position: 'absolute', left: '13%', right: '13%',
            top: `${p}%`, height: 1,
            background: `rgba(75,18,155,${0.20 - p * 0.008})` }} />
        ))}
      </div>

      {/* ── Mid layer: perspective floor grid ─────────────────────────────── */}
      <div ref={midRef} className="absolute bottom-0 left-0 right-0 pointer-events-none"
           style={{ height: '48%', willChange: 'transform', transition: 'transform 0.14s ease-out' }}>
        <div style={{
          width: '100%', height: '100%',
          transform: 'perspective(400px) rotateX(68deg)',
          transformOrigin: 'bottom center',
          backgroundImage: `
            linear-gradient(rgba(95,25,220,0.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(95,25,220,0.24) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 80%)',
        }} />
      </div>

      {/* Central atmospheric glow */}
      <div className="absolute pointer-events-none" style={{
        top: '4%', left: '50%', transform: 'translateX(-50%)',
        width: 880, height: 880,
        background: 'radial-gradient(circle, rgba(75,0,195,0.22) 0%, rgba(40,0,105,0.10) 30%, transparent 60%)',
        borderRadius: '50%',
      }} />

      {/* Scan line */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(115,48,252,0.22), rgba(162,78,255,0.44), rgba(115,48,252,0.22), transparent)',
        animation: 'scan 12s ease-in-out infinite',
      }} />

      {/* Page corner brackets */}
      <div className="absolute top-5 left-5  w-8 h-8 pointer-events-none" style={{ borderTop: '1px solid rgba(130,60,255,0.38)', borderLeft: '1px solid rgba(130,60,255,0.38)' }} />
      <div className="absolute top-5 right-5 w-8 h-8 pointer-events-none" style={{ borderTop: '1px solid rgba(130,60,255,0.38)', borderRight:'1px solid rgba(130,60,255,0.38)' }} />
      <div className="absolute bottom-5 left-5  w-8 h-8 pointer-events-none" style={{ borderBottom:'1px solid rgba(130,60,255,0.38)', borderLeft: '1px solid rgba(130,60,255,0.38)' }} />
      <div className="absolute bottom-5 right-5 w-8 h-8 pointer-events-none" style={{ borderBottom:'1px solid rgba(130,60,255,0.38)', borderRight:'1px solid rgba(130,60,255,0.38)' }} />

      {/* HUD panels */}
      <div className="absolute top-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HL>JARVIS ONLINE</HL>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#9040f0', boxShadow: '0 0 5px #9040f0', animation: 'hud-blink 3s ease-in-out infinite' }} />
            <HS value="SYSTEM ACTIVE" />
          </div>
          <HS value="VOICE ENABLED" dim />
          <MiniWave />
        </HudPanel>
      </div>
      <div className="absolute top-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right">
          <HL>SYSTEM STATUS</HL>
          <HS value="ONLINE" /><HS value="OPTIMAL" />
          <HS value="NEURAL NET" dim /><HS value="98.7%" />
        </HudPanel>
      </div>
      <div className="absolute bottom-10 left-10 hidden xl:block z-20">
        <HudPanel><HL>LEARNING</HL><HS value="ADAPTIVE MODE" dim /><HS value="ENGAGED" /></HudPanel>
      </div>
      <div className="absolute bottom-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right"><HL>CONNECTIONS</HL><HS value="SECURE" dim /><HS value="ENCRYPTED" /></HudPanel>
      </div>

      {/* Hexagonal floor platform */}
      <div className="absolute pointer-events-none z-5" style={{ bottom: '8%', left: '50%', transform: 'translateX(-50%)' }}>
        <svg width="540" height="165" viewBox="0 0 540 165" fill="none">
          <ellipse cx="270" cy="125" rx="240" ry="48" fill="rgba(8,2,22,0.80)" stroke="rgba(88,36,200,0.38)" strokeWidth="1.2" />
          <ellipse cx="270" cy="122" rx="196" ry="38" fill="rgba(5,1,18,0.70)" stroke="rgba(78,30,180,0.24)" strokeWidth="0.8" />
          <ellipse cx="270" cy="119" rx="145" ry="27" fill="rgba(4,1,14,0.60)" stroke="rgba(68,24,160,0.18)" strokeWidth="0.6" />
          {[0,45,90,135,180,225,270,315].map(deg => (
            <line key={deg} x1="270" y1="122"
              x2={270 + Math.cos(deg * Math.PI/180) * 235}
              y2={122 + Math.sin(deg * Math.PI/180) * 47}
              stroke="rgba(78,28,180,0.12)" strokeWidth="0.6" />
          ))}
          {/* Left screen */}
          <rect x="90" y="115" width="92" height="17" rx="3"
            fill="rgba(18,6,50,0.85)" stroke="rgba(78,175,255,0.58)" strokeWidth="0.8">
            <animate attributeName="opacity" values="0.68;1;0.68" dur="3.2s" repeatCount="indefinite" />
          </rect>
          <rect x="92" y="117" width="88" height="13" rx="2" fill="rgba(55,135,255,0.07)">
            <animate attributeName="fill" values="rgba(55,135,255,0.05);rgba(55,135,255,0.18);rgba(55,135,255,0.05)" dur="3.2s" repeatCount="indefinite" />
          </rect>
          {[0,4,8].map(dy => <line key={dy} x1="94" y1={120+dy} x2="178" y2={120+dy} stroke="rgba(100,178,255,0.12)" strokeWidth="0.5" />)}
          {/* Right screen */}
          <rect x="358" y="115" width="92" height="17" rx="3"
            fill="rgba(18,6,50,0.85)" stroke="rgba(78,175,255,0.58)" strokeWidth="0.8">
            <animate attributeName="opacity" values="1;0.68;1" dur="3.2s" repeatCount="indefinite" />
          </rect>
          <rect x="360" y="117" width="88" height="13" rx="2" fill="rgba(55,135,255,0.07)">
            <animate attributeName="fill" values="rgba(55,135,255,0.18);rgba(55,135,255,0.05);rgba(55,135,255,0.18)" dur="3.2s" repeatCount="indefinite" />
          </rect>
          {[0,4,8].map(dy => <line key={dy} x1="362" y1={120+dy} x2="446" y2={120+dy} stroke="rgba(100,178,255,0.12)" strokeWidth="0.5" />)}
          {/* Center node */}
          <circle cx="270" cy="122" r="5.5" fill="rgba(125,55,255,0.25)" stroke="rgba(148,78,255,0.58)" strokeWidth="0.8" />
          <circle cx="270" cy="122" r="2.5" fill="rgba(178,108,255,0.72)">
            <animate attributeName="r" values="2;3.4;2" dur="2.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2.1s" repeatCount="indefinite" />
          </circle>
          {[0,60,120,180,240,300].map(deg => (
            <circle key={deg}
              cx={270 + Math.cos(deg*Math.PI/180)*238}
              cy={122 + Math.sin(deg*Math.PI/180)*47.5}
              r="2" fill="rgba(130,58,255,0.58)" />
          ))}
        </svg>
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-full min-h-screen px-4">
        <JarvisCore />
        <p className="text-[9px] tracking-[0.35em] uppercase mt-1 font-mono"
           style={{ color: 'rgba(128,68,255,0.24)' }}>
          HOW CAN I ASSIST YOU TODAY?
        </p>
      </div>
    </main>
  )
}
