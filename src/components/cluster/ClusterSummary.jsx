import React from "react";
import { motion } from "framer-motion";
import { Server, HardDrive, Cpu, Database, Shield, Layers, Disc } from "lucide-react";

function fmtTB(tb) {
  const n = parseFloat(tb);
  if (n >= 1000) return `${(n / 1000).toFixed(1)} PB`;
  return `${n} TB`;
}

export default function ClusterSummary({ summary }) {
  if (!summary) return null;

  // utilization is now capped at 75% by design (cluster sized for 1Y, today always ≤ 75%)
  const utilColor = summary.utilizationPct >= 75 ? "text-amber-400" : summary.utilizationPct > 50 ? "text-blue-400" : "text-green-400";
  // requiredRawTB = effectiveTB × replicationOverhead / 0.75 = correct "needed raw for today's data"
  // rawTotalTB = actual cluster physical capacity
  const stats = [
    { label: "Total Nodes", value: summary.totalNodes, icon: Server, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Masters", value: summary.masterCount, icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Utilities", value: summary.utilityCount, icon: Layers, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Workers", value: summary.workerCount, icon: Server, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Raw / Worker", value: `${summary.rawPerWorkerTB} TB`, icon: HardDrive, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Cluster Capacity", value: fmtTB(summary.rawTotalTB), icon: Disc, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Req. Raw (today)", value: fmtTB(summary.requiredRawTB), icon: Database, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Today's Util", value: `${summary.utilizationPct}%`, icon: Cpu, color: utilColor, bg: "bg-muted" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl bg-card border border-border p-3 space-y-1"
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-md ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-3 h-3 ${s.color}`} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate">{s.label}</span>
          </div>
          <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}