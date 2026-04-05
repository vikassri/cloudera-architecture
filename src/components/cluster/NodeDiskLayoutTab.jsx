import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { LayoutGrid, HardDrive, AlertCircle, CheckCircle, Info } from "lucide-react";
import { NODE_PRESETS } from "@/lib/clusterConfig";

// Disk slot visual component
function DiskSlot({ disk, index }) {
  const typeColors = {
    "SSD": "bg-blue-500",
    "NVMe": "bg-purple-500",
    "HDD": "bg-amber-600",
    "HDD (JBOD)": "bg-amber-600",
    "None": "bg-muted border-dashed",
  };
  const bg = typeColors[disk.type] || "bg-slate-500";
  const isEmpty = disk.type === "None";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        title={`Slot ${index + 1}: ${disk.label}`}
        className={`w-10 h-14 rounded border-2 ${isEmpty ? "border-border border-dashed bg-muted/20" : `${bg}/20 border-current`} flex flex-col items-center justify-center cursor-default relative group`}
        style={isEmpty ? {} : { borderColor: `var(--slot-color)` }}
      >
        <div className={`w-6 h-6 rounded-sm ${isEmpty ? "bg-muted/30" : `${bg}`} flex items-center justify-center`}>
          {!isEmpty && <HardDrive className="w-3 h-3 text-white" />}
        </div>
        <span className="text-[8px] text-muted-foreground mt-0.5 font-mono">{isEmpty ? "—" : disk.sizeLabel}</span>
        {/* Tooltip */}
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg">
          <p className="font-semibold">{disk.label}</p>
          <p className="text-muted-foreground">{disk.mount}</p>
          <p className="text-muted-foreground">{disk.type}</p>
        </div>
      </div>
      <span className="text-[8px] text-muted-foreground font-mono">{index + 1}</span>
    </div>
  );
}

function DiskLegend({ items }) {
  const colors = { SSD: "bg-blue-500", NVMe: "bg-purple-500", HDD: "bg-amber-600", "HDD (JBOD)": "bg-amber-600" };
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(item => (
        <div key={item} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className={`w-3 h-3 rounded-sm ${colors[item] || "bg-slate-500"}`} />
          {item}
        </div>
      ))}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <div className="w-3 h-3 rounded-sm border border-dashed border-border bg-muted/30" />
        Empty Slot
      </div>
    </div>
  );
}

