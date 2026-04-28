'use client'

import { useRef, useCallback } from 'react'
import JarvisCore from '@/components/jarvis/JarvisCore'

function HudPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative px-4 py-3 ${className}`}
      style={{ background: 'rgba(8,0,22,0.82)', border: '1px solid rgba(120,60,255,0.12)' }}
    >
      <span className="absolute top-0 left-0 block w-3 h-px"  style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute top-0 left-0 block w-px h-3"  style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute top-0 right-0 block w-3 h-px" style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute top-0 right-0 block w-px h-3" style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute bottom-0 left-0 block w-3 h-px"  style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute bottom-0 left-0 block w-px h-3"  style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute bottom-0 right-0 block w-3 h-px" style={{ background: 'rgba(140,70,255,0.60)' }} />
      <span className="absolute bottom-0 right-0 block w-px h-3" style={{ background: 'rgba(140,70,255,0.60)' }} />
      {children}
    </div>
  )
}

function HudLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(160,100,255,0.88)' }}>
      {children}
    </p>
  )
}

function HudStat({ value, dim }: { value: string; dim?: boolean }) {
  return (
    <p
      className="text-[9px] tracking-[0.2em] uppercase mb-0.5"
      style={{ color: dim ? 'rgba(140,90,230,0.38)' : 'rgba(160,110,240,0.62)' }}
    >
      {value}
    </p>
  )
}

function MiniWaveform() {
  const heights = [2, 3, 5, 3, 4, 2, 5, 4, 3, 2, 4, 3]
  return (
    <div className="flex items-end gap-0.5 mt-2" style={{ height: 12 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full"
          style={{ height: h * 2, background: `rgba(140,70,255,${0.14 + h * 0.07})` }}
        />
      ))}
    </div>
  )
}

// Deterministic "random" so server/client renders match (avoids hydration errors)
function seededSeq(n: number): number[] {
  const out: number[] = []
  let s = 0.6180339887
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    out.push(s / 233280)
  }
  return out
}
const RACK_SEED_L = seededSeq(5)
const RACK_SEED_R = seededSeq(6)

export default function Home() {
  const bgDeepRef    = useRef<HTMLDivElement>(null)
  const bgMidRef     = useRef<HTMLDivElement>(null)
  const platformRef  = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth  - 0.5) * 2
    const y = (e.clientY / window.innerHeight - 0.5) * 2
    if (bgDeepRef.current)   bgDeepRef.current.style.transform   = `translate(${x * -9}px, ${y * -9}px)`
    if (bgMidRef.current)    bgMidRef.current.style.transform    = `translate(${x * -20}px, ${y * -20}px)`
    if (platformRef.current) platformRef.current.style.transform = `translateX(-50%) translate(${x * 7}px, ${y * 3}px)`
  }, [])

  return (
    <main
      className="relative flex flex-col items-center justify-start px-6 py-10 min-h-screen overflow-hidden"
      style={{ background: '#080012' }}
      onMouseMove={handleMouseMove}
    >

      {/* ── Deep parallax layer: server rack silhouettes ── */}
      <div
        ref={bgDeepRef}
        className="absolute inset-0 pointer-events-none"
        style={{ willChange: 'transform', transition: 'transform 0.12s ease-out' }}
      >
        {/* Left rack column */}
        <div
          className="absolute left-0 top-0 bottom-0 w-28"
          style={{ background: 'linear-gradient(to right, rgba(35,0,70,0.55), transparent)' }}
        >
          {Array.from({ length: 28 }, (_, i) => (
            <div
              key={i}
              className="absolute left-3 right-0"
              style={{
                top: `${3 + i * 3.4}%`,
                height: 1,
                background: `rgba(90,30,180,${i % 4 === 0 ? 0.14 : 0.05})`,
              }}
            />
          ))}
          {RACK_SEED_L.map((rng, idx) => (
            <div
              key={idx}
              className="absolute right-5"
              style={{
                top: `${10 + idx * 17 + rng * 5}%`,
                width: 3, height: 3, borderRadius: '50%',
                background: '#8b35ff',
                boxShadow: '0 0 6px #8b35ff',
                animation: `hud-blink ${3.2 + rng * 1.8}s ease-in-out infinite`,
                animationDelay: `${rng * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Right rack column */}
        <div
          className="absolute right-0 top-0 bottom-0 w-28"
          style={{ background: 'linear-gradient(to left, rgba(35,0,70,0.55), transparent)' }}
        >
          {Array.from({ length: 28 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-3"
              style={{
                top: `${3 + i * 3.4}%`,
                height: 1,
                background: `rgba(90,30,180,${i % 4 === 0 ? 0.14 : 0.05})`,
              }}
            />
          ))}
          {RACK_SEED_R.map((rng, idx) => (
            <div
              key={idx}
              className="absolute left-5"
              style={{
                top: `${6 + idx * 15 + rng * 4}%`,
                width: 3, height: 3, borderRadius: '50%',
                background: '#c77dff',
                boxShadow: '0 0 6px #c77dff',
                animation: `hud-blink ${2.8 + rng * 2.2}s ease-in-out infinite`,
                animationDelay: `${rng * 1.5}s`,
              }}
            />
          ))}
        </div>

        {/* Ceiling horizontal beams */}
        {[6, 13, 20].map((pct) => (
          <div
            key={pct}
            className="absolute left-20 right-20"
            style={{
              top: `${pct}%`,
              height: 1,
              background: `rgba(80,20,160,${0.15 - pct * 0.004})`,
            }}
          />
        ))}
      </div>

      {/* ── Mid parallax layer: perspective floor grid ── */}
      <div
        ref={bgMidRef}
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '46%', willChange: 'transform', transition: 'transform 0.12s ease-out' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: 'perspective(480px) rotateX(62deg)',
            transformOrigin: 'bottom center',
            backgroundImage: `
              linear-gradient(rgba(110,35,230,0.20) 1px, transparent 1px),
              linear-gradient(90deg, rgba(110,35,230,0.20) 1px, transparent 1px)
            `,
            backgroundSize: '58px 58px',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Subtle background dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(100,40,200,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Central radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '6%', left: '50%', transform: 'translateX(-50%)',
          width: 820, height: 820,
          background: 'radial-gradient(circle, rgba(80,0,200,0.18) 0%, rgba(40,0,110,0.08) 35%, transparent 65%)',
          borderRadius: '50%',
        }}
      />

      {/* Scan line (purple) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(120,55,255,0.20), rgba(160,80,255,0.40), rgba(120,55,255,0.20), transparent)',
          animation: 'scan 10s ease-in-out infinite',
        }}
      />

      {/* Page corner brackets */}
      <div className="absolute top-5 left-5 w-8 h-8 pointer-events-none"   style={{ borderTop:    '1px solid rgba(130,65,255,0.32)', borderLeft:   '1px solid rgba(130,65,255,0.32)' }} />
      <div className="absolute top-5 right-5 w-8 h-8 pointer-events-none"  style={{ borderTop:    '1px solid rgba(130,65,255,0.32)', borderRight:  '1px solid rgba(130,65,255,0.32)' }} />
      <div className="absolute bottom-5 left-5 w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(130,65,255,0.32)', borderLeft:   '1px solid rgba(130,65,255,0.32)' }} />
      <div className="absolute bottom-5 right-5 w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(130,65,255,0.32)', borderRight:  '1px solid rgba(130,65,255,0.32)' }} />

      {/* ── HUD panels (xl only) ── */}
      <div className="absolute top-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HudLabel>JARVIS ONLINE</HudLabel>
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#9d4edd', boxShadow: '0 0 5px #9d4edd', animation: 'hud-blink 3s ease-in-out infinite' }}
            />
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

      {/* ── Hexagonal platform (positioned below orb) ── */}
      <div
        ref={platformRef}
        className="absolute pointer-events-none z-5"
        style={{ bottom: '14%', left: '50%', transform: 'translateX(-50%)' }}
      >
        <svg width="360" height="130" viewBox="0 0 360 130">
          {/* Outer ellipses */}
          <ellipse cx="180" cy="90" rx="158" ry="32" fill="none" stroke="rgba(120,55,255,0.22)" strokeWidth="1" />
          <ellipse cx="180" cy="90" rx="122" ry="24" fill="none" stroke="rgba(120,55,255,0.14)" strokeWidth="1" />
          <ellipse cx="180" cy="90" rx="86"  ry="16" fill="none" stroke="rgba(120,55,255,0.10)" strokeWidth="0.5" />
          {/* Radial spokes */}
          {[0,60,120,180,240,300].map(deg => (
            <line
              key={deg}
              x1="180" y1="90"
              x2={180 + Math.cos(deg * Math.PI / 180) * 152}
              y2={90  + Math.sin(deg * Math.PI / 180) * 31}
              stroke="rgba(100,40,200,0.10)"
              strokeWidth="0.5"
            />
          ))}
          {/* Glowing floor panels */}
          <rect x="82"  y="83" width="58" height="11" rx="2"
            fill="rgba(90,30,200,0.10)" stroke="rgba(120,55,255,0.38)" strokeWidth="0.5">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" />
          </rect>
          <rect x="220" y="83" width="58" height="11" rx="2"
            fill="rgba(90,30,200,0.10)" stroke="rgba(120,55,255,0.38)" strokeWidth="0.5">
            <animate attributeName="opacity" values="1;0.6;1" dur="2.8s" repeatCount="indefinite" />
          </rect>
          {/* Center node */}
          <circle cx="180" cy="90" r="5" fill="rgba(150,80,255,0.28)" stroke="rgba(160,90,255,0.55)" strokeWidth="0.5" />
          <circle cx="180" cy="90" r="2.5" fill="rgba(180,110,255,0.65)">
            <animate attributeName="r" values="2;3;2" dur="1.8s" repeatCount="indefinite" />
          </circle>
          {/* Accent dots on outer ellipse */}
          {[30, 90, 150, 210, 270, 330].map(deg => (
            <circle
              key={deg}
              cx={180 + Math.cos(deg * Math.PI / 180) * 158}
              cy={90  + Math.sin(deg * Math.PI / 180) * 32}
              r="1.5"
              fill="rgba(160,90,255,0.5)"
            />
          ))}
        </svg>
      </div>

      {/* ── Main content ── */}
      <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-full min-h-screen">
        <JarvisCore />
        <p
          className="text-[9px] tracking-[0.35em] uppercase mt-1"
          style={{ color: 'rgba(140,80,255,0.22)' }}
        >
          HOW CAN I ASSIST YOU TODAY?
        </p>
      </div>
    </main>
  )
}
