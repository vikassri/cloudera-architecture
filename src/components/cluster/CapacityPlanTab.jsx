import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Server, HardDrive, Database, Layers } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

function fmtTB(tb) {
  const n = parseFloat(tb);
  if (n >= 1000) return `${(n / 1000).toFixed(2)} PB`;
  return `${n.toFixed(1)} TB`;
}

const YEAR_COLORS = {
  "1Y": { stroke: "#60a5fa", fill: "#60a5fa" },
  "3Y": { stroke: "#a78bfa", fill: "#a78bfa" },
  "5Y": { stroke: "#f59e0b", fill: "#f59e0b" },
};

function PlanCard({ plan, color, config, overhead }) {
  const borderColors = { "1Y": "border-blue-500/40", "3Y": "border-violet-500/40", "5Y": "border-amber-500/40" };
  const bgColors = { "1Y": "bg-blue-500/5", "3Y": "bg-violet-500/5", "5Y": "bg-amber-500/5" };
  const textColors = { "1Y": "text-blue-400", "3Y": "text-violet-400", "5Y": "text-amber-400" };

  const label = `${plan.years} Year${plan.years > 1 ? "s" : ""}`;
  const rawPW = ((config.diskCount || 12) * (config.diskSizeGB || 8000)) / 1024;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: plan.years * 0.1 }}
      className={`rounded-2xl border-2 ${borderColors[`${plan.years}Y`]} ${bgColors[`${plan.years}Y`]} p-5 space-y-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className={`w-5 h-5 ${textColors[`${plan.years}Y`]}`} />
          <h3 className={`text-base font-bold ${textColors[`${plan.years}Y`]}`}>{label} Forecast</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${borderColors[`${plan.years}Y`]} ${textColors[`${plan.years}Y`]} font-mono`}>
          +{plan.years * 365}d
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Raw Data Volume", value: fmtTB(plan.totalDataTB), icon: Database, note: "Before compression" },
          { label: "Effective (compressed)", value: fmtTB(plan.effectiveTB), icon: Layers, note: `÷ ${config.compressionRatio || 1}× ratio` },
          { label: "Required Raw Storage", value: fmtTB(plan.requiredRaw), icon: HardDrive, note: `${overhead}× replication + 25% overhead` },
          { label: "Worker Nodes Needed", value: `${plan.neededWorkers}`, icon: Server, note: `${rawPW.toFixed(1)} TB raw each` },
        ].map((s, i) => (
          <div key={i} className="rounded-xl bg-background/60 border border-border p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <s.icon className={`w-3 h-3 ${textColors[`${plan.years}Y`]}`} />
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono ${textColors[`${plan.years}Y`]}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function CapacityPlanTab({ config, capacityPlan }) {
  const { plan1Y, plan3Y, plan5Y, rawPerNodeTB, compressionRatio, dailyGrowthTB, replicationOverhead, ecPolicy, erasureCoding } = capacityPlan;

  // Build chart data — monthly points for 5 years
  const chartData = [];
  const monthlyGrowthTB = parseFloat(dailyGrowthTB) * 30;
  const overhead = replicationOverhead || 3;
  for (let m = 0; m <= 60; m++) {
    const totalRaw = config.dataSize + monthlyGrowthTB * m;
    const effective = totalRaw / (compressionRatio || 1);
    const requiredRaw = (effective * overhead) / 0.75;
    const workers = Math.ceil(requiredRaw / parseFloat(rawPerNodeTB));
    chartData.push({
      month: m,
      label: m % 12 === 0 ? `Y${m / 12}` : m === 60 ? "Y5" : "",
      rawData: parseFloat(totalRaw.toFixed(1)),
      requiredRaw: parseFloat(requiredRaw.toFixed(1)),
      workers,
    });
  }

  // Capacity limit line (current cluster raw)
  const currentWorkers = Math.max(plan1Y.neededWorkers, 3);
  const currentCapacity = currentWorkers * parseFloat(rawPerNodeTB);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="rounded-lg bg-card border border-border p-3 text-[11px] shadow-lg space-y-1">
        <p className="font-bold text-foreground">Month {d.month} {d.month > 0 ? `(+${Math.round(d.month / 12 * 10) / 10}Y)` : "(Today)"}</p>
        <p className="text-blue-400">Raw Data: {fmtTB(d.rawData)}</p>
        <p className="text-amber-400">Required Raw: {fmtTB(d.requiredRaw)}</p>
        <p className="text-emerald-400">Workers: {d.workers}</p>
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Capacity Planning
          </h2>
          <p className="text-sm text-muted-foreground">
            Projected storage growth over 1, 3, and 5 years. 75% util cap · {compressionRatio}× compression · {erasureCoding ? ecPolicy?.label : "3× Replication"}
          </p>
        </div>

        {/* Assumptions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Starting Data", value: fmtTB(config.dataSize), color: "text-foreground" },
            { label: "Daily Ingest", value: `${config.dailyGrowthGB || 0} GB/day`, color: "text-blue-400" },
            { label: "Compression", value: `${compressionRatio}×`, color: "text-emerald-400" },
            { label: "Storage Overhead", value: erasureCoding ? `${overhead}×` : "3× repl", color: "text-amber-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Growth chart */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold">5-Year Storage Growth Projection</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="rawGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month"
                  tickFormatter={(v) => v % 12 === 0 ? `Y${v / 12}` : ""}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}P` : `${v}T`}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={currentCapacity} stroke="#22c55e" strokeDasharray="6 3"
                  label={{ value: "Current capacity", position: "insideTopRight", fontSize: 10, fill: "#22c55e" }} />
                <Area type="monotone" dataKey="rawData" name="Raw Data (TB)" stroke="#60a5fa" fill="url(#rawGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="requiredRaw" name="Required Raw (TB)" stroke="#f59e0b" fill="url(#reqGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Green dashed line = current cluster raw capacity (sized for Year 1)</p>
        </div>

        {/* 1Y / 3Y / 5Y cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PlanCard plan={plan1Y} config={config} overhead={overhead} />
          <PlanCard plan={plan3Y} config={config} overhead={overhead} />
          <PlanCard plan={plan5Y} config={config} overhead={overhead} />
        </div>

        {/* Worker growth table */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Node Count Growth Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Horizon", "Raw Data", "Effective", "Required Raw", "Worker Nodes", "∆ vs Today"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Year 1", plan: plan1Y, color: "text-blue-400" },
                  { label: "Year 3", plan: plan3Y, color: "text-violet-400" },
                  { label: "Year 5", plan: plan5Y, color: "text-amber-400" },
                ].map((row, i, arr) => {
                  const delta = i === 0 ? 0 : row.plan.neededWorkers - arr[0].plan.neededWorkers;
                  return (
                    <tr key={row.label} className="border-b border-border/50 hover:bg-muted/20">
                      <td className={`px-4 py-2.5 font-semibold ${row.color}`}>{row.label}</td>
                      <td className="px-4 py-2.5 font-mono">{fmtTB(row.plan.totalDataTB)}</td>
                      <td className="px-4 py-2.5 font-mono text-emerald-400">{fmtTB(row.plan.effectiveTB)}</td>
                      <td className="px-4 py-2.5 font-mono text-amber-400">{fmtTB(row.plan.requiredRaw)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold">{row.plan.neededWorkers}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{delta > 0 ? `+${delta}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}