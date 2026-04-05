import React, { useState } from "react";
import { DISK_RECOMMENDATIONS } from "@/lib/clusterConfig";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HardDrive, Monitor, Database, Network, Layers, Radio,
  GitCommit, AlertCircle, CheckCircle, Info
} from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  Monitor, HardDrive, Database, Network, Layers, Radio, GitCommit,
  Cylinder: HardDrive,
  CloudCog: Database,
  CloudStorage: HardDrive,
};

const typeColors = {
  "SSD (mirrored)": "bg-blue-500 text-white",
  "HDD — JBOD (no RAID)": "bg-amber-600 text-white",
  "SSD (dedicated)": "bg-purple-500 text-white",
  "SSD / NVMe": "bg-violet-500 text-white",
  "HDD (data) + SSD/NVMe (WAL)": "bg-indigo-500 text-white",
  "NVMe (RAID 1 pairs)": "bg-teal-500 text-white",
  "HDD (JBOD) + NVMe metadata": "bg-emerald-500 text-white",
  "SSD preferred (JBOD)": "bg-rose-500 text-white",
};

export default function DiskRecommendationsTab({ config }) {
  const [selected, setSelected] = useState(null);
  const enabledIds = new Set(config.services || []);

  const isRelevant = (rec) => {
    const n = rec.component.toLowerCase();
    if (n.includes("os")) return true;
    if (n.includes("hdfs datanode") || n.includes("hdfs namenode") || n.includes("journalnode")) return true;
    if (n.includes("zookeeper")) return true;
    if (n.includes("kudu") && enabledIds.has("kudu")) return true;
    if (n.includes("ozone") && enabledIds.has("ozone")) return true;
    if (n.includes("kafka") && enabledIds.has("kafka")) return true;
    return false;
  };

  const relevantRecs = DISK_RECOMMENDATIONS.filter(isRelevant);
  const otherRecs = DISK_RECOMMENDATIONS.filter(r => !isRelevant(r));

  // Totals
  const workerDisks = config.diskCount || 10;
  const workerDiskGB = config.diskSizeGB || 8000;
  const rawPerWorker = (workerDisks * workerDiskGB / 1024).toFixed(1);
  const rawTotal = (workerDisks * workerDiskGB * config.workerCount / 1024).toFixed(0);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Disk Requirements & Recommendations
          </h2>
          <p className="text-sm text-muted-foreground">
            Based on Cloudera CDP Private Cloud Base 7.3 official guidance. Partition and disk requirements by component.
          </p>
        </div>

        {/* Worker Storage Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Disks / Worker", value: `${workerDisks}×`, sub: `${(workerDiskGB/1024).toFixed(0)} TB each`, color: "text-blue-400" },
            { label: "Raw / Worker", value: `${rawPerWorker} TB`, sub: "per node", color: "text-blue-400" },
            { label: "Total Raw", value: `${rawTotal} TB`, sub: `${config.workerCount} workers`, color: "text-green-400" },
            { label: "Usable (÷3 repl)", value: `${(rawTotal / 3).toFixed(0)} TB`, sub: "after HDFS replication", color: "text-amber-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Key principles */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Key Partitioning Principles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /> Worker nodes: JBOD — no RAID needed (HDFS replication handles redundancy)</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /> Master nodes: RAID 10 recommended (dual Ethernet, dual power)</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /> XFS filesystem preferred &gt; ext4 &gt; ext3 for Hadoop partitions</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" /> JournalNode requires a dedicated SSD disk — never share</p>
              <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" /> ZooKeeper needs dedicated SSD — latency-sensitive</p>
              <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" /> Kudu WAL always needs dedicated SSD/NVMe</p>
            </div>
          </div>
        </div>

        {/* Active Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Recommendations for Your Configuration
            <Badge className="ml-2 text-[10px]">{relevantRecs.length} components</Badge>
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {relevantRecs.map((rec, i) => {
              const Icon = iconMap[rec.icon] || HardDrive;
              const typeColor = typeColors[rec.type] || "bg-slate-500 text-white";
              const isOpen = selected === rec.component;
              return (
                <motion.div key={rec.component}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <Card className="overflow-hidden border border-border hover:border-primary/30 transition-colors">
                    <button className="w-full text-left" onClick={() => setSelected(isOpen ? null : rec.component)}>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${rec.color}/20 flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${rec.color.replace("bg-", "text-")}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold">{rec.component}</h4>
                              <Badge className={`text-[9px] h-4 px-1.5 ${typeColor}`}>{rec.type}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{rec.applies}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground block">Quantity</span>
                            <span className="font-medium">{rec.quantity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Size</span>
                            <span className="font-medium">{rec.size}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Mount</span>
                            <span className="font-mono text-[9px] font-medium break-all">{rec.mountPoint}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{rec.notes}</p>
                      </div>
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border bg-muted/30 px-4 py-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detailed Notes</p>
                        <ul className="space-y-1">
                          {rec.details.map((d, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Other recommendations (services not selected) */}
        {otherRecs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              Additional Components (if services are enabled)
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {otherRecs.map((rec) => {
                const Icon = iconMap[rec.icon] || HardDrive;
                return (
                  <div key={rec.component} className="rounded-xl border border-border p-3 opacity-50 flex gap-3">
                    <div className={`w-7 h-7 rounded-md ${rec.color}/20 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${rec.color.replace("bg-", "text-")}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold">{rec.component}</p>
                      <p className="text-[10px] text-muted-foreground">{rec.applies} — {rec.quantity}, {rec.size}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}