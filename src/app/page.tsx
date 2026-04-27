import JarvisCore from '@/components/jarvis/JarvisCore'

export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center justify-start px-6 py-16 gap-12 min-h-screen bg-[#050a14]">
      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-extralight tracking-[0.4em] text-white/90 uppercase select-none">
          J.A.R.V.I.S
        </h1>
        <p className="text-xs tracking-[0.25em] text-[#6b9dc2] uppercase">
          Just A Rather Very Intelligent System
        </p>
      </div>

      {/* Core assistant */}
      <JarvisCore />
    </main>
  )
}
