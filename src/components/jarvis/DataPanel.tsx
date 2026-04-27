'use client'

import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Clock, CheckSquare, BarChart3 } from 'lucide-react'
import type { TimeAgentData, WeatherAgentData, ReportAgentData, TaskAgentData } from '@/lib/assistant/types'

interface Props {
  agentName: string | null
  data: unknown
  visible: boolean
}

function WeatherIcon({ code }: { code: number }) {
  if (code === 0 || code === 1) return <Sun className="w-10 h-10 text-amber-400" />
  if (code >= 61 && code <= 67) return <CloudRain className="w-10 h-10 text-cyan-400" />
  if (code >= 71 && code <= 77) return <CloudSnow className="w-10 h-10 text-sky-300" />
  if (code >= 95) return <CloudLightning className="w-10 h-10 text-yellow-400" />
  return <Cloud className="w-10 h-10" style={{ color: '#a0d8f0' }} />
}

function TimeCard({ data }: { data: TimeAgentData }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Clock className="w-5 h-5 mb-1" style={{ color: '#00d4ff' }} />
      <span className="text-4xl font-extralight tracking-widest text-white">{data.time}</span>
      <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: 'rgba(0,180,255,0.55)' }}>{data.date}</span>
    </div>
  )
}

function WeatherCard({ data }: { data: WeatherAgentData }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <WeatherIcon code={data.weathercode} />
      <span className="text-4xl font-extralight text-white">{data.temp}°F</span>
      <span className="text-sm capitalize" style={{ color: 'rgba(0,180,255,0.55)' }}>{data.condition}</span>
      <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(0,150,200,0.45)' }}>
        <Wind className="w-3 h-3" />
        <span>{data.windspeed} mph</span>
      </div>
    </div>
  )
}

function ReportCard({ data }: { data: ReportAgentData }) {
  if (!data.metrics.length) {
    return (
      <div className="flex flex-col items-center gap-2">
        <BarChart3 className="w-6 h-6" style={{ color: '#00d4ff' }} />
        <span className="text-sm" style={{ color: 'rgba(0,180,255,0.5)' }}>No metrics for today</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <BarChart3 className="w-5 h-5" style={{ color: '#00d4ff' }} />
      <div className="grid grid-cols-2 gap-2 w-full">
        {data.metrics.map((m) => (
          <div
            key={m.id}
            className="flex flex-col items-center rounded-xl px-3 py-2"
            style={{ background: 'rgba(0,40,80,0.5)', border: '1px solid rgba(0,212,255,0.15)' }}
          >
            <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(0,180,255,0.5)' }}>{m.label}</span>
            <span className="text-lg font-semibold text-white">
              {m.unit === 'USD'
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(m.value)
                : m.value}
            </span>
            {m.unit && m.unit !== 'USD' && (
              <span className="text-[9px]" style={{ color: 'rgba(0,150,200,0.4)' }}>{m.unit}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({ data }: { data: TaskAgentData }) {
  if (data.action === 'add') {
    return (
      <div className="flex flex-col items-center gap-2">
        <CheckSquare className="w-6 h-6 text-emerald-400" />
        <span className="text-[10px] tracking-widest uppercase text-emerald-400">Task added</span>
        <span className="text-base text-white text-center">{data.added}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <div className="flex items-center gap-2 self-center mb-1">
        <CheckSquare className="w-4 h-4" style={{ color: '#00d4ff' }} />
        <span className="text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(0,180,255,0.55)' }}>
          {data.total === 0 ? 'No pending tasks' : `${data.total} pending`}
        </span>
      </div>
      {data.tasks.slice(0, 5).map((t) => (
        <div key={t.id} className="flex items-start gap-2 text-sm w-full">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00d4ff' }} />
          <span className="truncate" style={{ color: 'rgba(180,220,255,0.75)' }}>{t.title}</span>
        </div>
      ))}
      {data.total > 5 && (
        <span className="text-xs self-center" style={{ color: 'rgba(0,150,200,0.4)' }}>+{data.total - 5} more</span>
      )}
    </div>
  )
}

export default function DataPanel({ agentName, data, visible }: Props) {
  if (!agentName || !data) return null

  return (
    <div
      className={`w-72 rounded-2xl px-6 py-5 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      style={{
        background: 'rgba(0, 10, 30, 0.80)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,212,255,0.18)',
        boxShadow: '0 0 30px rgba(0,100,200,0.12), inset 0 1px 0 rgba(0,212,255,0.08)',
      }}
    >
      {agentName === 'Time'    && <TimeCard    data={data as TimeAgentData} />}
      {agentName === 'Weather' && <WeatherCard data={data as WeatherAgentData} />}
      {agentName === 'Report'  && <ReportCard  data={data as ReportAgentData} />}
      {agentName === 'Tasks'   && <TaskCard    data={data as TaskAgentData} />}
    </div>
  )
}
