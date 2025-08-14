"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
// import { format } from "date-fns"

type Granularity = "channel" | "source" | "medium" | "source_medium" | "campaign" | "keyword" | "first_source"

type MetricRow = {
  week_start: string
  key: string
  sessions: number
  demo_submit: number
  vf_signup: number
}

type WeeklyRowMinimal = {
  week_start: string
  sessions: number
  demo_submit: number
  vf_signup: number
  channel?: string | null
  src?: string | null
  med?: string | null
  camp?: string | null
  kw?: string | null
  first_src?: string | null
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n)

function useAnalysisData(gran: Granularity) {
  // Load recent distinct weeks (up to 13 for 12W averages)
  const weeks2 = useQuery<string[]>({
    queryKey: ["analysis-weeks-latest"] as const,
    queryFn: async () => {
      // Use a public weekly view guaranteed to have data
      const { data, error } = await supabase
        .from("wk_by_channel")
        .select("week_start")
        .order("week_start", { ascending: false })
        .limit(80)
      if (error) throw error
      const all = Array.from(new Set(((data || []) as { week_start: string }[]).map(r => String(r.week_start))))
      // Return up to 13 recent distinct weeks (current + 12 previous)
      return all.slice(0, 13)
    },
    staleTime: 60_000,
    placeholderData: [],
  })

  type TableInfo = { table: "wk_by_channel" | "wk_by_src_med" | "wk_by_campaign"; fields: (keyof WeeklyRowMinimal)[]; keyer: (r: WeeklyRowMinimal) => string }
  const tableInfo: TableInfo = React.useMemo(() => {
    switch (gran) {
      case "channel": return { table: "wk_by_channel", fields: ["channel"], keyer: (r: WeeklyRowMinimal) => String(r.channel || "(none)") }
      case "source": return { table: "wk_by_src_med", fields: ["src"], keyer: (r: WeeklyRowMinimal) => String(r.src || "(none)") }
      case "medium": return { table: "wk_by_src_med", fields: ["med"], keyer: (r: WeeklyRowMinimal) => String(r.med || "(none)") }
      case "source_medium": return { table: "wk_by_src_med", fields: ["src", "med"], keyer: (r: WeeklyRowMinimal) => `${r.src || "(none)"} / ${r.med || "(none)"}` }
      case "campaign": return { table: "wk_by_campaign", fields: ["camp"], keyer: (r: WeeklyRowMinimal) => String(r.camp || "(none)") }
      case "keyword": return { table: "wk_by_campaign", fields: ["kw"], keyer: (r: WeeklyRowMinimal) => String(r.kw || "(none)") }
      case "first_source": return { table: "wk_by_campaign", fields: ["first_src"], keyer: (r: WeeklyRowMinimal) => String(r.first_src || "(none)") }
    }
  }, [gran])

  const metrics = useQuery<MetricRow[]>({
    queryKey: ["analysis-metrics", gran, weeks2.data?.join("|") || "none"],
    queryFn: async () => {
      const weeks = weeks2.data || []
      if (weeks.length === 0) return []
      // Robust pagination to avoid row caps causing missing prev-week data
      const pageSize = 1000
      let from = 0
      const rows: WeeklyRowMinimal[] = []
      for (let guard = 0; guard < 200; guard++) {
        const { data: page, error } = await supabase
          .from(tableInfo.table)
          .select(["week_start", ...tableInfo.fields, "sessions", "demo_submit", "vf_signup"].join(", "))
          .in("week_start", weeks)
          .order("week_start", { ascending: false })
          .range(from, from + pageSize - 1)
        if (error) throw error
        if (!page || page.length === 0) break
        const pageTyped = page as unknown as WeeklyRowMinimal[]
        rows.push(...pageTyped)
        if (page.length < pageSize) break
        from += pageSize
      }
      const map = new Map<string, MetricRow>()
      for (const r of rows) {
        const wk = r.week_start
        const key = tableInfo.keyer(r)
        const id = `${wk}__${key}`
        const cur = map.get(id) || { week_start: wk, key, sessions: 0, demo_submit: 0, vf_signup: 0 }
        cur.sessions += Number(r.sessions || 0)
        cur.demo_submit += Number(r.demo_submit || 0)
        cur.vf_signup += Number(r.vf_signup || 0)
        map.set(id, cur)
      }
      return Array.from(map.values())
    },
    placeholderData: [],
    staleTime: 60_000,
  })

  return { metrics }
}

