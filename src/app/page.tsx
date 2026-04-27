import JarvisCore from '@/components/jarvis/JarvisCore'

export default function Home() {
  return (
    <main
      className="relative flex flex-col flex-1 items-center justify-start px-6 py-14 gap-10 min-h-screen overflow-hidden"
      style={{ background: '#060010' }}
    >
      {/* Cyber grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(123,47,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(123,47,255,0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Central radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(91,20,150,0.18) 0%, rgba(26,0,53,0.10) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Animated scan line */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.4), rgba(199,125,255,0.6), rgba(157,78,221,0.4), transparent)',
          animation: 'scan 8s ease-in-out infinite',
        }}
      />

      {/* Title */}
      <div className="relative flex flex-col items-center gap-2 z-10">
        <h1
          className="text-3xl font-extralight tracking-[0.5em] uppercase select-none text-white"
          style={{ textShadow: '0 0 20px rgba(199,125,255,0.7), 0 0 40px rgba(123,47,255,0.4)' }}
        >
          J.A.R.V.I.S
        </h1>
        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{ color: 'rgba(157,78,221,0.6)' }}
        >
          Just A Rather Very Intelligent System
        </p>
        {/* Decorative line */}
        <div className="flex items-center gap-3 mt-1">
          <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(157,78,221,0.5))' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#9d4edd', boxShadow: '0 0 8px #9d4edd' }} />
          <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(157,78,221,0.5))' }} />
        </div>
      </div>

      {/* Core assistant */}
      <JarvisCore />
    </main>
  )
}
