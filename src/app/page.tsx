import JarvisCore from '@/components/jarvis/JarvisCore'

function HudPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative px-4 py-3 ${className}`}
      style={{ background: 'rgba(0,10,28,0.82)', border: '1px solid rgba(0,212,255,0.10)' }}
    >
      {/* Corner brackets */}
      <span className="absolute top-0 left-0 block w-3 h-px" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute top-0 left-0 block w-px h-3" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute top-0 right-0 block w-3 h-px" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute top-0 right-0 block w-px h-3" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute bottom-0 left-0 block w-3 h-px" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute bottom-0 left-0 block w-px h-3" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute bottom-0 right-0 block w-3 h-px" style={{ background: 'rgba(0,212,255,0.55)' }} />
      <span className="absolute bottom-0 right-0 block w-px h-3" style={{ background: 'rgba(0,212,255,0.55)' }} />
      {children}
    </div>
  )
}

function HudLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(0,212,255,0.85)' }}>
      {children}
    </p>
  )
}

function HudStat({ value, dim }: { value: string; dim?: boolean }) {
  return (
    <p
      className="text-[9px] tracking-[0.2em] uppercase mb-0.5"
      style={{ color: dim ? 'rgba(0,180,255,0.38)' : 'rgba(0,180,255,0.6)' }}
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
          style={{ height: h * 2, background: `rgba(0,212,255,${0.15 + h * 0.06})` }}
        />
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <main
      className="relative flex flex-col items-center justify-start px-6 py-10 min-h-screen overflow-hidden"
      style={{ background: '#020510' }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Central radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '12%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(60,0,180,0.12) 0%, rgba(0,20,80,0.06) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.25), rgba(0,212,255,0.45), rgba(0,212,255,0.25), transparent)',
          animation: 'scan 8s ease-in-out infinite',
        }}
      />

      {/* Page corner brackets */}
      <div className="absolute top-5 left-5 w-8 h-8 pointer-events-none" style={{ borderTop: '1px solid rgba(0,212,255,0.28)', borderLeft: '1px solid rgba(0,212,255,0.28)' }} />
      <div className="absolute top-5 right-5 w-8 h-8 pointer-events-none" style={{ borderTop: '1px solid rgba(0,212,255,0.28)', borderRight: '1px solid rgba(0,212,255,0.28)' }} />
      <div className="absolute bottom-5 left-5 w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(0,212,255,0.28)', borderLeft: '1px solid rgba(0,212,255,0.28)' }} />
      <div className="absolute bottom-5 right-5 w-8 h-8 pointer-events-none" style={{ borderBottom: '1px solid rgba(0,212,255,0.28)', borderRight: '1px solid rgba(0,212,255,0.28)' }} />

      {/* ── HUD panels (large screens only) ── */}

      {/* Top-left */}
      <div className="absolute top-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HudLabel>JARVIS ONLINE</HudLabel>
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00d4ff', boxShadow: '0 0 5px #00d4ff', animation: 'hud-blink 3s ease-in-out infinite' }}
            />
            <HudStat value="SYSTEM ACTIVE" />
          </div>
          <HudStat value="VOICE ENABLED" dim />
          <MiniWaveform />
        </HudPanel>
      </div>

      {/* Top-right */}
      <div className="absolute top-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right">
          <HudLabel>SYSTEM STATUS</HudLabel>
          <HudStat value="ONLINE" />
          <HudStat value="OPTIMAL" />
          <HudStat value="NEURAL NET" dim />
          <HudStat value="98.7%" />
        </HudPanel>
      </div>

      {/* Bottom-left */}
      <div className="absolute bottom-10 left-10 hidden xl:block z-20">
        <HudPanel>
          <HudLabel>LEARNING</HudLabel>
          <HudStat value="ADAPTIVE MODE" dim />
          <HudStat value="ENGAGED" />
        </HudPanel>
      </div>

      {/* Bottom-right */}
      <div className="absolute bottom-10 right-10 hidden xl:block z-20">
        <HudPanel className="text-right">
          <HudLabel>CONNECTIONS</HudLabel>
          <HudStat value="SECURE" dim />
          <HudStat value="ENCRYPTED" />
        </HudPanel>
      </div>

      {/* ── Main content ── */}
      <div className="relative flex flex-col items-center gap-2 z-10 w-full">

        {/* Title */}
        <div className="flex flex-col items-center gap-1.5 mb-2">
          <div className="flex items-center gap-3">
            <div className="h-px w-8" style={{ background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.4))' }} />
            <span className="text-[9px] tracking-[0.4em] uppercase" style={{ color: 'rgba(0,212,255,0.35)' }}>SYSTEM</span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(to left, transparent, rgba(0,212,255,0.4))' }} />
          </div>
          <h1
            className="text-4xl font-extralight tracking-[0.5em] uppercase select-none text-white"
            style={{ textShadow: '0 0 20px rgba(0,212,255,0.55), 0 0 50px rgba(80,20,200,0.35)' }}
          >
            J.A.R.V.I.S
          </h1>
          <p className="text-[9px] tracking-[0.35em] uppercase" style={{ color: 'rgba(0,180,255,0.35)' }}>
            Just A Rather Very Intelligent System
          </p>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.35))' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
            <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(0,212,255,0.35))' }} />
          </div>
        </div>

        <JarvisCore />

        {/* Bottom HUD prompt */}
        <p
          className="text-[9px] tracking-[0.35em] uppercase mt-1"
          style={{ color: 'rgba(0,180,255,0.2)' }}
        >
          HOW CAN I ASSIST YOU TODAY?
        </p>
      </div>
    </main>
  )
}
