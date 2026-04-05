import React from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeftRight } from "lucide-react";

export default function ConnectionLines({ hasMasters, hasUtilities, hasGateways, hasWorkers }) {
  const connections = [];

  if (hasMasters && hasUtilities) {
    connections.push({ from: "Master Hosts", to: "Utility Hosts", label: "Metadata & Management" });
  }
  if (hasUtilities && hasGateways) {
    connections.push({ from: "Utility Hosts", to: "Gateway Hosts", label: "Client Access" });
  }
  if (hasMasters && hasWorkers) {
    connections.push({ from: "Master Hosts", to: "Worker Hosts", label: "Task Distribution" });
  }

  if (connections.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-center justify-center gap-6 py-2"
    >
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ArrowLeftRight className="w-3 h-3" />
        <span>All host groups communicate via cluster network</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ArrowDown className="w-3 h-3" />
        <span>ZooKeeper coordinates across all groups</span>
      </div>
    </motion.div>
  );
}