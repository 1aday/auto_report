"use client"

import React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { usePathname } from "next/navigation"
import { isCurrentWeek as checkIsCurrentWeek } from "@/lib/week-progress"

type Row = {
  week_start: string
  session_source: string
  sessions: number
  first_visit: number
  demo_submit: number
  vf_signup: number
  first_visit_wow_pct: number | null
  demo_submit_wow_pct: number | null
  vf_signup_wow_pct: number | null
  first_visit_wo4w_pct: number | null
  demo_submit_wo4w_pct: number | null
  vf_signup_wo4w_pct: number | null
  first_visit_wo12w_pct: number | null
  demo_submit_wo12w_pct: number | null
  vf_signup_wo12w_pct: number | null
}

const pctText = (v: number | null, digits: number = 1) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`)

const Heat = ({ value, precision = 1 }: { value: number | null, precision?: number }) => {
  if (value === null || value === undefined) return <span>—</span>
  const abs = Math.abs(value)
  const bg = value > 0
    ? abs > 20 ? "rgba(16,185,129,0.65)" : abs > 10 ? "rgba(16,185,129,0.55)" : abs > 5 ? "rgba(16,185,129,0.45)" : "rgba(16,185,129,0.35)"
    : abs > 20 ? "rgba(244,63,94,0.65)" : abs > 10 ? "rgba(244,63,94,0.55)" : abs > 5 ? "rgba(244,63,94,0.45)" : "rgba(244,63,94,0.35)"
  return (
    <span className="text-white px-2 py-0.5 rounded tabular-nums" style={{ backgroundColor: bg }}>
      {pctText(value, precision)}
    </span>
  )
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)

export default function SourcesReport() {
  const pathname = usePathname()
  const isMonthly = pathname?.includes('/sources-monthly')
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ["source-changes-pct", isMonthly ? 'monthly' : 'weekly'],
    queryFn: async () => {
      if (isMonthly) {
        const { data, error } = await supabase
          .from("ga4_monthly_source_changes_pct")
          .select(`
            month_start,
            session_source,
            sessions,
            first_visit, demo_submit, vf_signup,
            first_visit_mom_pct, demo_submit_mom_pct, vf_signup_mom_pct,
            first_visit_mo3m_pct, demo_submit_mo3m_pct, vf_signup_mo3m_pct,
            first_visit_mo12m_pct, demo_submit_mo12m_pct, vf_signup_mo12m_pct
          `)
          .order("month_start", { ascending: false })

        if (error) throw error
        // Map to weekly-shaped Row for reuse
        const mapped = (data || []).map((r: any) => ({
          week_start: r.month_start,
          session_source: r.session_source,
          sessions: r.sessions,
          first_visit: r.first_visit,
          demo_submit: r.demo_submit,
          vf_signup: r.vf_signup,
          first_visit_wow_pct: r.first_visit_mom_pct,
          demo_submit_wow_pct: r.demo_submit_mom_pct,
          vf_signup_wow_pct: r.vf_signup_mom_pct,
          first_visit_wo4w_pct: r.first_visit_mo3m_pct,
          demo_submit_wo4w_pct: r.demo_submit_mo3m_pct,
          vf_signup_wo4w_pct: r.vf_signup_mo3m_pct,
          first_visit_wo12w_pct: r.first_visit_mo12m_pct,
          demo_submit_wo12w_pct: r.demo_submit_mo12m_pct,
          vf_signup_wo12w_pct: r.vf_signup_mo12m_pct,
        })) as Row[]
        return mapped
      } else {
        const { data, error } = await supabase
          .from("ga4_weekly_source_changes_pct")
          .select(`
            week_start,
            session_source,
            sessions,
            first_visit, demo_submit, vf_signup,
            first_visit_wow_pct, demo_submit_wow_pct, vf_signup_wow_pct,
            first_visit_wo4w_pct, demo_submit_wo4w_pct, vf_signup_wo4w_pct,
            first_visit_wo12w_pct, demo_submit_wo12w_pct, vf_signup_wo12w_pct
          `)
          .order("week_start", { ascending: false })

        if (error) throw error
        return data as Row[]
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  // Sorting state
  const [sortKey, setSortKey] = React.useState<keyof Row>('session_source')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

  const applySort = (rows: Row[]) => {
    const sorted = [...rows].sort((a,b) => {
      const va = a[sortKey] as number | string | null
      const vb = b[sortKey] as number | string | null
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return sorted
  }

  // Filters and chart
  const [selectedEvent, setSelectedEvent] = React.useState<'first_visit' | 'demo_submit' | 'vf_signup'>('first_visit')
  const [selectedSources, setSelectedSources] = React.useState<string[]>([])
  const [sourcesFilterText, setSourcesFilterText] = React.useState("")
  const [showAdmin, setShowAdmin] = React.useState(false)
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const [hoverIndexConv, setHoverIndexConv] = React.useState<number | null>(null)
  const [referenceMode, setReferenceMode] = React.useState<'current' | 'lastFinished' | 'allTime'>('current')
  const [quickFilter, setQuickFilter] = React.useState<string>('all')

  // Ignore rules admin data
  type Rule = { id: number; pattern: string; is_glob: boolean; is_regex: boolean; notes: string | null }
  const { data: rules, refetch: refetchRules, isFetching: rulesLoading } = useQuery({
    queryKey: ['ignore-rules'],
    queryFn: async () => {
      const res = await fetch('/api/ignore-sources', { cache: 'no-store' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load rules')
      return json.data as Rule[]
    }
  })
  const [newPattern, setNewPattern] = React.useState("")
  const [newType, setNewType] = React.useState<'literal'|'glob'|'regex'>("literal")
  const [newNotes, setNewNotes] = React.useState("")

  const addRule = async () => {
    if (!newPattern.trim()) return
    const payload = {
      pattern: newPattern.trim(),
      is_glob: newType === 'glob',
      is_regex: newType === 'regex',
      notes: newNotes.trim()
    }
    await fetch('/api/ignore-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setNewPattern("")
    setNewNotes("")
    setNewType('literal')
    await refetchRules()
  }

  const deleteRule = async (id: number) => {
    await fetch(`/api/ignore-sources?id=${id}`, { method: 'DELETE' })
    await refetchRules()
  }

  const refreshTop40 = async () => {
    await fetch('/api/refresh-top40', { method: 'POST' })
    // Refetch supabase data after refresh
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["weekly-source-changes-pct"] }),
      queryClient.invalidateQueries({ queryKey: ['source-series'] })
    ])
  }

  

  // Note: avoid early returns to keep Hook order stable

  // Build a single table with Week as the first column; visually group by week
  const weeks = React.useMemo(() => Array.from(new Set((data || []).map(r => r.week_start))).sort((a,b) => (a < b ? 1 : -1)), [data])
  const selectedSourcesSig = React.useMemo(() => [...selectedSources].sort().join('|'), [selectedSources])
  const rowsByWeek = React.useMemo(() => {
    const map: Record<string, Row[]> = {}
    for (const w of weeks) {
      let rows = (data || []).filter(r => r.week_start === w)
      if (selectedSources.length > 0) {
        const selectedSet = new Set(selectedSources)
        rows = rows.filter(r => selectedSet.has(r.session_source))
      }
      map[w] = rows
    }
    return map
  }, [data, weeks, selectedSourcesSig])

  // Aggregate totals by week across current filter
  const aggregatesByWeek: Record<string, { sessions: number; demo_submit: number; vf_signup: number }> = {}
  for (const w of weeks) {
    const rows = rowsByWeek[w] || []
    aggregatesByWeek[w] = rows.reduce((acc, r) => {
      acc.sessions += r.sessions || 0
      acc.demo_submit += r.demo_submit || 0
      acc.vf_signup += r.vf_signup || 0
      return acc
    }, { sessions: 0, demo_submit: 0, vf_signup: 0 })
  }

  // Determine reference week based on user selection
  const referenceWeek = React.useMemo(() => {
    if (weeks.length === 0) return null
    if (referenceMode === 'allTime') return null
    if (referenceMode === 'current') return weeks[0]
    const first = weeks[0]
    const isCurr = isMonthly
      ? (() => { const d = new Date(first); const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() })()
      : checkIsCurrentWeek(first)
    if (isCurr && weeks.length > 1) return weeks[1]
    return first
  }, [weeks, referenceMode])

  const refIdx = referenceWeek ? weeks.indexOf(referenceWeek) : -1
  const latest = referenceWeek
  const prev1 = refIdx >= 0 && refIdx + 1 < weeks.length ? weeks[refIdx + 1] : undefined
  const prev4Slice = refIdx >= 0 ? weeks.slice(refIdx + 1, refIdx + 5) : []
  const prev12Slice = refIdx >= 0 ? weeks.slice(refIdx + 1, refIdx + 13) : []
  const pct = (cur: number, base: number) => (base > 0 ? ((cur - base) / base) * 100 : null)

  const makeSummary = (key: 'sessions' | 'demo_submit' | 'vf_signup') => {
    if (referenceMode === 'allTime') {
      const current = weeks.reduce((sum, w) => sum + (aggregatesByWeek[w]?.[key] || 0), 0)
      return {
        current,
        last: 0,
        avg4: 0,
        avg12: 0,
        wow: null,
        w4: null,
        w12: null,
        diffWow: 0,
        diff4: 0,
        diff12: 0,
      }
    }
    const current = latest ? aggregatesByWeek[latest]?.[key] || 0 : 0
    const last = prev1 ? aggregatesByWeek[prev1]?.[key] || 0 : 0
    const avg4 = prev4Slice.length ? prev4Slice.reduce((s, w) => s + (aggregatesByWeek[w]?.[key] || 0), 0) / prev4Slice.length : 0
    const avg12 = prev12Slice.length ? prev12Slice.reduce((s, w) => s + (aggregatesByWeek[w]?.[key] || 0), 0) / prev12Slice.length : 0
    return {
      current,
      last,
      avg4,
      avg12,
      wow: pct(current, last),
      w4: pct(current, avg4),
      w12: pct(current, avg12),
      diffWow: current - last,
      diff4: current - avg4,
      diff12: current - avg12,
    }
  }

  const sessionsSummary = makeSummary('sessions')
  const signupsSummary = makeSummary('vf_signup')
  const demosSummary = makeSummary('demo_submit')

  // Conversion summaries (selected event / sessions)
  type ConvSummary = { currentPct: number | null; wow: number | null; w4: number | null; w12: number | null }
  const makeConvSummary = (eventKey: 'vf_signup' | 'demo_submit'): ConvSummary => {
    if (referenceMode === 'allTime') {
      // total conversion across all weeks
      const totalEvent = weeks.reduce((s,w) => s + (aggregatesByWeek[w]?.[eventKey] || 0), 0)
      const totalSess = weeks.reduce((s,w) => s + (aggregatesByWeek[w]?.sessions || 0), 0)
      const cur = totalSess > 0 ? (totalEvent / totalSess) * 100 : null
      return { currentPct: cur, wow: null, w4: null, w12: null }
    }
    const curEvent = latest ? (aggregatesByWeek[latest]?.[eventKey] || 0) : 0
    const curSess = latest ? (aggregatesByWeek[latest]?.sessions || 0) : 0
    const curPct = curSess > 0 ? (curEvent / curSess) * 100 : null

    const prevEvent = prev1 ? (aggregatesByWeek[prev1]?.[eventKey] || 0) : 0
    const prevSess = prev1 ? (aggregatesByWeek[prev1]?.sessions || 0) : 0
    const prevPct = prevSess > 0 ? (prevEvent / prevSess) * 100 : null
    const wow = curPct !== null && prevPct !== null && prevPct > 0 ? ((curPct - prevPct) / prevPct) * 100 : null

    const sum4Event = prev4Slice.reduce((s,w) => s + (aggregatesByWeek[w]?.[eventKey] || 0), 0)
    const sum4Sess = prev4Slice.reduce((s,w) => s + (aggregatesByWeek[w]?.sessions || 0), 0)
    const avg4Pct = sum4Sess > 0 ? (sum4Event / sum4Sess) * 100 : null
    const w4 = curPct !== null && avg4Pct !== null && avg4Pct > 0 ? ((curPct - avg4Pct) / avg4Pct) * 100 : null

    const sum12Event = prev12Slice.reduce((s,w) => s + (aggregatesByWeek[w]?.[eventKey] || 0), 0)
    const sum12Sess = prev12Slice.reduce((s,w) => s + (aggregatesByWeek[w]?.sessions || 0), 0)
    const avg12Pct = sum12Sess > 0 ? (sum12Event / sum12Sess) * 100 : null
    const w12 = curPct !== null && avg12Pct !== null && avg12Pct > 0 ? ((curPct - avg12Pct) / avg12Pct) * 100 : null

    return { currentPct: curPct, wow, w4, w12 }
  }

  const selectedConvSummary: ConvSummary | null = React.useMemo(() => {
    if (selectedEvent === 'vf_signup') return makeConvSummary('vf_signup')
    if (selectedEvent === 'demo_submit') return makeConvSummary('demo_submit')
    return null
  }, [selectedEvent, weeks.join(','), referenceMode])

  const colorGradients: Record<string, string> = {
    Sessions: 'from-teal-500/15 to-teal-500/5',
    Signups: 'from-violet-500/15 to-violet-500/5',
    Demos: 'from-amber-500/15 to-amber-500/5',
  }

  const SummaryCard = ({ title, summary }: { title: 'Sessions' | 'Signups' | 'Demos'; summary: { current: number; last: number; avg4: number; avg12: number; wow: number | null; w4: number | null; w12: number | null; diffWow: number; diff4: number; diff12: number } }) => (
    <Card className={`bg-gradient-to-br ${colorGradients[title]} border-border/40`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground/90">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold tabular-nums">{formatNumber(summary.current)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">Prev wk: <span className="text-foreground font-medium">{summary.wow === null ? '—' : formatNumber(summary.last)}</span></div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">WoW</span>
              <Heat value={summary.wow} />
            </div>
            <span className="text-muted-foreground">{summary.wow === null ? '—' : `${summary.diffWow >= 0 ? '+' : ''}${formatNumber(Math.round(summary.diffWow))}`}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">4W avg</span>
              <Heat value={summary.w4} />
            </div>
            <span className="text-muted-foreground">{summary.w4 === null ? '—' : `${summary.diff4 >= 0 ? '+' : ''}${formatNumber(Math.round(summary.diff4))}`}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">12W avg</span>
              <Heat value={summary.w12} />
            </div>
            <span className="text-muted-foreground">{summary.w12 === null ? '—' : `${summary.diff12 >= 0 ? '+' : ''}${formatNumber(Math.round(summary.diff12))}`}</span>
          </div>
        </div>
        {selectedConvSummary && title !== 'Sessions' && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-[11px] text-muted-foreground mb-1">Conv % ({title.toLowerCase()})</div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="text-center">
                <div className="text-muted-foreground">WoW</div>
                <Heat value={selectedConvSummary.wow} precision={2} />
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">4W</div>
                <Heat value={selectedConvSummary.w4} precision={2} />
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">12W</div>
                <Heat value={selectedConvSummary.w12} precision={2} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Aggregate series across filtered sources for selected event
  const series = React.useMemo(() => {
    const ascWeeks = [...weeks].sort((a,b) => (a > b ? 1 : -1))
    return ascWeeks.map(week => {
      const rows = rowsByWeek[week] || []
      const count = rows.reduce((sum, r) => sum + (selectedEvent === 'first_visit' ? r.first_visit : selectedEvent === 'demo_submit' ? r.demo_submit : r.vf_signup), 0)
      return { week_start: week, count }
    })
  }, [weeks.join(','), selectedEvent, selectedSourcesSig])

  const maxCount = Math.max(1, ...series.map(s => s.count))

  const Chart = () => {
    const chartHeight = 110
    const margin = { top: 12, right: 12, bottom: 28, left: 38 }
    const barWidth = 12
    const gap = 6
    const innerWidth = Math.max(100, series.length * (barWidth + gap) - gap)
    const totalWidth = margin.left + innerWidth + margin.right
    const totalHeight = margin.top + chartHeight + margin.bottom

    // Lock volume chart color to emerald for consistency
    const col = { base: '#10b981', light: 'rgba(16,185,129,0.3)' }

    // simple y ticks
    // Dynamic Y-scale for small values (volume chart)
    const maxVal = Math.max(0.0001, ...series.map(s => s.count))
    const niceMax = (v: number) => {
      const pow10 = Math.pow(10, Math.floor(Math.log10(v)))
      const n = v / pow10
      const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
      return nice * pow10
    }
    const yMax = Math.max(1, niceMax(maxVal))
    const ticks = [0, 0.25 * yMax, 0.5 * yMax, 0.75 * yMax, yMax]

    // helper: ISO week number
    const getISOWeek = (date: Date) => {
      const d = new Date(date)
      d.setHours(0,0,0,0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }

    const eventLabel = selectedEvent === 'first_visit' ? 'First visits' : selectedEvent === 'demo_submit' ? 'Demos' : 'Signups'
    return (
      <div className="w-full bg-card rounded border border-border/20">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Weekly Volume</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.base }} />
              <span>{eventLabel}</span>
            </div>
          </div>
        </div>
        <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full h-[180px]">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={col.base} stopOpacity={0.95} />
              <stop offset="100%" stopColor={col.base} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          {/* grid */}
          {ticks.map((t, idx) => {
            const y = margin.top + chartHeight * (1 - (t / yMax))
            return (
              <g key={idx}>
                <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="currentColor" opacity={0.08} />
                <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.4}>{Math.round(t).toLocaleString()}</text>
              </g>
            )
          })}

          {/* x-axis */}
          <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + innerWidth} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />
          {/* y-axis */}
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />

          {/* bars */}
          {series.map((s, i) => {
            const value = s.count
            const h = Math.max(2, (value / yMax) * chartHeight)
            const x = margin.left + i * (barWidth + gap)
            const y = margin.top + (chartHeight - h)
            const isHover = hoverIndex === i
            return (
              <g key={s.week_start} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                <rect x={x} y={y} width={barWidth} height={h} rx={3} fill={isHover ? col.base : 'url(#barGrad)'} opacity={isHover ? 1 : 0.95} />
                {/* label on hover */}
                {isHover && (
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.85}>
                    {value.toLocaleString()}
                  </text>
                )}
                {/* x tick label every 2 bars */}
                {i % 2 === 0 && (
                  <text x={x + barWidth / 2} y={margin.top + chartHeight + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
                    {(() => { const d = new Date(s.week_start); const w = getISOWeek(d); return `W${String(w).padStart(2,'0')}` })()}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // Conversion series: selected event divided by sessions (as %)
  const seriesConv = React.useMemo(() => {
    const ascWeeks = [...weeks].sort((a,b) => (a > b ? 1 : -1))
    return ascWeeks.map(week => {
      const rows = rowsByWeek[week] || []
      const eventSum = rows.reduce((sum, r) => sum + (selectedEvent === 'first_visit' ? r.first_visit : selectedEvent === 'demo_submit' ? r.demo_submit : r.vf_signup), 0)
      const sess = aggregatesByWeek[week]?.sessions || 0
      const pct = sess > 0 ? (eventSum / sess) * 100 : 0
      return { week_start: week, pct }
    })
  }, [weeks.join(','), selectedEvent, selectedSourcesSig])

  const ConversionChart = () => {
    const chartHeight = 110
    const margin = { top: 12, right: 12, bottom: 28, left: 38 }
    const barWidth = 12
    const gap = 6
    const innerWidth = Math.max(100, seriesConv.length * (barWidth + gap) - gap)
    const totalWidth = margin.left + innerWidth + margin.right
    const totalHeight = margin.top + chartHeight + margin.bottom

    const colorByEvent: Record<'first_visit'|'demo_submit'|'vf_signup', { base: string; light: string } > = {
      first_visit: { base: '#8b5cf6', light: 'rgba(139,92,246,0.3)' }, // violet
      demo_submit: { base: '#f59e0b', light: 'rgba(245,158,11,0.3)' }, // amber
      vf_signup: { base: '#8b5cf6', light: 'rgba(139,92,246,0.3)' }, // use violet for signup conv for contrast
    }
    const col = colorByEvent[selectedEvent]

    // Dynamic Y-scale based on data max (nice-rounded)
    const maxPctVal = Math.max(0.0001, ...seriesConv.map(s => s.pct))
    const niceMax = (v: number) => {
      const pow10 = Math.pow(10, Math.floor(Math.log10(v)))
      const n = v / pow10
      const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
      return nice * pow10
    }
    const yMax = Math.max(1, niceMax(maxPctVal))
    const ticks = [0, 0.25 * yMax, 0.5 * yMax, 0.75 * yMax, yMax]
    const formatTick = (t: number) => (yMax >= 1 ? `${Math.round(t)}%` : `${t.toFixed(2)}%`)

    const getISOWeek = (date: Date) => {
      const d = new Date(date)
      d.setHours(0,0,0,0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }

    const eventLabel = selectedEvent === 'first_visit' ? 'First visits' : selectedEvent === 'demo_submit' ? 'Demos' : 'Signups'
    return (
      <div className="w-full bg-card rounded border border-border/20">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Weekly Conversion</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.base }} />
              <span>{eventLabel} / Sessions</span>
            </div>
          </div>
        </div>
        <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full h-[180px]">
          <defs>
            <linearGradient id="barGradConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={col.base} stopOpacity={0.95} />
              <stop offset="100%" stopColor={col.base} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          {/* grid */}
          {ticks.map((t, idx) => {
            const y = margin.top + chartHeight * (1 - (t / yMax))
            return (
              <g key={idx}>
                <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="currentColor" opacity={0.08} />
                <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.4}>{formatTick(t)}</text>
              </g>
            )
          })}

          {/* x-axis */}
          <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + innerWidth} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />

          {/* bars */}
          {seriesConv.map((s, i) => {
            const value = s.pct
            const h = Math.max(2, (value / yMax) * chartHeight)
            const x = margin.left + i * (barWidth + gap)
            const y = margin.top + (chartHeight - h)
            const isHover = hoverIndexConv === i
            return (
              <g key={s.week_start} onMouseEnter={() => setHoverIndexConv(i)} onMouseLeave={() => setHoverIndexConv(null)}>
                <rect x={x} y={y} width={barWidth} height={h} rx={3} fill={isHover ? col.base : 'url(#barGradConv)'} opacity={isHover ? 1 : 0.95} />
                {isHover && (
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.85}>
                    {value.toFixed(2)}%
                  </text>
                )}
                {i % 2 === 0 && (
                  <text x={x + barWidth / 2} y={margin.top + chartHeight + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
                    {(() => { const d = new Date(s.week_start); const w = getISOWeek(d); return `W${String(w).padStart(2,'0')}` })()}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // Helper: client-side ignore to ensure newly added rules hide from filter immediately
  const shouldIgnoreClientSide = React.useCallback((src: string): boolean => {
    if (!rules) return false
    for (const r of rules) {
      if (r.is_regex) {
        try {
          const re = new RegExp(r.pattern)
          if (re.test(src)) return true
        } catch {}
      } else if (r.is_glob) {
        // convert simple glob/like to regex
        let pat = r.pattern
        // escape regex chars
        pat = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        // replace % and * with .*
        pat = pat.replace(/[%*]/g, '.*')
        try {
          const re = new RegExp(pat)
          if (re.test(src)) return true
        } catch {}
      } else {
        if (src === r.pattern) return true
      }
    }
    return false
  }, [rules])

  // Build source totals and order by sessions desc
  const sourceTotals = React.useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of (data || [])) {
      totals.set(row.session_source, (totals.get(row.session_source) || 0) + (row.sessions || 0))
    }
    return totals
  }, [data])

  const baseSources = React.useMemo(() => {
    const entries: { source: string; sessions: number }[] = []
    sourceTotals.forEach((sessions, source) => {
      if (!shouldIgnoreClientSide(source)) {
        entries.push({ source, sessions })
      }
    })
    entries.sort((a, b) => b.sessions - a.sessions)
    return entries
  }, [sourceTotals, shouldIgnoreClientSide])

  const allSources = React.useMemo(() => baseSources.map(e => e.source), [baseSources])
  const filteredSources = React.useMemo(() =>
    baseSources
      .filter(e => e.source.toLowerCase().includes(sourcesFilterText.toLowerCase()))
      .map(e => e.source),
    [baseSources, sourcesFilterText]
  )
  const top20Sources = React.useMemo(() => baseSources.slice(0, 20), [baseSources])

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-2 md:px-3">
      <div>
        <h1 className="text-3xl font-bold text-white">Source Performance</h1>
        <p className="text-sm text-muted-foreground">Top-40 weekly sources after ignores, with WoW / 4W / 12W changes. No projections.</p>
      </div>

      {/* Controls (polished): Reference → Event → Tools → Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Reference */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reference</span>
          <Select value={referenceMode} onValueChange={(v) => setReferenceMode(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current week</SelectItem>
              <SelectItem value="lastFinished">Last finished week</SelectItem>
              <SelectItem value="allTime">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Event */}
        <div className="flex items-center gap-2">
          <Select value={selectedEvent} onValueChange={(v) => setSelectedEvent(v as any)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_visit">First visits</SelectItem>
              <SelectItem value="demo_submit">Demos</SelectItem>
              <SelectItem value="vf_signup">Signups</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Quick source filter (Top 20 by sessions) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter</span>
          <Select value={quickFilter} onValueChange={(v) => {
            setQuickFilter(v)
            if (v === 'all') {
              setSelectedSources([])
            } else {
              setSelectedSources([v])
            }
          }}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {top20Sources.map(({ source, sessions }) => (
                <SelectItem key={source} value={source}>{source} — {sessions.toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Tools */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshTop40}>
            Refresh Top-40
          </Button>
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortKey as string} onValueChange={(v) => setSortKey(v as keyof Row)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sessions">Sessions</SelectItem>
              <SelectItem value="first_visit">First Visit</SelectItem>
              <SelectItem value="demo_submit">Demos</SelectItem>
              <SelectItem value="vf_signup">Signups</SelectItem>
              <SelectItem value="session_source">Source</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortDir} onValueChange={(v) => setSortDir(v as 'asc' | 'desc')}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts and summary cards placed above filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Chart />
        <ConversionChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <SummaryCard title="Sessions" summary={sessionsSummary} />
        <SummaryCard title="Signups" summary={signupsSummary} />
        <SummaryCard title="Demos" summary={demosSummary} />
      </div>

      {/* Controls moved above charts */}

      {/* Advanced filter (collapsed by default) */}
      <Collapsible defaultOpen={false}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full px-3">
              Advanced filters
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdmin(v => !v)}>
              {showAdmin ? 'Hide Ignore Rules' : 'Show Ignore Rules'}
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="mt-2 rounded border p-2 bg-card">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter sources</span>
              <input className="bg-background border px-2 py-1 rounded text-sm" placeholder="Search sources" value={sourcesFilterText} onChange={e => setSourcesFilterText(e.target.value)} />
              <button className="px-2 py-1 text-xs rounded border" onClick={() => setSelectedSources(allSources)}>Select all</button>
              <button className="px-2 py-1 text-xs rounded border" onClick={() => setSelectedSources([])}>Clear</button>
            </div>
            <div className="mt-2 max-h-40 overflow-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {filteredSources.map(src => (
                <label key={src} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="accent-emerald-500" checked={selectedSources.includes(src)} onChange={e => {
                    setSelectedSources(prev => e.target.checked ? Array.from(new Set([...prev, src])) : prev.filter(s => s !== src))
                  }} />
                  <span className="truncate" title={src}>{src}</span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Ignore rules admin panel */}
      {showAdmin && (
        <div className="rounded border p-3 bg-card space-y-2">
          <div className="text-sm font-medium">Ignore rules</div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="bg-background border px-2 py-1 rounded text-sm" placeholder="pattern (e.g. %.okta.com)" value={newPattern} onChange={e => setNewPattern(e.target.value)} />
            <select className="bg-background border px-2 py-1 rounded text-sm" value={newType} onChange={e => setNewType(e.target.value as any)}>
              <option value="literal">literal</option>
              <option value="glob">glob</option>
              <option value="regex">regex</option>
            </select>
            <input className="bg-background border px-2 py-1 rounded text-sm" placeholder="notes (optional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            <button className="px-2 py-1 text-xs rounded border" onClick={addRule}>Add</button>
          </div>
          <div className="text-xs text-muted-foreground">After adding/removing rules, click Refresh Top-40 to apply.</div>
          <div className="max-h-40 overflow-auto divide-y border rounded">
            {rulesLoading ? (
              <div className="p-2 text-xs text-muted-foreground">Loading…</div>
            ) : (rules || []).map(rule => (
              <div key={rule.id} className="flex items-center justify-between px-2 py-1 text-sm">
                <div className="truncate">
                  <span className="font-mono">{rule.pattern}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{rule.is_regex ? 'regex' : rule.is_glob ? 'glob' : 'literal'}</span>
                  {rule.notes && <span className="ml-2 text-xs text-muted-foreground">— {rule.notes}</span>}
                </div>
                <button className="px-2 py-0.5 text-xs rounded border" onClick={() => deleteRule(rule.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards and bar chart */}

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Weekly Source Changes (%)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-2 text-xs font-semibold">Week</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Source</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">Sessions</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">First Visit</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">WoW %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">4W %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">12W %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">Demos</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">WoW %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">4W %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">12W %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">Signups</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">WoW %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">4W %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold">12W %</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <React.Fragment key={week}>
                    <tr className="bg-primary/5 text-primary-foreground/90">
                      <td className="px-3 py-2 text-sm font-semibold" colSpan={15}>
                        {format(new Date(week), "MMM dd, yyyy")} — {rowsByWeek[week].length} sources
                      </td>
                    </tr>
                    {applySort(rowsByWeek[week] || []).map(r => (
                      <tr key={`${week}-${r.session_source}`} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{format(new Date(week), "yyyy-'W'II")}</td>
                        <td className="px-3 py-2 text-sm">{r.session_source}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium">{r.sessions.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.first_visit.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right"><Heat value={r.first_visit_wow_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.first_visit_wo4w_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.first_visit_wo12w_pct} /></td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.demo_submit.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right"><Heat value={r.demo_submit_wow_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.demo_submit_wo4w_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.demo_submit_wo12w_pct} /></td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.vf_signup.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right"><Heat value={r.vf_signup_wow_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.vf_signup_wo4w_pct} /></td>
                        <td className="px-2 py-2 text-right"><Heat value={r.vf_signup_wo12w_pct} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