export default function AnalysisPage() {
  const [gran, setGran] = React.useState<Granularity>("source_medium")
  const [eventMetric, setEventMetric] = React.useState<"sessions" | "demo_submit" | "vf_signup">("sessions")
  const [topN, setTopN] = React.useState<number>(20)
  const [search, setSearch] = React.useState<string>("")
  const [showZeros, setShowZeros] = React.useState<boolean>(false)
  const [baseIdx, setBaseIdx] = React.useState<number>(0) // 0: current, 1: last finished

  const { metrics } = useAnalysisData(gran)

  // Join rows by (week, key)
  const joined = React.useMemo(() => (metrics.data || []), [metrics.data])

  // Build axes
  const weeks = React.useMemo(() => Array.from(new Set((joined || []).map(r => r.week_start))).sort((a,b) => (a < b ? 1 : -1)), [joined])
  const baseWeek = weeks[baseIdx]
  const compareWeek = weeks[baseIdx + 1]
  const prev4 = weeks.slice(baseIdx + 1, baseIdx + 5)
  const prev12 = weeks.slice(baseIdx + 1, baseIdx + 13)

  // Aggregate by key for current and last week
  const byKey = React.useMemo(() => {
    const map = new Map<string, { cur: number; prev: number; sessionsCur: number; sessionsPrev: number; sum4: number; sum12: number; n4: number; n12: number }>()
    for (const r of joined) {
      const isCur = r.week_start === baseWeek
      const rec = map.get(r.key) || { cur: 0, prev: 0, sessionsCur: 0, sessionsPrev: 0, sum4: 0, sum12: 0, n4: 0, n12: 0 }
      if (isCur) {
        rec.sessionsCur += r.sessions
        rec.cur += eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
      } else if (r.week_start === compareWeek) {
        rec.sessionsPrev += r.sessions
        rec.prev += eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
      }
      if (prev4.includes(r.week_start)) {
        rec.sum4 += eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
        rec.n4 += 1
      }
      if (prev12.includes(r.week_start)) {
        rec.sum12 += eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
        rec.n12 += 1
      }
      map.set(r.key, rec)
    }
    return map
  }, [joined, baseWeek, compareWeek, prev4.join("|"), prev12.join("|"), eventMetric])

  const totals = React.useMemo(() => {
    let cur = 0, prev = 0
    byKey.forEach(v => { cur += v.cur; prev += v.prev })
    return { cur, prev, delta: cur - prev }
  }, [byKey])

  const filteredSortedKeys = React.useMemo(() => {
    const arr = Array.from(byKey.entries())
      .filter(([k]) => (search ? k.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a,b) => b[1].cur - a[1].cur)
      .slice(0, topN)
      .map(([k]) => k)
    return arr
  }, [byKey, search, topN])

  // Series per week (Top 20 keys stacked)
  const series = React.useMemo(() => {
    const byWeek = new Map<string, number>()
    for (const w of weeks) byWeek.set(w, 0)
    for (const r of joined) {
      if (!filteredSortedKeys.includes(r.key)) continue
      const v = eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
      byWeek.set(r.week_start, (byWeek.get(r.week_start) || 0) + v)
    }
    return weeks.slice().reverse().map(w => ({ week_start: w, count: byWeek.get(w) || 0 }))
  }, [joined, filteredSortedKeys, weeks, eventMetric])

  const Chart = () => {
    const chartHeight = 110
    const margin = { top: 12, right: 12, bottom: 28, left: 42 }
    const gap = 6
    const barWidth = 14
    const innerWidth = Math.max(120, series.length * (barWidth + gap) - gap)
    const totalWidth = margin.left + innerWidth + margin.right
    const totalHeight = margin.top + chartHeight + margin.bottom
    const maxVal = Math.max(0.0001, ...series.map(s => s.count))
    const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return m * p }
    const yMax = Math.max(1, niceMax(maxVal))
    const ticks = [0, 0.25 * yMax, 0.5 * yMax, 0.75 * yMax, yMax]
    const getISOWeek = (date: Date) => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) }
    return (
      <div className="w-full bg-card rounded border border-border/20">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="text-sm font-semibold">Weekly {eventMetric === "sessions" ? "Sessions" : eventMetric === "demo_submit" ? "Demos" : "Signups"}</div>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} style={{ width: totalWidth }} className="h-[180px]">
            {ticks.map((t, idx) => {
              const y = margin.top + chartHeight * (1 - (t / yMax))
              return (
                <g key={idx}>
                  <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="currentColor" opacity={0.08} />
                  <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.4}>{Math.round(t).toLocaleString()}</text>
                </g>
              )
            })}
            <line x1={margin.left} y1={margin.top + chartHeight} x2={margin.left + innerWidth} y2={margin.top + chartHeight} stroke="currentColor" opacity={0.12} />
            {series.map((s, i) => {
              const value = s.count
              const h = Math.max(2, (value / yMax) * chartHeight)
              const x = margin.left + i * (barWidth + gap)
              const y = margin.top + (chartHeight - h)
              return (
                <g key={s.week_start}>
                  <rect x={x} y={y} width={barWidth} height={h} rx={3} fill="#10b981" opacity={0.95} />
                  {i % 2 === 0 && (
                    <text x={x + barWidth / 2} y={margin.top + chartHeight + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
                      {(() => { const d = new Date(s.week_start); return `W${String(getISOWeek(d)).padStart(2,'0')}` })()}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    )
  }

  // Build table rows grouped by week then key
  const byWeek = React.useMemo(() => {
    const m = new Map<string, { key: string; sessions: number; demo_submit: number; vf_signup: number }[]>()
    for (const w of weeks) m.set(w, [])
    for (const r of joined) {
      const arr = m.get(r.week_start)!
      arr.push({ key: r.key, sessions: r.sessions, demo_submit: r.demo_submit, vf_signup: r.vf_signup })
    }
    return m
  }, [joined, weeks])

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-2 md:px-3">
      <div>
        <h1 className="text-3xl font-bold text-white">Traffic Sources Analysis</h1>
        <p className="text-sm text-muted-foreground">Weekly view across channels, sources, mediums, campaigns, keywords, and first-touch.</p>
      </div>

      {/* Detailed table for current week by granularity */}
      {(() => {
        type ChipVal = number | 'new'
        const chipEl = (v: ChipVal | null) => {
          const base = "inline-flex justify-center items-center min-w-[58px] px-1.5 py-0.5 rounded tabular-nums"
          if (v === null) return <span className={`${base} bg-muted/50`}>—</span>
          if (v === 'new') return <span className={`${base} bg-emerald-500/15 text-emerald-400`}>NEW</span>
          const pos = (v as number) > 0
          const cls = pos ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
          const num = v as number
          return <span className={`${base} ${cls}`}>{`${num>0?"+":""}${num.toFixed(1)}%`}</span>
        }

        // Build recent series per key (up to 12 weeks old -> sparkline)
        const recent = weeks.slice(0, 12).reverse()
        const seriesByKey = new Map<string, number[]>()
        for (const k of Array.from(byKey.keys())) seriesByKey.set(k, recent.map(() => 0))
        for (const r of joined) {
          const idx = recent.indexOf(r.week_start)
          if (idx === -1) continue
          const arr = seriesByKey.get(r.key) || recent.map(() => 0)
          const v = eventMetric === "sessions" ? r.sessions : eventMetric === "demo_submit" ? r.demo_submit : r.vf_signup
          arr[idx] += v
          seriesByKey.set(r.key, arr)
        }

        type Row = {
          key: string
          current: number
          prev: number
          share: number
          wow: ChipVal | null
          w4: ChipVal | null
          w12: ChipVal | null
          delta: number
          shareDelta: number
          sessionsCur: number
          cvr: number | null
          spark: number[]
        }

        const rowsAll: Row[] = Array.from(byKey.entries()).map(([k, v]) => {
          const current = v.cur
          const prev = v.prev
          const share = totals.cur > 0 ? current / totals.cur : 0
          const avg4 = v.n4 > 0 ? v.sum4 / v.n4 : 0
          const avg12 = v.n12 > 0 ? v.sum12 / v.n12 : 0
          const wow: ChipVal | null = prev > 0 ? (((current - prev) / prev) * 100) : (prev === 0 ? (current > 0 ? 'new' : 0) : null)
          const w4: ChipVal | null = avg4 > 0 ? (((current - avg4) / avg4) * 100) : (avg4 === 0 ? (current > 0 ? 'new' : 0) : null)
          const w12: ChipVal | null = avg12 > 0 ? (((current - avg12) / avg12) * 100) : (avg12 === 0 ? (current > 0 ? 'new' : 0) : null)
          const delta = current - prev
          const shareDelta = totals.delta !== 0 ? delta / totals.delta : 0
          const sessionsCur = v.sessionsCur
          const cvr = eventMetric === 'sessions' ? null : (sessionsCur > 0 ? (current / sessionsCur) * 100 : null)
          return {
            key: k,
            current,
            prev,
            share,
            wow,
            w4,
            w12,
            delta,
            shareDelta,
            sessionsCur,
            cvr,
            spark: seriesByKey.get(k) || [],
          }
        })

        // Filter, sort, limit
        const visible = rowsAll
          .filter(r => (showZeros ? true : r.current > 0))
          .filter(r => (search ? r.key.toLowerCase().includes(search.toLowerCase()) : true))
          .sort((a, b) => b.current - a.current)
          .slice(0, topN)

        // Sparkline renderer
        const Spark = ({ values }: { values: number[] }) => {
          const w = 90, h = 24, pad = 2
          const max = Math.max(1, ...values)
          const bw = Math.max(2, Math.floor((w - pad * 2) / Math.max(1, values.length * 1.5)))
          const gap = bw / 2
          return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
              {values.map((v, i) => {
                const x = pad + i * (bw + gap)
                const bh = Math.max(1, (v / max) * (h - 2))
                const y = h - bh
                return <rect key={i} x={x} y={y} width={bw} height={bh} rx={1.5} fill="#10b981" opacity={0.9} />
              })}
            </svg>
          )
        }

        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-lg">{baseIdx===0?"Current week":"Last finished week"} by {gran.replace("_", " / ")}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 rounded-md border border-border/30 p-1">
                  {[{i:0,label:"Current"},{i:1,label:"Last"}].map(t => (
                    <Button key={t.i} size="sm" variant={baseIdx===t.i?"default":"ghost"} className="h-7 px-2" onClick={()=>setBaseIdx(t.i)}>{t.label}</Button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowZeros(v=>!v)}>{showZeros ? "Hide 0s" : "Show 0s"}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-3 py-2 text-xs font-semibold">#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold">{gran.replace("_", " / ")}</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">Current</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">Last</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">WoW</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">4W</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">12W</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">Share</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">Δ</th>
                      <th className="text-right px-2 py-2 text-xs font-semibold">Share of Δ</th>
                      {eventMetric !== 'sessions' && <th className="text-right px-2 py-2 text-xs font-semibold">CVR%</th>}
                      <th className="text-right px-3 py-2 text-xs font-semibold">12W trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r, idx) => (
                      <tr key={`cur-${r.key}`} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{idx+1}</td>
                        <td className="px-3 py-2 text-sm">{r.key}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium">{formatNumber(r.current)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatNumber(r.prev)}</td>
                        <td className="px-2 py-2 text-right">{chipEl(r.wow)}</td>
                        <td className="px-2 py-2 text-right">{chipEl(r.w4)}</td>
                        <td className="px-2 py-2 text-right">{chipEl(r.w12)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{(r.share*100).toFixed(1)}%</td>
                        <td className={`px-2 py-2 text-right tabular-nums ${r.delta>=0?"text-emerald-400":"text-rose-400"}`}>{r.delta>=0?"+":""}{formatNumber(Math.abs(r.delta))}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{(r.shareDelta*100).toFixed(1)}%</td>
                        {eventMetric !== 'sessions' && <td className="px-2 py-2 text-right tabular-nums">{r.cvr===null?"—":`${r.cvr.toFixed(1)}%`}</td>}
                        <td className="px-3 py-2 text-right"><Spark values={r.spark} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Top movers attribution */}
      {(() => {
        const movers = Array.from(byKey.entries()).map(([k,v]) => ({ key:k, delta: v.cur - v.prev }))
        const pos = movers.filter(m => m.delta > 0).sort((a,b) => b.delta - a.delta).slice(0, 8)
        const neg = movers.filter(m => m.delta < 0).sort((a,b) => a.delta - b.delta).slice(0, 8)
        const totalDelta = totals.delta
        const Row = ({m}:{m:{key:string,delta:number}}) => (
          <div className="flex items-center justify-between text-xs py-1">
            <span className="truncate max-w-[60%]" title={m.key}>{m.key}</span>
            <div className="flex items-center gap-3">
              <span className={`tabular-nums ${m.delta>=0?"text-emerald-400":"text-rose-400"}`}>{m.delta>=0?"+":""}{formatNumber(Math.abs(m.delta))}</span>
              <span className="tabular-nums text-muted-foreground">{totalDelta!==0?((m.delta/totalDelta)*100).toFixed(1):"0.0"}%</span>
            </div>
          </div>
        )
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Top gains (contribution to change)</CardTitle></CardHeader>
              <CardContent>{pos.length===0? <div className="text-xs text-muted-foreground">No gains</div> : pos.map(m => <Row key={`pos-${m.key}`} m={m} />)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Top drops (contribution to change)</CardTitle></CardHeader>
              <CardContent>{neg.length===0? <div className="text-xs text-muted-foreground">No drops</div> : neg.map(m => <Row key={`neg-${m.key}`} m={m} />)}</CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Event tabs */}
        <div className="flex items-center gap-1 rounded-md border border-border/30 p-1">
          {["sessions","vf_signup","demo_submit"].map((m) => (
            <Button key={m} size="sm" variant={eventMetric === m ? "default" : "ghost"} onClick={() => setEventMetric(m as "sessions" | "vf_signup" | "demo_submit")} className="px-3">
              {m === "sessions" ? "Sessions" : m === "vf_signup" ? "Signups" : "Demos"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Granularity</span>
          <Select value={gran} onValueChange={(v) => setGran(v as Granularity)}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="channel">Channel</SelectItem>
              <SelectItem value="source">Source</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="source_medium">Source / Medium</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
              <SelectItem value="first_source">First user source</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Top</span>
          <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto" />
        <input className="bg-background border px-2 py-1 rounded text-sm" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Chart />

      {/* Removed older weekly-by table in favor of the focused current-week detail table above */}
    </div>
  )
}

