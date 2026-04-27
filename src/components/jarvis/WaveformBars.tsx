'use client'

interface Props {
  active: boolean
}

const DELAYS = ['0ms', '80ms', '160ms', '240ms', '320ms', '240ms', '160ms', '80ms']

export default function WaveformBars({ active }: Props) {
  return (
    <div className="flex items-center justify-center gap-1.5 h-10" aria-hidden>
      {DELAYS.map((delay, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${
            active
              ? 'animate-[waveform_0.8s_ease-in-out_infinite] bg-[#00d4ff]'
              : 'h-1 bg-[#00d4ff]/20'
          }`}
          style={active ? { animationDelay: delay } : undefined}
        />
      ))}
    </div>
  )
}
