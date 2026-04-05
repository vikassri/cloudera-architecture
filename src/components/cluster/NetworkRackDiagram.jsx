import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Network, Server, Router, Wifi } from "lucide-react";

const RACK_COLORS = [
  "border-blue-500/40 bg-blue-500/5",
  "border-purple-500/40 bg-purple-500/5",
  "border-emerald-500/40 bg-emerald-500/5",
  "border-amber-500/40 bg-amber-500/5",
  "border-rose-500/40 bg-rose-500/5",
  "border-cyan-500/40 bg-cyan-500/5",
];

const NODE_TYPE_STYLE = {
  master:  { bg: "bg-blue-500", text: "text-blue-300", label: "M" },
  utility: { bg: "bg-purple-500", text: "text-purple-300", label: "U" },
  gateway: { bg: "bg-emerald-500", text: "text-emerald-300", label: "G" },
  worker:  { bg: "bg-amber-500", text: "text-amber-300", label: "W" },
};

function RackUnit({ node, rackIndex }) {
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

function Rack({ title, nodes, index, rackIndex }) {
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
          <RackUnit key={node.name + i} node={node} rackIndex={rackIndex} />
        ))}
      </div>
    </motion.div>
  );
}

export default function NetworkRackDiagram({ architecture, config }) {
  const { masters, utilities, gateways, workers, workerCount, summary } = architecture;
  const rackCount = config.rackCount || 1;

  // Distribute all nodes across racks
  const allNodes = useMemo(() => {
    const wDisplay = workers.slice(0, 8);
    if (workerCount > 8) {
      wDisplay.push({ name: `+${workerCount - 8} more workers`, type: "worker" });
    }
    return [
      ...masters.map(n => ({ ...n })),
      ...utilities.map(n => ({ ...n })),
      ...gateways.map(n => ({ ...n })),
      ...wDisplay,
    ];
  }, [masters, utilities, gateways, workers, workerCount]);

  // Distribute into racks
  const racks = useMemo(() => {
    const r = Array.from({ length: rackCount }, (_, i) => ({
      title: `Rack ${String(i + 1).padStart(2, "0")}`,
      nodes: [],
    }));
    allNodes.forEach((node, i) => {
      r[i % rackCount].nodes.push(node);
    });
    return r.filter(r => r.nodes.length > 0);
  }, [allNodes, rackCount]);

  const nodesPerRack = Math.ceil(allNodes.length / rackCount);
  const networkBW = config.nodeSize?.includes("nvme") || config.nodeSize?.includes("96nvme") ? "25GbE" : "10GbE";

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
            {/* Top-level: Core switch */}
            <div className="flex flex-col items-center gap-0">
              <div className="rounded-xl border-2 border-primary/40 bg-primary/10 px-6 py-3 flex items-center gap-3">
                <Router className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">Core Switch (L3)</p>
                  <p className="text-[10px] text-muted-foreground">40/100 GbE Uplinks — Data Center Fabric</p>
                </div>
              </div>
              <div className="w-px h-6 bg-border" />

              {/* Aggregation */}
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center gap-0">
                  <div className="w-px h-4 bg-border" />
                  <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-400">Aggregation Switch</p>
                    <p className="text-[10px] text-muted-foreground">10/25 GbE per rack</p>
                  </div>
                  <div className="w-px h-4 bg-border" />

                  {/* ToR switches */}
                  <div className="flex gap-3">
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
                          {rack.nodes.length} servers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network specs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Nodes", value: summary.totalNodes, color: "text-foreground" },
            { label: "Racks", value: racks.length, color: "text-blue-400" },
            { label: "Nodes / Rack", value: `~${nodesPerRack}`, color: "text-purple-400" },
            { label: "Node Network", value: networkBW, color: "text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
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
          <h3 className="text-sm font-semibold">Physical Rack Layout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {racks.map((rack, i) => (
              <Rack key={rack.title} title={rack.title} nodes={rack.nodes} index={i} rackIndex={i} />
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