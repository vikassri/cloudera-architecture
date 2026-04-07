import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldOff, AlertCircle, CheckCircle, Info,
  Server, Zap, RefreshCw, GitMerge
} from "lucide-react";

// Reusable info tooltip
function InfoTip({ text }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help flex-shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

const HA_STATUS = {
  full: { icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", label: "Full HA" },
  partial: { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Partial HA" },
  none: { icon: ShieldOff, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "No HA" },
  quorum: { icon: GitMerge, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Quorum-based" },
};

const HA_STATUS_TOOLTIPS = {
  full: "Both an active and a standby instance are running. If the active fails, the standby takes over automatically with no manual action needed.",
  partial: "A backup exists but failover is not fully automatic. Some manual steps or a load balancer may be required to restore service.",
  none: "Only one instance is running. If it fails, the service goes down until someone manually restarts it.",
  quorum: "Multiple instances vote to elect a leader. The cluster can tolerate losing a minority of nodes (e.g. 1 of 3) and keep running.",
};

function HARow({ name, status, active, standby, notes, enabled = true }) {
  const s = HA_STATUS[status] || HA_STATUS.none;
  const Icon = s.icon;
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-b border-border/40 ${!enabled ? "opacity-40" : ""}`}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {!enabled && <Badge variant="outline" className="text-[9px] h-4 px-1">disabled</Badge>}
        </div>
      </td>
      <td className="px-4 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-help ${s.bg} ${s.color} border ${s.border}`}>
              <Icon className="w-3 h-3" />
              {s.label}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-[11px] leading-relaxed">
            {HA_STATUS_TOOLTIPS[status]}
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-foreground">{active}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{standby || "—"}</td>
      <td className="px-5 py-3 text-[11px] text-muted-foreground max-w-xs">{notes}</td>
    </motion.tr>
  );
}

function FailureScenario({ title, impact, recovery, severity }) {
  const colors = { low: "border-green-500/30 bg-green-500/5", medium: "border-amber-500/30 bg-amber-500/5", high: "border-red-500/30 bg-red-500/5" };
  const textColors = { low: "text-green-400", medium: "text-amber-400", high: "text-red-400" };
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${colors[severity]}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${textColors[severity]}`}>{severity} impact</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <p className="text-muted-foreground font-medium mb-1">Impact</p>
          <p className="text-foreground">{impact}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-medium mb-1">Recovery</p>
          <p className="text-foreground">{recovery}</p>
        </div>
      </div>
    </div>
  );
}

export default function HAAnalysisTab({ architecture, config }) {
  const { summary } = architecture;
  const ha = summary.highAvailability;
  const tier = summary.tier;
  const enabled = new Set(architecture.enabledIds);

  const haRows = [
    {
      name: "HDFS NameNode",
      status: ha ? "full" : "none",
      active: "NameNode (Active)",
      standby: ha ? "NameNode (Standby)" : null,
      notes: ha
        ? "Automatic failover via ZooKeeper ZKFC. JournalNodes (3) maintain edit log quorum."
        : "Single NameNode — cluster-wide outage on failure. Enable HA for production.",
    },
    {
      name: "YARN ResourceManager",
      status: ha ? "full" : "none",
      active: "ResourceManager (Active)",
      standby: ha ? "ResourceManager (Standby)" : null,
      notes: ha
        ? "ZooKeeper-based automatic failover. Running apps checkpoint state to ZK."
        : "Single RM — all running jobs fail on RM failure.",
    },
    {
      name: "ZooKeeper",
      status: "quorum",
      active: "3 nodes (quorum)",
      standby: tier === "large" || tier === "xlarge" || tier === "xxlarge" ? "5 nodes available" : null,
      notes: "Quorum of 3 required (tolerates 1 failure). Odd count required. Deploy on dedicated SSDs.",
    },
    {
      name: "HDFS JournalNodes",
      status: ha ? "quorum" : "none",
      active: ha ? "3 nodes (quorum)" : "N/A",
      standby: null,
      notes: ha ? "Quorum of 3 JournalNodes. Tolerates 1 failure. Each on dedicated SSD." : "Not applicable without HDFS HA.",
      enabled: ha,
    },
    {
      name: "HBase Master",
      status: enabled.has("hbase") ? (ha ? "partial" : "none") : "none",
      active: "HBase Master (Active)",
      standby: ha ? "HBase Backup Master" : null,
      notes: "Backup Master takes over automatically. RegionServers are stateless — recover independently via ZK.",
      enabled: enabled.has("hbase"),
    },
    {
      name: "Kudu Master",
      status: enabled.has("kudu") ? "quorum" : "none",
      active: "Kudu Master (Leader)",
      standby: "2× Follower Masters",
      notes: "Raft consensus — 3 masters required (tolerates 1 failure). Leader elected automatically.",
      enabled: enabled.has("kudu"),
    },
    {
      name: "Impala StateStore / Catalog",
      status: enabled.has("impala") ? "partial" : "none",
      active: "StateStore + Catalog",
      standby: "No automatic failover",
      notes: "StateStore failure causes Impalads to operate in degraded mode temporarily. Catalog reconnects. Not a full HA service.",
      enabled: enabled.has("impala"),
    },
    {
      name: "Kafka Brokers",
      status: enabled.has("kafka") ? "full" : "none",
      active: "Partition Leaders (distributed)",
      standby: "Partition Replicas (RF≥3)",
      notes: "Leader election per partition via ZooKeeper/KRaft. Min replication factor 3 for production.",
      enabled: enabled.has("kafka"),
    },
    {
      name: "Ranger Admin",
      status: enabled.has("ranger") ? (ha ? "partial" : "none") : "none",
      active: "Ranger Admin (Active)",
      standby: ha ? "Ranger Admin (Standby)" : null,
      notes: "Load balanced via Knox or external LB. Shared DB backend. Manual failover if no LB.",
      enabled: enabled.has("ranger"),
    },
    {
      name: "Cloudera Manager",
      status: "none",
      active: "CM Server (Single)",
      standby: null,
      notes: "CM itself has no built-in HA. Use OS-level monitoring + auto-restart. Cluster continues operating without CM.",
    },
    {
      name: "NiFi (CFM)",
      status: enabled.has("nifi") ? "quorum" : "none",
      active: "NiFi Cluster (Active-Active)",
      standby: "ZK-coordinated cluster",
      notes: "NiFi clustering via ZooKeeper. All nodes are active. Flow state shared across cluster. Min 3 nodes recommended.",
      enabled: enabled.has("nifi"),
    },
    {
      name: "Schema Registry",
      status: enabled.has("schema_registry") ? "partial" : "none",
      active: "SR Instance 1",
      standby: ha ? "SR Instance 2" : null,
      notes: "Multiple SR instances share the same DB. LB in front recommended for true HA.",
      enabled: enabled.has("schema_registry"),
    },
  ];

  // Dynamic HA score: weighted by service criticality and actual HA status
  const overallScore = (() => {
    // Weighted contributions: [weight, status_value]
    // status_value: full/quorum=1.0, partial=0.5, none=0.0
    const weights = {
      "HDFS NameNode":           { weight: 25 },
      "YARN ResourceManager":    { weight: 20 },
      "ZooKeeper":               { weight: 15 },
      "HDFS JournalNodes":       { weight: 10 },
      "HBase Master":            { weight: 5  },
      "Kudu Master":             { weight: 5  },
      "Impala StateStore / Catalog": { weight: 5 },
      "Kafka Brokers":           { weight: 5  },
      "Ranger Admin":            { weight: 5  },
      "Cloudera Manager":        { weight: 3  },
      "NiFi (CFM)":              { weight: 3  },
      "Schema Registry":         { weight: 2  },
    };
    const statusValue = { full: 1.0, quorum: 1.0, partial: 0.5, none: 0.0 };

    let totalWeight = 0;
    let earnedWeight = 0;

    haRows.forEach(row => {
      if (row.enabled === false) return; // skip disabled services
      const w = weights[row.name];
      if (!w) return;
      totalWeight += w.weight;
      earnedWeight += w.weight * (statusValue[row.status] ?? 0);
    });

    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    if (score >= 85) return { score, label: "Enterprise", color: "text-green-400" };
    if (score >= 70) return { score, label: "Good", color: "text-blue-400" };
    if (score >= 50) return { score, label: "Moderate", color: "text-amber-400" };
    return { score, label: "Basic", color: "text-red-400" };
  })();

  const failureScenarios = [
    {
      title: "Single Worker Node Failure",
      severity: "low",
      impact: "HDFS auto-replicates lost blocks. YARN reschedules containers. Impala/HBase recover automatically.",
      recovery: "Automatic within minutes. No manual intervention needed.",
    },
    {
      title: "Active NameNode Failure (HA enabled)",
      severity: ha ? "low" : "high",
      impact: ha ? "Standby NN promoted automatically. ~30–60s failover window." : "CLUSTER-WIDE OUTAGE — all HDFS I/O stops until NN restarted.",
      recovery: ha ? "Automatic via ZKFC. Re-enable HA after root cause analysis." : "Manual NN restart required. Potential data loss if fsimage corrupt.",
    },
    {
      title: "ZooKeeper Node Failure (1 of 3)",
      severity: "low",
      impact: "Quorum maintained with 2 remaining nodes. No service interruption.",
      recovery: "Automatic. Replace failed ZK host and re-join quorum.",
    },
    {
      title: "Entire Rack Failure",
      severity: "medium",
      impact: "HDFS rack-aware replication ensures blocks survive 1 rack loss. Some blocks may be under-replicated temporarily.",
      recovery: "HDFS auto-re-replicates. Service degraded but operational. Rack-aware config critical.",
    },
    {
      title: "Cloudera Manager Server Failure",
      severity: "low",
      impact: "Cluster continues running. No new deployments, config changes, or monitoring until CM is restored.",
      recovery: "Restart CM service. DB backup critical. Cluster operates independently.",
    },
    {
      title: "NiFi Node Failure (in cluster)",
      severity: enabled.has("nifi") ? "low" : "low",
      impact: enabled.has("nifi") ? "Other NiFi nodes take over active flows via ZK. Minimal data loss if properly configured." : "N/A — NiFi not enabled.",
      recovery: "Automatic flow redistribution. Replace node and re-join cluster.",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              High Availability Analysis
            </h2>
            <p className="text-sm text-muted-foreground">
              Fault tolerance assessment for your cluster configuration. HA mode: <strong>{ha ? "Enabled" : "Disabled"}</strong> · Tier: <strong>{tier.toUpperCase()}</strong>
            </p>
          </div>
{/*           <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0 text-center rounded-2xl border border-border bg-card px-6 py-3 cursor-help">
                <p className="text-[10px] text-muted-foreground">HA Score</p>
                <p className={`text-3xl font-bold font-mono ${overallScore.color}`}>{overallScore.score}</p>
                <p className={`text-[11px] font-semibold ${overallScore.color}`}>{overallScore.label}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-[11px] leading-relaxed space-y-1">
              <p className="font-semibold">How the score is calculated</p>
              <p>Each enabled service is weighted by criticality (HDFS NN = 25pts, YARN RM = 20pts, ZooKeeper = 15pts, etc.). Full HA or quorum = 100%, Partial HA = 50%, No HA = 0%. The score is the weighted average across all active services.</p>
              <p className="pt-1 text-muted-foreground">85–100 = Enterprise · 70–84 = Good · 50–69 = Moderate · &lt;50 = Basic</p>
            </TooltipContent>
          </Tooltip> */}
        </div>

        {/* HA toggle warning */}
        {!ha && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">High Availability is Disabled</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Your cluster has no NameNode or ResourceManager failover. A single node failure will cause a complete cluster outage.
                Enable HA in the sidebar for production workloads.
              </p>
            </div>
          </div>
        )}

        {/* Key HA checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "HDFS HA (ZKFC)", ok: ha, note: ha ? "Active/Standby NameNodes" : "Single NameNode — not HA", tip: "HDFS NameNode HA uses ZooKeeper Failover Controller (ZKFC) to automatically promote the Standby NameNode if the Active one crashes. Without this, any NameNode failure brings down the entire cluster." },
            { label: "YARN HA", ok: ha, note: ha ? "Active/Standby ResourceManagers" : "Single RM — not HA", tip: "YARN ResourceManager manages all compute jobs. HA mode keeps a hot-standby RM that takes over instantly via ZooKeeper. Without HA, all running jobs are lost on RM failure." },
            { label: "ZooKeeper Quorum", ok: true, note: "3-node quorum (1 fault tolerance)", tip: "ZooKeeper is the coordination backbone for HA failover, leader election, and distributed locks. A 3-node quorum can tolerate 1 node failure. Always use an odd number of ZooKeeper nodes." },
            { label: "JournalNode Quorum", ok: ha, note: ha ? "3-node quorum for edit logs" : "Not applicable without HDFS HA", tip: "JournalNodes store the HDFS edit log shared between the Active and Standby NameNodes. They form a quorum — 3 nodes means 1 can fail without losing edit log continuity. Only needed when HDFS HA is enabled." },
            { label: "Kafka Replication", ok: enabled.has("kafka"), note: enabled.has("kafka") ? "RF≥3 recommended" : "Kafka not enabled", tip: "Kafka replicates each topic partition to multiple brokers (Replication Factor). RF=3 means data survives 2 broker failures. Without replication, a broker crash causes data loss for that partition." },
            { label: "NiFi Cluster HA", ok: enabled.has("nifi"), note: enabled.has("nifi") ? "Active-Active NiFi cluster" : "NiFi (CFM) not enabled", tip: "NiFi in cluster mode runs all nodes as active, coordinated via ZooKeeper. If one node goes down, the others continue processing flows automatically. Single-node NiFi is a complete SPOF for data ingestion." },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl border p-3 flex items-start gap-3 ${item.ok ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              {item.ok
                ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <InfoTip text={item.tip} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Service HA table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Service-Level HA Status
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {[
                    { h: "Service", tip: "The Cloudera / Hadoop service being assessed for fault tolerance." },
                    { h: "HA Mode", tip: "Full HA = automatic failover. Quorum = leader election across multiple nodes. Partial HA = backup exists but needs manual steps. No HA = single point of failure." },
                    { h: "Active Role", tip: "The primary instance that handles requests under normal operation." },
                    { h: "Standby / Replica", tip: "The hot-standby or replica that can take over if the active instance fails." },
                    { h: "Notes", tip: "Technical details about how failover works for this service." },
                  ].map(({ h, tip }) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[11px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1">
                        {h}
                        <InfoTip text={tip} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {haRows.map((row, i) => (
                  <HARow key={row.name} {...row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failure scenarios */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Failure Scenario Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {failureScenarios.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <FailureScenario {...s} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Score improvement recommendations */}
        {(() => {
          const statusValue = { full: 1.0, quorum: 1.0, partial: 0.5, none: 0.0 };
          const fixes = haRows
            .filter(row => row.enabled !== false && statusValue[row.status] < 1.0)
            .map(row => ({
              name: row.name,
              status: row.status,
              fix: row.status === "partial"
                ? `Upgrade ${row.name} to full HA (currently partial — no automatic failover).`
                : `Enable HA for ${row.name} — currently a single point of failure.`,
            }));

          if (fixes.length === 0) return (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400 font-semibold">All enabled services are fully HA-configured. No improvements needed.</p>
            </div>
          );

          return (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">How to Improve Your HA Score</h3>
                <span className="text-[10px] text-muted-foreground ml-1">— {fixes.length} issue{fixes.length > 1 ? "s" : ""} found</span>
              </div>
              <div className="divide-y divide-amber-500/10">
                {fixes.map((f, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white ${f.status === "partial" ? "bg-amber-500" : "bg-red-500"}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{f.fix}</p>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${f.status === "partial" ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"}`}>
                      {f.status === "partial" ? "Partial HA" : "No HA"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* HA best practices */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            HA Best Practices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
            <div className="space-y-2">
              <p className="font-semibold text-foreground text-xs">Infrastructure</p>
              {[
                "Deploy ZooKeeper on odd-numbered nodes (3 or 5) with dedicated SSDs",
                "JournalNodes require dedicated SSDs — never co-locate with high I/O",
                "Use RAID 10 on all master/utility node disks",
                "Dual power supplies + dual NIC bonds on all nodes",
                "Spread master nodes across separate physical racks",
              ].map((t, i) => (
                <p key={i} className="flex items-start gap-1.5 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" /> {t}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground text-xs">Software & Configuration</p>
              {[
                "Set dfs.replication=3 and verify dfs.replication.min=2",
                "Configure HDFS rack topology for cross-rack block placement",
                "Enable ZKFC fencing (SSH or PowerFencing) to prevent split-brain",
                "Set yarn.resourcemanager.recovery.enabled=true for job recovery",
                "Test failover quarterly using Manual Failover commands",
                "Enable Kafka min.insync.replicas=2 for critical topics",
              ].map((t, i) => (
                <p key={i} className="flex items-start gap-1.5 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" /> {t}
                </p>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-4">
          Based on Cloudera CDP Private Cloud Base 7.3 HA configuration guidelines.
        </p>
      </div>
    </ScrollArea>
    </TooltipProvider>
  );
}