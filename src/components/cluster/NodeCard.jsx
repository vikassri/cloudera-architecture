import React from "react";
import { motion } from "framer-motion";

const typeStyles = {
  master: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    headerBg: "bg-blue-500",
    dot: "bg-blue-400",
    badge: "text-blue-400",
  },
  utility: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    headerBg: "bg-purple-500",
    dot: "bg-purple-400",
    badge: "text-purple-400",
  },
  gateway: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    headerBg: "bg-emerald-500",
    dot: "bg-emerald-400",
    badge: "text-emerald-400",
  },
  worker: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    headerBg: "bg-amber-500",
    dot: "bg-amber-400",
    badge: "text-amber-400",
  },
  ingest: {
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    headerBg: "bg-green-500",
    dot: "bg-green-400",
    badge: "text-green-400",
  },
};

export default function NodeCard({ node, index }) {
  const style = typeStyles[node.type] || typeStyles.worker;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden backdrop-blur-sm`}
    >
      {/* Header */}
      <div className={`px-3 py-2 flex items-center gap-2 border-b ${style.border}`}>
        <div className={`w-2 h-2 rounded-full ${style.headerBg} animate-pulse`} />
        <span className="text-xs font-semibold text-foreground truncate">{node.name}</span>
      </div>

      {/* Roles */}
      <div className="p-2.5 space-y-1">
        {node.roles.map((role, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight"
          >
            <div className={`w-1 h-1 rounded-full ${style.dot} flex-shrink-0`} />
            <span className="truncate">{role}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}