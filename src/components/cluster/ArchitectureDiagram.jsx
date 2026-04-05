import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import NodeGroup from "./NodeGroup";
import ClusterSummary from "./ClusterSummary";
import ConnectionLines from "./ConnectionLines";
import { motion, AnimatePresence } from "framer-motion";

export default function ArchitectureDiagram({ architecture }) {
  if (!architecture) return null;

  const { masters, utilities, gateways, ingestNodes = [], workers, workerCount, summary } = architecture;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        {/* Title */}
        <motion.div
          key={summary.tier + summary.highAvailability}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-1 pb-2"
        >
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Cloudera CDP Private Cloud — Cluster Architecture
          </h1>
          <p className="text-xs text-muted-foreground">
            {summary.workerCount} Workers (1Y sized) · {summary.highAvailability ? "HA" : "No HA"} · Tier: <span className="font-mono font-semibold uppercase">{summary.tier}</span> · {Number(summary.rawTotalTB) >= 1000 ? `${(Number(summary.rawTotalTB)/1000).toFixed(1)} PB` : `${summary.rawTotalTB} TB`} raw · {summary.erasureCoding ? summary.ecPolicyLabel : "3× Replication"} · Today: {summary.utilizationPct}% util
          </p>
        </motion.div>

        {/* Summary Stats */}
        <ClusterSummary summary={summary} />

        {/* Connection Info */}
        <ConnectionLines
          hasMasters={masters.length > 0}
          hasUtilities={utilities.length > 0}
          hasGateways={gateways.length > 0}
          hasWorkers={workers.length > 0}
        />

        {/* Node Groups */}
        <AnimatePresence mode="wait">
          <motion.div
            key={JSON.stringify(summary)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <NodeGroup type="master" nodes={masters} />
              <NodeGroup type="utility" nodes={utilities} />
            </div>

            {gateways.length > 0 && (
              <NodeGroup type="gateway" nodes={gateways} />
            )}

            {ingestNodes.length > 0 && (
              <NodeGroup type="ingest" nodes={ingestNodes} />
            )}

            <NodeGroup type="worker" nodes={workers} totalCount={workerCount} />
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[10px] text-muted-foreground">
            created by <a href="https://www.linkedin.com/in/ervikassri/" target="_blank" rel="noopener noreferrer" className="underline">Vikas Srivastava</a> 
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}