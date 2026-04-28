'use client'

interface Props {
  active: boolean
}

const DELAYS = ['0ms', '70ms', '140ms', '210ms', '280ms', '350ms', '280ms', '210ms', '140ms', '70ms']

export default function WaveformBars({ active }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 h-12" aria-hidden>
      {DELAYS.map((delay, i) => (
        <span
          key={i}
          className="w-1 rounded-full transition-all duration-300"
          style={
            active
              ? {
                  height: 4,
                  animation: `waveform 0.6s ease-in-out infinite`,
                  animationDelay: delay,
                  background: `linear-gradient(to top, #7b2fff, #c77dff)`,
                  boxShadow: '0 0 6px rgba(160,80,255,0.65)',
                }
              : {
                  height: 4,
                  background: 'rgba(120,55,200,0.20)',
                }
          }
        />
      ))}
    </div>
  )
}
