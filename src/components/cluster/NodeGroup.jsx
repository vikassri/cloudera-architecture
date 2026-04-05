import React from "react";
import { motion } from "framer-motion";
import NodeCard from "./NodeCard";

const groupConfig = {
  master: {
    label: "Master Hosts",
    description: "Hadoop master processes (NameNode, ResourceManager)",
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
    iconBg: "bg-blue-500/20",
  },
  utility: {
    label: "Utility Hosts",
    description: "Cloudera Manager, Hive Metastore, Ranger, Atlas",
    color: "text-purple-400",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/5",
    iconBg: "bg-purple-500/20",
  },
  gateway: {
    label: "Gateway Hosts",
    description: "Client access points (Hue, HiveServer2)",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    bgColor: "bg-emerald-500/5",
    iconBg: "bg-emerald-500/20",
  },
  worker: {
    label: "Worker Hosts",
    description: "DataNode, NodeManager, distributed processes",
    color: "text-amber-400",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-500/5",
    iconBg: "bg-amber-500/20",
  },
  ingest: {
    label: "CFM Ingest Hosts",
    description: "Cloudera Flow Management — NiFi data ingestion nodes",
    color: "text-green-400",
    borderColor: "border-green-500/20",
    bgColor: "bg-green-500/5",
    iconBg: "bg-green-500/20",
  },
};

export default function NodeGroup({ type, nodes, totalCount }) {
  const cfg = groupConfig[type];
  if (!nodes || nodes.length === 0) return null;

  const displayCount = totalCount || nodes.length;
  const hasMore = totalCount && totalCount > nodes.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border ${cfg.borderColor} ${cfg.bgColor} p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${cfg.iconBg} ring-2 ring-offset-1 ring-offset-background ${cfg.borderColor}`} />
          <div>
            <h3 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h3>
            <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
          </div>
        </div>
        <div className={`text-xs font-mono font-bold ${cfg.color} px-2 py-0.5 rounded-full ${cfg.iconBg}`}>
          ×{displayCount}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {nodes.map((node, i) => (
          <NodeCard key={node.name} node={node} index={i} />
        ))}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl border ${cfg.borderColor} border-dashed flex items-center justify-center min-h-[80px]`}
          >
            <div className="text-center">
              <p className={`text-lg font-bold font-mono ${cfg.color}`}>+{totalCount - nodes.length}</p>
              <p className="text-[10px] text-muted-foreground">more nodes</p>
              <p className="text-[10px] text-muted-foreground">(same config)</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}