import React, { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Network, Server, Router, Wifi, CheckCircle2, AlertTriangle } from "lucide-react";

const RACK_COLORS = [
  "border-blue-500/40 bg-blue-500/5",
  "border-purple-500/40 bg-purple-500/5",
  "border-emerald-500/40 bg-emerald-500/5",
  "border-amber-500/40 bg-amber-500/5",
  "border-rose-500/40 bg-rose-500/5",
  "border-cyan-500/40 bg-cyan-500/5",
];

const NODE_TYPE_STYLE = {
  master:  { bg: "bg-blue-500",   text: "text-blue-300",   label: "M" },
  utility: { bg: "bg-purple-500", text: "text-purple-300", label: "U" },
  gateway: { bg: "bg-emerald-500",text: "text-emerald-300",label: "G" },
  ingest:  { bg: "bg-teal-500",   text: "text-teal-300",   label: "I" },
  worker:  { bg: "bg-amber-500",  text: "text-amber-300",  label: "W" },
};

function RackUnit({ node }) {
  const s = NODE_TYPE_STYLE[node.type] || NODE_TYPE_STYLE.worker;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 bg-background/60 border border-border rounded px-2 py-1"
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white ${s.bg}`}>
        {s.label}
      </div>
      <span className="text-[10px] text-foreground truncate flex-1">{node.name}</span>
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[9px] text-muted-foreground">1U</span>
      </div>
    </motion.div>
  );
}

function Rack({ title, nodes, index, rackIndex, workersInRack, totalWorkers }) {
  const colorClass = RACK_COLORS[rackIndex % RACK_COLORS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border-2 ${colorClass} flex flex-col overflow-hidden`}
    >
      {/* Rack header */}
      <div className="px-3 py-2 bg-black/10 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-bold tracking-tight">{title}</span>
        </div>
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{nodes.length}U</Badge>
      </div>
      {/* Patch panel */}
      <div className="px-3 py-1.5 border-b border-border/30 bg-slate-900/20">
        <div className="flex gap-0.5 flex-wrap">
          {Array.from({ length: Math.min(nodes.length, 24) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-80" />
          ))}
        </div>
        <p className="text-[8px] text-muted-foreground mt-0.5">Patch Panel / Top-of-Rack Switch</p>
      </div>
      {/* Nodes */}
      <div className="p-2 space-y-1.5 flex-1">
        {nodes.map((node, i) => (
          <RackUnit key={node.name + i} node={node} />
        ))}
        {/* Worker summary if overflow */}
        {workersInRack > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
            <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white bg-amber-500">W</div>
            <span className="text-[10px] text-amber-300 font-medium">{workersInRack} Worker{workersInRack > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Recommended rack count logic
function getRecommendedRackCount(workerCount, masterCount, utilityCount, gatewayCount) {
  const totalNonWorker = masterCount + utilityCount + gatewayCount;
  // Ideal: ~16–20 nodes per rack, workers evenly distributed
  const totalNodes = totalNonWorker + workerCount;
  const ideal = Math.max(1, Math.ceil(totalNodes / 18));
  return ideal;
}

// Build comparison rows for different rack counts
function buildRackComparison(workerCount, masterCount, utilityCount, gatewayCount) {
  const totalNonWorker = masterCount + utilityCount + gatewayCount;
  const maxRacks = Math.min(10, workerCount);
  const rows = [];
  for (let r = 1; r <= maxRacks; r++) {
    const workersPerRack = workerCount / r;
    const totalNodes = totalNonWorker + workerCount;
    const nodesPerRack = Math.ceil(totalNodes / r);
    const balanced = workerCount % r === 0;
    rows.push({ racks: r, workersPerRack: Math.ceil(workersPerRack), nodesPerRack, balanced });
  }
  return rows;
}

export default function NetworkRackDiagram({ architecture, config }) {
  const { masters, utilities, gateways, ingestNodes = [], workers, workerCount, summary } = architecture;
  const rackCount = config.rackCount || 1;

  const masterCount = masters.length;
  const utilityCount = utilities.length;
  const gatewayCount = gateways.length;

  const recommendedRacks = getRecommendedRackCount(workerCount, masterCount, utilityCount, gatewayCount);

  // Non-worker nodes (displayed as individual units)
  const nonWorkerNodes = useMemo(() => [
    ...masters.map(n => ({ ...n })),
    ...utilities.map(n => ({ ...n })),
    ...gateways.map(n => ({ ...n })),
    ...ingestNodes.map(n => ({ ...n })),
  ], [masters, utilities, gateways, ingestNodes]);

  // Distribute racks: non-workers go into rack 0 primarily, workers spread EQUALLY
  const racks = useMemo(() => {
    const r = Array.from({ length: rackCount }, (_, i) => ({
      title: `Rack ${String(i + 1).padStart(2, "0")}`,
      nodes: [],
      workersInRack: 0,
    }));

    // Place non-worker nodes round-robin across racks
    nonWorkerNodes.forEach((node, i) => {
      r[i % rackCount].nodes.push(node);
    });

    // Workers distributed EQUALLY across racks
    const workersPerRack = Math.floor(workerCount / rackCount);
    const remainder = workerCount % rackCount;
    for (let i = 0; i < rackCount; i++) {
      r[i].workersInRack = workersPerRack + (i < remainder ? 1 : 0);
    }

    return r.filter(rack => rack.nodes.length > 0 || rack.workersInRack > 0);
  }, [nonWorkerNodes, workerCount, rackCount]);

  const networkBW = config.nodeSize?.includes("96nvme") ? "25GbE" : "10GbE";
  const comparisonRows = buildRackComparison(workerCount, masterCount, utilityCount, gatewayCount);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            Full Architecture — Network & Rack Topology
          </h2>
          <p className="text-sm text-muted-foreground">
            Physical rack layout and network topology for your cluster. Configure racks in the sidebar.
          </p>
        </div>

        {/* Network topology summary */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Router className="w-4 h-4 text-primary" />
              Network Architecture
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-col items-center gap-0">
              <div className="rounded-xl border-2 border-primary/40 bg-primary/10 px-6 py-3 flex items-center gap-3">
                <Router className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">Core Switch (L3)</p>
                  <p className="text-[10px] text-muted-foreground">40/100 GbE Uplinks — Data Center Fabric</p>
                </div>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-0">
                  <div className="w-px h-4 bg-border" />
                  <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-400">Aggregation Switch</p>
                    <p className="text-[10px] text-muted-foreground">10/25 GbE per rack</p>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex gap-3 flex-wrap justify-center">
                    {racks.map((rack, i) => (
                      <div key={i} className="flex flex-col items-center gap-0">
                        <div className="w-px h-3 bg-border" />
                        <div className={`rounded border px-2 py-1 text-center ${RACK_COLORS[i % RACK_COLORS.length]}`}>
                          <p className="text-[10px] font-semibold">{rack.title}</p>
                          <p className="text-[9px] text-muted-foreground">ToR Switch</p>
                          <p className="text-[9px] text-muted-foreground">{networkBW}</p>
                        </div>
                        <div className="w-px h-3 bg-border" />
                        <div className="text-[9px] text-muted-foreground text-center">
                          {rack.nodes.length + rack.workersInRack} servers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network specs + rack recommendation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Nodes", value: summary.totalNodes + workerCount - (workers.length), color: "text-foreground" },
            { label: "Configured Racks", value: rackCount, color: "text-blue-400" },
            { label: "Recommended Racks", value: recommendedRacks, color: rackCount === recommendedRacks ? "text-emerald-400" : "text-amber-400" },
            { label: "Workers / Rack", value: `${Math.floor(workerCount / rackCount)}–${Math.ceil(workerCount / rackCount)}`, color: "text-amber-400" },
            { label: "Node Network", value: networkBW, color: "text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Rack comparison model */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Rack Count Comparison Model</h3>
            <span className="text-[10px] text-muted-foreground ml-2">— Workers distributed equally per rack</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Racks", "Workers / Rack", "Total Nodes / Rack", "Balanced?", "Notes"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => {
                  const isSelected = row.racks === rackCount;
                  const isRecommended = row.racks === recommendedRacks;
                  return (
                    <tr key={row.racks}
                      className={`border-b border-border/50 ${isSelected ? "bg-primary/10" : "hover:bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-mono font-bold">
                        <span className={isSelected ? "text-primary" : ""}>{row.racks}</span>
                        {isSelected && <Badge className="ml-2 text-[9px] h-4 px-1.5 bg-primary">selected</Badge>}
                        {isRecommended && !isSelected && <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1.5 text-emerald-400 border-emerald-400/40">recommended</Badge>}
                        {isRecommended && isSelected && <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1.5 text-emerald-400 border-emerald-400/40">✓ rec.</Badge>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-amber-400">{row.workersPerRack}</td>
                      <td className="px-4 py-2.5 font-mono">{row.nodesPerRack}</td>
                      <td className="px-4 py-2.5">
                        {row.balanced
                          ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Even split</span>
                          : <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> ±1 node</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {row.racks === 1 && "No rack fault tolerance"}
                        {row.racks === 2 && "Minimum HA rack spread"}
                        {row.racks === 3 && "Good balance + rack awareness"}
                        {row.racks >= 4 && row.racks <= 6 && "Good for large clusters"}
                        {row.racks > 6 && "Consider network complexity"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Network recommendations */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            Network Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-muted-foreground">
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground text-xs">Worker / DataNodes</p>
              <p>• 10 GbE minimum; 25 GbE for high-throughput</p>
              <p>• Dual bonded NICs for redundancy</p>
              <p>• Dedicated storage network recommended for large clusters</p>
              <p>• Ozone: network must support full disk bandwidth (no &gt;2:1 oversubscription)</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground text-xs">Master / Utility Nodes</p>
              <p>• 10/25 GbE dual bonded NICs</p>
              <p>• Dual power supplies + dual Ethernet cards</p>
              <p>• Masters configured with RAID 10 for storage reliability</p>
              <p>• JournalNodes: low-latency network critical for HDFS HA</p>
            </div>
          </div>
        </div>

        {/* Rack diagram */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Physical Rack Layout — {rackCount} Rack{rackCount > 1 ? "s" : ""} · {workerCount} Workers distributed equally ({Math.floor(workerCount / rackCount)}–{Math.ceil(workerCount / rackCount)} per rack)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {racks.map((rack, i) => (
              <Rack key={rack.title} title={rack.title} nodes={rack.nodes}
                index={i} rackIndex={i} workersInRack={rack.workersInRack} totalWorkers={workerCount} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[11px]">
          {Object.entries(NODE_TYPE_STYLE).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white ${s.bg}`}>{s.label}</div>
              <span className="capitalize text-muted-foreground">{type} Host</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Based on Cloudera CDP Private Cloud Base 7.3 network and hardware recommendations.
        </p>
      </div>
    </ScrollArea>
  );
}