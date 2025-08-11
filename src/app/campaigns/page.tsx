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
import { isCurrentWeek as checkIsCurrentWeek } from "@/lib/week-progress"

type Row = {
  week_start: string
  campaign: string
  sessions: number
  demo_submit: number
  vf_signup: number
  demo_submit_wow_pct: number | null
  vf_signup_wow_pct: number | null
  demo_submit_wo4w_pct: number | null
  vf_signup_wo4w_pct: number | null
  demo_submit_wo12w_pct: number | null
  vf_signup_wo12w_pct: number | null
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)
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

export default function CampaignReport() {
  const queryClient = useQueryClient()

  const [selectedEvent, setSelectedEvent] = React.useState<'demo_submit' | 'vf_signup'>('demo_submit')
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<string[]>([])
  const [campaignFilterText, setCampaignFilterText] = React.useState("")
  const [referenceMode, setReferenceMode] = React.useState<'current' | 'lastFinished' | 'allTime'>('current')
  const [quickFilter, setQuickFilter] = React.useState<string>('all')
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const [hoverIndexConv, setHoverIndexConv] = React.useState<number | null>(null)

  // Fetch weekly campaign data (sessions, demos, signups)
  const { data, isLoading, error } = useQuery({
    queryKey: ["weekly-campaigns"],
    queryFn: async () => {
      // PostgREST caps at ~1000 rows per request. Try paginated fetch; fallback to single-page if needed.
      const pageSize = 1000
      let from = 0
      const rawAll: any[] = []
      try {
        for (let guard = 0; guard < 100; guard++) {
          const { data: page, error } = await supabase
            .from('wk_by_campaign')
            .select('week_start, camp, sessions, demo_submit, vf_signup')
            .order('week_start', { ascending: false })
            .range(from, from + pageSize - 1)
          if (error) throw error
          if (!page || page.length === 0) break
          rawAll.push(...page)
          if (page.length < pageSize) break
          from += pageSize
        }
      } catch (e) {
        // Ignore and try simple one-shot fetch as a fallback
      }
      if (rawAll.length === 0) {
        const { data: onePage, error: e2 } = await supabase
          .from('wk_by_campaign')
          .select('week_start, camp, sessions, demo_submit, vf_signup')
          .order('week_start', { ascending: false })
          .limit(1000)
        if (e2) throw e2
        if (onePage) rawAll.push(...onePage)
      }
      type Raw = { week_start: string; camp: string | null; sessions: number; demo_submit: number; vf_signup: number }
      const raw = (rawAll || []) as unknown as Raw[]
      const normalizeDate = (s: string) => (typeof s === 'string' ? s.split('T')[0] : s as any)
      // Build weeks desc and campaigns
      const weeksDesc = Array.from(new Set(raw.map(r => normalizeDate(r.week_start)))).sort((a,b) => (a < b ? 1 : -1))
      const byCampWeek = new Map<string, Map<string, { sessions: number; demo_submit: number; vf_signup: number }>>()
      for (const r of raw) {
        const c = r.camp || '(none)'
        if (!byCampWeek.has(c)) byCampWeek.set(c, new Map())
        const m = byCampWeek.get(c)!
        const key = normalizeDate(r.week_start)
        const cur = m.get(key) || { sessions: 0, demo_submit: 0, vf_signup: 0 }
        cur.sessions += Number(r.sessions || 0)
        cur.demo_submit += Number(r.demo_submit || 0)
        cur.vf_signup += Number(r.vf_signup || 0)
        m.set(key, cur)
      }

      const pct = (cur: number, base: number) => (base > 0 ? ((cur - base) / base) * 100 : null)

      const out: Row[] = []
      for (let wi = 0; wi < weeksDesc.length; wi++) {
        const w = weeksDesc[wi]
        const prev1 = weeksDesc[wi+1]
        const prev4 = weeksDesc.slice(wi+1, wi+1+4)
        const prev12 = weeksDesc.slice(wi+1, wi+1+12)
        byCampWeek.forEach((m, camp) => {
          const cur = m.get(w) || { sessions: 0, demo_submit: 0, vf_signup: 0 }
          const p1 = prev1 ? (m.get(prev1) || { sessions: 0, demo_submit: 0, vf_signup: 0 }) : { sessions: 0, demo_submit: 0, vf_signup: 0 }
          const avg = (arr: string[], key: 'demo_submit'|'vf_signup') => {
            if (arr.length === 0) return 0
            const sum = arr.reduce((s, ww) => s + ((m.get(ww)?.[key] || 0)), 0)
            return sum / arr.length
          }
          const avg4Demo = avg(prev4, 'demo_submit')
          const avg12Demo = avg(prev12, 'demo_submit')
          const avg4Sign = avg(prev4, 'vf_signup')
          const avg12Sign = avg(prev12, 'vf_signup')
          out.push({
            week_start: w,
            campaign: camp,
            sessions: cur.sessions,
            demo_submit: cur.demo_submit,
            vf_signup: cur.vf_signup,
            demo_submit_wow_pct: pct(cur.demo_submit, p1.demo_submit),
            vf_signup_wow_pct: pct(cur.vf_signup, p1.vf_signup),
            demo_submit_wo4w_pct: pct(cur.demo_submit, avg4Demo),
            vf_signup_wo4w_pct: pct(cur.vf_signup, avg4Sign),
            demo_submit_wo12w_pct: pct(cur.demo_submit, avg12Demo),
            vf_signup_wo12w_pct: pct(cur.vf_signup, avg12Sign),
          })
        })
      }
      return out
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  // Sorting state
  const [sortKey, setSortKey] = React.useState<keyof Row>('campaign')
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

  // Signature of selected campaigns for stable memo/query keys
  const selectedCampaignsSig = React.useMemo(() => [...selectedCampaigns].sort().join('|'), [selectedCampaigns])

  // Build period buckets (weeks) list
  const weeks = React.useMemo(() => Array.from(new Set((data || []).map(r => (typeof r.week_start === 'string' ? r.week_start.split('T')[0] : r.week_start)))).sort((a,b) => (a < b ? 1 : -1)), [data])
  const rowsByWeek = React.useMemo(() => {
    const map: Record<string, Row[]> = {}
    for (const w of (weeks || [])) {
      let rows = (data || []).filter(r => r.week_start === w)
      if (selectedCampaigns.length > 0) {
        const selectedSet = new Set(selectedCampaigns)
        rows = rows.filter(r => selectedSet.has(r.campaign))
      }
      map[w] = rows
    }
    return map
  }, [data, (weeks || []).join('|'), selectedCampaignsSig])

  // Aggregate totals by week across current filter
  const aggregatesByWeek: Record<string, { sessions: number; demo_submit: number; vf_signup: number }> = {}
  for (const w of (weeks || [])) {
    const rows = rowsByWeek[w] || []
    aggregatesByWeek[w] = rows.reduce((acc, r) => {
      acc.sessions += r.sessions || 0
      acc.demo_submit += r.demo_submit || 0
      acc.vf_signup += r.vf_signup || 0
      return acc
    }, { sessions: 0, demo_submit: 0, vf_signup: 0 })
  }

  // Determine reference week
  const referenceWeek = React.useMemo(() => {
    const buckets = weeks || []
    if (buckets.length === 0) return null
    if (referenceMode === 'allTime') return null
    if (referenceMode === 'current') return buckets[0]
    const first = buckets[0]
    const isCurr = checkIsCurrentWeek(first)
    if (isCurr && buckets.length > 1) return buckets[1]
    return first
  }, [weeks, referenceMode])

  const refIdx = referenceWeek ? (weeks || []).indexOf(referenceWeek) : -1
  const latest = referenceWeek
  const bucketsAll = weeks || []
  const prev1 = refIdx >= 0 && refIdx + 1 < bucketsAll.length ? bucketsAll[refIdx + 1] : undefined
  const prev4Slice = refIdx >= 0 ? bucketsAll.slice(refIdx + 1, refIdx + 1 + 4) : []
  const prev12Slice = refIdx >= 0 ? bucketsAll.slice(refIdx + 1, refIdx + 13) : []
  const pct = (cur: number, base: number) => (base > 0 ? ((cur - base) / base) * 100 : null)

  const makeSummary = (key: 'sessions' | 'demo_submit' | 'vf_signup') => {
    if (referenceMode === 'allTime') {
      const current = weeks.reduce((sum, w) => sum + (aggregatesByWeek[w]?.[key] || 0), 0)
      return { current, last: 0, avg4: 0, avg12: 0, wow: null as number | null, w4: null as number | null, w12: null as number | null, diffWow: 0, diff4: 0, diff12: 0 }
    }
    const current = latest ? aggregatesByWeek[latest]?.[key] || 0 : 0
    const last = prev1 ? aggregatesByWeek[prev1]?.[key] || 0 : 0
    const avg4 = prev4Slice.length ? prev4Slice.reduce((s, w) => s + (aggregatesByWeek[w]?.[key] || 0), 0) / prev4Slice.length : 0
    const avg12 = prev12Slice.length ? prev12Slice.reduce((s, w) => s + (aggregatesByWeek[w]?.[key] || 0), 0) / prev12Slice.length : 0
    return { current, last, avg4, avg12, wow: pct(current, last), w4: pct(current, avg4), w12: pct(current, avg12), diffWow: current - last, diff4: current - avg4, diff12: current - avg12 }
  }

  const sessionsSummary = makeSummary('sessions')
  const signupsSummary = makeSummary('vf_signup')
  const demosSummary = makeSummary('demo_submit')
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
        <div className="mt-1 text-[11px] text-muted-foreground">Prev wk: <span className="text-foreground font-medium">{formatNumber(summary.last)}</span></div>
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
      </CardContent>
    </Card>
  )

  // Build series for selected event
  const series = React.useMemo(() => {
    const ascWeeks = [...weeks].sort((a,b) => (a > b ? 1 : -1))
    return ascWeeks.map(week => {
      const rows = rowsByWeek[week] || []
      const count = rows.reduce((sum, r) => sum + (selectedEvent === 'demo_submit' ? r.demo_submit : r.vf_signup), 0)
      return { week_start: week, count }
    })
  }, [weeks.join(','), selectedEvent, selectedCampaignsSig])

  const maxCount = Math.max(1, ...series.map(s => s.count))

  const Chart = () => {
    const chartHeight = 110
    const margin = { top: 12, right: 12, bottom: 28, left: 38 }
    const barWidth = 12
    const gap = 6
    const innerWidth = Math.max(100, series.length * (barWidth + gap) - gap)
    const totalWidth = margin.left + innerWidth + margin.right
    const totalHeight = margin.top + chartHeight + margin.bottom
    const col = { base: '#10b981', light: 'rgba(16,185,129,0.3)' }
    const maxVal = Math.max(0.0001, ...series.map(s => s.count))
    const niceMax = (v: number) => { const pow10 = Math.pow(10, Math.floor(Math.log10(v))); const n = v / pow10; const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return nice * pow10 }
    const yMax = Math.max(1, niceMax(maxVal))
    const ticks = [0, 0.25 * yMax, 0.5 * yMax, 0.75 * yMax, yMax]
    const getISOWeek = (date: Date) => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) }
    const eventLabel = selectedEvent === 'demo_submit' ? 'Demos' : 'Signups'
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
          {ticks.map((t, idx) => { const y = margin.top + chartHeight * (1 - (t / yMax)); return (<g key={idx}><line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="currentColor" opacity={0.08} /><text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.4}>{Math.round(t).toLocaleString()}</text></g>) })}
          <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + innerWidth} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />
          {series.map((s, i) => { const value = s.count; const h = Math.max(2, (value / yMax) * chartHeight); const x = margin.left + i * (barWidth + gap); const y = margin.top + (chartHeight - h); const isHover = hoverIndex === i; return (<g key={s.week_start} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}><rect x={x} y={y} width={barWidth} height={h} rx={3} fill={isHover ? col.base : 'url(#barGrad)'} opacity={isHover ? 1 : 0.95} />{isHover && (<text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.85}>{value.toLocaleString()}</text>)}{i % 2 === 0 && (<text x={x + barWidth / 2} y={margin.top + chartHeight + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>{(() => { const d = new Date(s.week_start); return `W${String(getISOWeek(d)).padStart(2,'0')}` })()}</text>)}</g>) })}
        </svg>
      </div>
    )
  }

  // Conversion series
  const seriesConv = React.useMemo(() => {
    const ascWeeks = [...weeks].sort((a,b) => (a > b ? 1 : -1))
    return ascWeeks.map(week => {
      const rows = rowsByWeek[week] || []
      const eventSum = rows.reduce((s, r) => s + (selectedEvent === 'demo_submit' ? r.demo_submit : r.vf_signup), 0)
      const sess = aggregatesByWeek[week]?.sessions || 0
      const pct = sess > 0 ? (eventSum / sess) * 100 : 0
      return { week_start: week, pct }
    })
  }, [weeks.join(','), selectedEvent, selectedCampaignsSig])

  const ConversionChart = () => {
    const chartHeight = 110
    const margin = { top: 12, right: 12, bottom: 28, left: 38 }
    const barWidth = 12
    const gap = 6
    const innerWidth = Math.max(100, seriesConv.length * (barWidth + gap) - gap)
    const totalWidth = margin.left + innerWidth + margin.right
    const totalHeight = margin.top + chartHeight + margin.bottom
    const col = { base: '#8b5cf6' }
    const maxPctVal = Math.max(0.0001, ...seriesConv.map(s => s.pct))
    const niceMax = (v: number) => { const pow10 = Math.pow(10, Math.floor(Math.log10(v))); const n = v / pow10; const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return nice * pow10 }
    const yMax = Math.max(1, niceMax(maxPctVal))
    const ticks = [0, 0.25 * yMax, 0.5 * yMax, 0.75 * yMax, yMax]
    const getISOWeek = (date: Date) => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) }
    const eventLabel = selectedEvent === 'demo_submit' ? 'Demos' : 'Signups'
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
          {ticks.map((t, idx) => { const y = margin.top + chartHeight * (1 - (t / yMax)); return (<g key={idx}><line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="currentColor" opacity={0.08} /><text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.4}>{yMax >= 1 ? `${Math.round(t)}%` : `${t.toFixed(2)}%`}</text></g>) })}
          <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + innerWidth} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />
          {seriesConv.map((s, i) => { const value = s.pct; const h = Math.max(2, (value / yMax) * chartHeight); const x = margin.left + i * (barWidth + gap); const y = margin.top + (chartHeight - h); const isHover = hoverIndexConv === i; return (<g key={s.week_start} onMouseEnter={() => setHoverIndexConv(i)} onMouseLeave={() => setHoverIndexConv(null)}><rect x={x} y={y} width={barWidth} height={h} rx={3} fill={isHover ? col.base : 'url(#barGradConv)'} opacity={isHover ? 1 : 0.95} />{isHover && (<text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.85}>{value.toFixed(2)}%</text>)}{i % 2 === 0 && (<text x={x + barWidth / 2} y={margin.top + chartHeight + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>{(() => { const d = new Date(s.week_start); return `W${String(getISOWeek(d)).padStart(2,'0')}` })()}</text>)}</g>) })}
        </svg>
      </div>
    )
  }

  // Build campaign list and quick filter
  const campaignTotals = React.useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of (data || [])) {
      totals.set(row.campaign, (totals.get(row.campaign) || 0) + (row.sessions || 0))
    }
    return totals
  }, [data])
  const baseCampaigns = React.useMemo(() => {
    const entries: { campaign: string; sessions: number }[] = []
    campaignTotals.forEach((sessions, campaign) => { entries.push({ campaign, sessions }) })
    entries.sort((a, b) => b.sessions - a.sessions)
    return entries
  }, [campaignTotals])
  const allCampaigns = React.useMemo(() => baseCampaigns.map(e => e.campaign), [baseCampaigns])
  const filteredCampaigns = React.useMemo(() => baseCampaigns.filter(e => e.campaign.toLowerCase().includes(campaignFilterText.toLowerCase())).map(e => e.campaign), [baseCampaigns, campaignFilterText])
  const top20Campaigns = React.useMemo(() => baseCampaigns.slice(0, 20), [baseCampaigns])

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-2 md:px-3">
      <div>
        <h1 className="text-3xl font-bold text-white">Campaign Performance</h1>
        <p className="text-sm text-muted-foreground">Top-40 weekly campaigns with WoW / 4W / 12W changes. No projections.</p>
      </div>

      {/* Controls: Reference → Event → Filter → Sort */}
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
              <SelectItem value="demo_submit">Demos</SelectItem>
              <SelectItem value="vf_signup">Signups</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Quick campaign filter (Top 20 by sessions) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter</span>
          <Select value={quickFilter} onValueChange={(v) => {
            setQuickFilter(v)
            if (v === 'all') {
              setSelectedCampaigns([])
            } else {
              setSelectedCampaigns([v])
            }
          }}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {top20Campaigns.map(({ campaign, sessions }) => (
                <SelectItem key={campaign} value={campaign}>{campaign} — {sessions.toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts and summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Chart />
        <ConversionChart />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <SummaryCard title="Sessions" summary={sessionsSummary} />
        <SummaryCard title="Signups" summary={signupsSummary} />
        <SummaryCard title="Demos" summary={demosSummary} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Weekly Campaign Changes (%)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                {/* Group headers to match Sources look */}
                <tr className="border-b border-border/20">
                  <th className="px-3 py-1.5 border-r border-border/10"></th>
                  <th className="px-3 py-1.5 border-r border-border/10"></th>
                  <th className="px-2 py-1.5 text-center bg-teal-500/10 border-r border-border/20">
                    <span className="text-caption font-bold uppercase tracking-wider text-teal-400">Sessions</span>
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 text-center bg-amber-500/10 border-r border-border/20">
                    <span className="text-caption font-bold uppercase tracking-wider text-amber-400">Demos</span>
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 text-center bg-violet-500/10 border-r border-border/20">
                    <span className="text-caption font-bold uppercase tracking-wider text-violet-400">Signups</span>
                  </th>
                </tr>
                {/* Column headers */}
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-2 font-medium text-xs border-r border-border/10">Week</th>
                  <th className="text-left px-3 py-2 font-medium text-xs border-r border-border/10">Campaign</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-teal-900/30 text-teal-300 border-r border-border/20">Sessions</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-amber-900/30 text-amber-200 border-r border-border/10">Demos</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-amber-900/30 text-amber-200 border-r border-border/10">WoW</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-amber-900/30 text-amber-200 border-r border-border/10">4W</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-amber-900/30 text-amber-200 border-r border-border/20">12W</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-violet-900/30 text-violet-300 border-r border-border/10">Signups</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-violet-900/30 text-violet-300 border-r border-border/10">WoW</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-violet-900/30 text-violet-300 border-r border-border/10">4W</th>
                  <th className="text-right px-2 py-2 font-semibold text-xs tracking-wide bg-violet-900/30 text-violet-300">12W</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <React.Fragment key={week}>
                    <tr className="bg-primary/5 text-primary-foreground/90">
                      <td className="px-3 py-2 text-sm font-semibold" colSpan={11}>
                        {format(new Date(week), "yyyy-'W'II")} — {rowsByWeek[week].length} campaigns
                      </td>
                    </tr>
                    {applySort(rowsByWeek[week] || []).map(r => (
                      <tr key={`${week}-${r.campaign}`} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{format(new Date(week), "yyyy-'W'II")}</td>
                        <td className="px-3 py-2 text-sm">{r.campaign}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium">{r.sessions.toLocaleString()}</td>
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

