'use client'

import JarvisCore from '@/components/jarvis/JarvisCore'

const LEFT_ROWS  = ['NEURAL SYNC', 'CORE TEMP', 'BANDWIDTH', 'ENTROPY', 'COHERENCE']
const RIGHT_ROWS = ['UPTIME', 'MEMORY', 'QUANTUM', 'LATENCY', 'SIGNAL']
const BAR_DELAYS = [0, 0.5, 1.0, 1.5, 2.0]

function DataRow({ label, right, delay }: { label: string; right?: boolean; delay: number }) {
  return (
    <div
      className={`flex items-center gap-2 ${right ? 'flex-row-reverse' : ''}`}
      style={{ fontFamily: 'var(--font-orbitron)', fontSize: 11, letterSpacing: '1.5px', color: 'rgba(100,200,230,0.75)', whiteSpace: 'nowrap' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(0,200,255,0.7)', boxShadow: '0 0 6px rgba(0,200,255,0.6)' }} />
      <span>{label}</span>
      <div className="relative overflow-hidden flex-shrink-0"
           style={{ width: 60, height: 2, background: 'rgba(0,80,120,0.4)' }}>
        <div className="absolute left-0 top-0 h-full"
             style={{ background: 'rgba(0,200,255,0.8)', animation: `bar-scan 3s ease-in-out ${delay}s infinite` }} />
      </div>
    </div>
  )
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top    = pos.startsWith('t')
  const left   = pos.endsWith('l')
  return (
    <div
      className="absolute w-12 h-12 pointer-events-none"
      style={{
        top:    top  ? 20 : undefined,
        bottom: !top ? 20 : undefined,
        left:   left ? 20 : undefined,
        right:  !left? 20 : undefined,
      }}
    >
      <span className="absolute block" style={{
        [top  ? 'top'    : 'bottom']: 0,
        [left ? 'left'   : 'right' ]: 0,
        width: 2, height: '100%',
        background: 'rgba(0,200,255,0.45)',
      }} />
      <span className="absolute block" style={{
        [top  ? 'top'    : 'bottom']: 0,
        [left ? 'left'   : 'right' ]: 0,
        width: '100%', height: 2,
        background: 'rgba(0,200,255,0.45)',
      }} />
    </div>
  )
}

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: '#000000' }}>

      {/* ── JarvisCore: canvas + interactive UI ─────────────────────────── */}
      <JarvisCore />

      {/* ── Decorative overlay (pointer-events:none) ─────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-20">

        {/* Scanlines */}
        <div className="absolute inset-0" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }} />

        {/* Corner brackets */}
        <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

        {/* Title */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <h1 style={{ fontFamily: 'var(--font-orbitron)', fontSize: 13, fontWeight: 700, letterSpacing: 10, color: 'rgba(0,200,255,0.65)', textShadow: '0 0 20px rgba(0,180,255,0.3)' }}>
            J · A · R · V · I · S
          </h1>
        </div>

        {/* Left side panel */}
        <div className="absolute left-7 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-80 hidden xl:flex">
          {LEFT_ROWS.map((lbl, i) => (
            <DataRow key={lbl} label={lbl} delay={BAR_DELAYS[i]} />
          ))}
        </div>

        {/* Right side panel */}
        <div className="absolute right-7 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-80 hidden xl:flex">
          {RIGHT_ROWS.map((lbl, i) => (
            <DataRow key={lbl} label={lbl} right delay={BAR_DELAYS[i]} />
          ))}
        </div>

      </div>

    </main>
  )
}