function NodeDiskDiagram({ title, color, disks, notes, slots = 24 }) {
  // Pad to slots
  const padded = [...disks];
  while (padded.length < slots) padded.push({ label: "Empty", type: "None", mount: "—", sizeLabel: "" });

  return (
    <div className={`rounded-2xl border ${color.border} ${color.bg} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${color.text}`}>{title}</h3>
        <Badge variant="outline" className="text-[10px]">{disks.length} disk{disks.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Disk bay grid (simulates 2U/4U server bay) */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Front Bay (Disk Slots)</p>
        <div className="flex flex-wrap gap-1.5 p-3 bg-black/20 rounded-xl border border-black/10">
          {padded.map((disk, i) => (
            <DiskSlot key={i} disk={disk} index={i} />
          ))}
        </div>
      </div>

      {/* Partition / mount table */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Disk Assignments</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Slot(s)</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Size</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Mount / Purpose</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">FS</th>
              </tr>
            </thead>
            <tbody>
              {disks.map((disk, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-mono text-foreground">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${
                      disk.type === "SSD" ? "bg-blue-500" :
                      disk.type === "NVMe" ? "bg-purple-500" :
                      disk.type === "HDD" || disk.type === "HDD (JBOD)" ? "bg-amber-600" :
                      "bg-slate-500"
                    }`}>{disk.type}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{disk.sizeLabel}</td>
                  <td className="px-3 py-1.5 text-foreground">{disk.label} <span className="text-muted-foreground font-mono text-[10px]">{disk.mount !== "—" ? disk.mount : ""}</span></td>
                  <td className="px-3 py-1.5 text-muted-foreground">{disk.fs || "xfs"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {notes?.length > 0 && (
        <div className="space-y-1">
          {notes.map((n, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" /> {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NodeDiskLayoutTab({ config, architecture }) {
  const { summary } = architecture;
  const preset = NODE_PRESETS[config.nodeSize] || NODE_PRESETS.d96;
  const diskCount = config.diskCount || preset.diskCount;
  const diskGB = config.diskSizeGB || preset.diskSizeGB;
  const diskTBLabel = diskGB >= 1000 ? `${(diskGB / 1000).toFixed(0)}TB` : `${diskGB}GB`;
  const ha = summary.highAvailability;
  const enabled = new Set(architecture.enabledIds);

  // ──── MASTER NODE DISK LAYOUT ────
  const masterDisks = [
    { label: "OS / Root + Swap", type: "SSD", sizeLabel: "480GB", mount: "/  /swap", fs: "xfs" },
    { label: "OS Mirror (RAID 1 pair)", type: "SSD", sizeLabel: "480GB", mount: "RAID1 pair", fs: "xfs" },
    { label: "NameNode FSImage + Edits", type: "SSD", sizeLabel: "1TB", mount: "/dfs/nn", fs: "xfs" },
    ...(ha ? [{ label: "JournalNode Edits (dedicated)", type: "SSD", sizeLabel: "1TB", mount: "/dfs/jn", fs: "xfs" }] : []),
    ...(enabled.has("zookeeper") ? [{ label: "ZooKeeper Data (dedicated)", type: "SSD", sizeLabel: "500GB", mount: "/var/lib/zookeeper", fs: "xfs" }] : []),
    ...(enabled.has("kudu") ? [
      { label: "Kudu Master Data", type: "SSD", sizeLabel: "500GB", mount: "/var/lib/kudu/master", fs: "xfs" },
      { label: "Kudu Master WAL (dedicated)", type: "SSD", sizeLabel: "500GB", mount: "/var/lib/kudu/master-wal", fs: "xfs" },
    ] : []),
  ];

  // ──── UTILITY NODE DISK LAYOUT ────
  const utilityDisks = [
    { label: "OS / Root + Swap", type: "SSD", sizeLabel: "480GB", mount: "/  /swap", fs: "xfs" },
    { label: "OS Mirror (RAID 1)", type: "SSD", sizeLabel: "480GB", mount: "RAID1 pair", fs: "xfs" },
    { label: "Cloudera Manager DB / Logs", type: "SSD", sizeLabel: "1TB", mount: "/var/lib/cloudera-scm-server", fs: "xfs" },
    { label: "CM Heap & Temp", type: "SSD", sizeLabel: "500GB", mount: "/tmp  /opt/cloudera", fs: "xfs" },
    ...(enabled.has("hive") ? [{ label: "Hive Metastore Scratch", type: "SSD", sizeLabel: "500GB", mount: "/var/lib/hive", fs: "xfs" }] : []),
  ];

  // ──── WORKER NODE DISK LAYOUT ────
  const workerDisks = [
    { label: "OS / Root + Swap", type: "SSD", sizeLabel: "480GB", mount: "/  /swap", fs: "xfs" },
    { label: "OS Mirror (RAID 1)", type: "SSD", sizeLabel: "480GB", mount: "RAID1 pair", fs: "xfs" },
    ...(enabled.has("kudu") ? [{ label: "Kudu Tablet WAL (dedicated SSD)", type: "SSD", sizeLabel: "500GB", mount: "/data/kudu-wal", fs: "xfs" }] : []),
    ...Array.from({ length: diskCount }, (_, i) => ({
      label: `HDFS Data Disk ${i + 1}${enabled.has("kudu") ? " + Kudu Data" : ""}`,
      type: "HDD (JBOD)",
      sizeLabel: diskTBLabel,
      mount: `/grid/${i}`,
      fs: "xfs",
    })),
  ];

  // ──── GATEWAY NODE DISK LAYOUT ────
  const gatewayDisks = [
    { label: "OS / Root + Swap", type: "SSD", sizeLabel: "480GB", mount: "/  /swap", fs: "xfs" },
    { label: "OS Mirror (RAID 1)", type: "SSD", sizeLabel: "480GB", mount: "RAID1 pair", fs: "xfs" },
    { label: "Hue / Knox Logs & Scratch", type: "SSD", sizeLabel: "500GB", mount: "/var/log  /tmp", fs: "xfs" },
  ];

  // ──── CFM / NIFI NODE DISK LAYOUT ────
  const nifiDisks = enabled.has("nifi") ? [
    { label: "OS / Root + Swap", type: "SSD", sizeLabel: "480GB", mount: "/  /swap", fs: "xfs" },
    { label: "OS Mirror (RAID 1)", type: "SSD", sizeLabel: "480GB", mount: "RAID1 pair", fs: "xfs" },
    { label: "NiFi Content Repository", type: "SSD", sizeLabel: "1TB", mount: "/data/nifi/content", fs: "xfs" },
    { label: "NiFi FlowFile Repository", type: "SSD", sizeLabel: "500GB", mount: "/data/nifi/flowfile", fs: "xfs" },
    { label: "NiFi Provenance Repository 1", type: "HDD", sizeLabel: "4TB", mount: "/data/nifi/provenance/1", fs: "xfs" },
    { label: "NiFi Provenance Repository 2", type: "HDD", sizeLabel: "4TB", mount: "/data/nifi/provenance/2", fs: "xfs" },
  ] : [];

  const nodeTypes = [
    {
      key: "master",
      title: `Master Node Disk Layout (×${summary.masterCount})`,
      disks: masterDisks,
      color: { text: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/30" },
      slots: 12,
      notes: [
        "All master node disks should be configured as RAID 10 for maximum reliability.",
        "NameNode fsimage grows at ~1 GB per million HDFS files — size accordingly.",
        ha ? "JournalNode disk MUST be dedicated — never share with other services." : "Enable HA to add JournalNode dedicated disk.",
        "ZooKeeper requires dedicated SSD with low-latency I/O — critical for cluster coordination.",
      ],
    },
    {
      key: "utility",
      title: `Utility Node Disk Layout (×${summary.utilityCount})`,
      disks: utilityDisks,
      color: { text: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/30" },
      slots: 8,
      notes: [
        "Utility nodes should use RAID 10 or RAID 5 for OS and application disks.",
        "Cloudera Manager requires reliable fast storage — SSD strongly recommended.",
        "Allocate at least 500 GB for CM heap, temp, and log storage.",
      ],
    },
    {
      key: "worker",
      title: `Worker Node Disk Layout (×${summary.workerCount}) — ${diskCount}×${diskTBLabel} per node`,
      disks: workerDisks,
      color: { text: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/30" },
      slots: diskCount + 3,
      notes: [
        `HDFS DataNode disks use JBOD (no RAID) — HDFS 3× replication provides redundancy.`,
        `Each data disk is mounted independently at /grid/0 through /grid/${diskCount - 1}.`,
        "OS disks should be mirrored (RAID 1) — separate from data disks.",
        enabled.has("kudu") ? "Kudu Tablet Server shares data disks with HDFS. WAL on dedicated SSD." : "",
        "XFS filesystem recommended for all Hadoop data partitions.",
        `Total raw per node: ${diskCount}×${diskTBLabel} = ${((diskCount * (config.diskSizeGB || 8000)) / 1024).toFixed(1)} TB`,
      ].filter(Boolean),
    },
    ...(summary.gatewayCount > 0 ? [{
      key: "gateway",
      title: `Gateway/Edge Node Disk Layout (×${summary.gatewayCount})`,
      disks: gatewayDisks,
      color: { text: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/30" },
      slots: 6,
      notes: [
        "Gateway nodes are lightweight — focus on network bandwidth not storage.",
        "SSD for OS gives fast startup for Hue, Knox, and HiveServer2.",
      ],
    }] : []),
    ...(enabled.has("nifi") && nifiDisks.length > 0 ? [{
      key: "nifi",
      title: `CFM/NiFi Ingest Node Disk Layout (×${summary.ingestCount || 1})`,
      disks: nifiDisks,
      color: { text: "text-green-400", bg: "bg-green-500/5", border: "border-green-500/30" },
      slots: 8,
      notes: [
        "NiFi Content and FlowFile repositories MUST be on fast SSD — critical for performance.",
        "Provenance repositories can use HDD but benefit from SSD for faster lineage queries.",
        "Separate disks for Content, FlowFile, and Provenance repos prevents I/O contention.",
        "NiFi is I/O intensive — avoid co-location with other high-I/O services.",
      ],
    }] : []),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Node Disk Layout
          </h2>
          <p className="text-sm text-muted-foreground">
            Per-node disk layout based on Cloudera CDP Reference Architecture. Worker preset: <span className="font-mono font-semibold">{preset.label}</span>
          </p>
        </div>

        {/* Key principles banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", title: "Worker Nodes: JBOD", desc: "No RAID on data disks. HDFS 3× replication handles redundancy. Mount each disk as /grid/N." },
            { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", title: "Master/Utility: RAID 10", desc: "OS and service disks on RAID 10. JournalNode and ZooKeeper require dedicated SSD." },
            { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", title: "XFS Filesystem", desc: "XFS preferred over ext4 for all Hadoop partitions. OS partition can use ext4." },
          ].map((g, i) => (
            <div key={i} className={`rounded-xl border border-border ${g.bg} p-3 flex gap-3 items-start`}>
              <g.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${g.color}`} />
              <div>
                <p className="text-xs font-semibold">{g.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <DiskLegend items={["SSD", "NVMe", "HDD (JBOD)"]} />

        {/* Node layouts */}
        {nodeTypes.map((nt, i) => (
          <motion.div key={nt.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <NodeDiskDiagram {...nt} />
          </motion.div>
        ))}

        <p className="text-[10px] text-muted-foreground text-center pb-4">
          Based on Cloudera CDP Private Cloud Base Reference Architecture and hardware best practices documentation.
        </p>
      </div>
    </ScrollArea>
  );
}
