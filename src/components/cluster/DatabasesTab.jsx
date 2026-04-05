import React from "react";
import { DATABASE_REQUIREMENTS } from "@/lib/clusterConfig";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, AlertCircle, Info, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const priorityConfig = {
  critical: { color: "bg-red-500/10 border-red-500/30 text-red-400", badge: "bg-red-500", label: "Critical" },
  high: { color: "bg-orange-500/10 border-orange-500/30 text-orange-400", badge: "bg-orange-500", label: "High" },
  medium: { color: "bg-blue-500/10 border-blue-500/30 text-blue-400", badge: "bg-blue-500", label: "Medium" },
  low: { color: "bg-slate-500/10 border-slate-500/30 text-slate-400", badge: "bg-slate-500", label: "Low" },
};

const PriorityIcon = ({ priority }) => {
  if (priority === "critical") return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (priority === "high") return <AlertCircle className="w-4 h-4 text-orange-400" />;
  return <Info className="w-4 h-4 text-blue-400" />;
};

export default function DatabasesTab({ enabledIds = [] }) {
  const enabledSet = new Set(enabledIds);

  const isRelevant = (svc) => {
    const name = svc.service.toLowerCase();
    if (name.includes("cloudera manager")) return true;
    if (name.includes("hive") && enabledSet.has("hive")) return true;
    if (name.includes("ranger") && (enabledSet.has("ranger") || enabledSet.has("atlas"))) return true;
    if (name.includes("oozie") && enabledSet.has("oozie")) return true;
    if (name.includes("hue") && enabledSet.has("hue")) return true;
    if (name.includes("reports")) return true;
    if (name.includes("schema") && enabledSet.has("schema_registry")) return true;
    if (name.includes("streams") && enabledSet.has("smm")) return true;
    if (name.includes("yarn")) return true;
    if (name.includes("kms") && enabledSet.has("ranger")) return true;
    return false;
  };

  const relevant = DATABASE_REQUIREMENTS.filter(isRelevant);
  const notRelevant = DATABASE_REQUIREMENTS.filter(d => !isRelevant(d));

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Database Requirements
          </h2>
          <p className="text-sm text-muted-foreground">
            External RDBMS required for production. Cloudera embedded PostgreSQL is NOT supported in production.
            Minimum 500 GB RDBMS storage for production. Database latency to CM server must be &lt;10ms.
          </p>
        </div>

        {/* Key guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", title: "No Embedded DB in Prod", desc: "Use dedicated external PostgreSQL, MySQL, MariaDB, or Oracle databases." },
            { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", title: "500 GB+ Storage", desc: "Minimum 500 GB RDBMS storage for all Cloudera component databases combined." },
            { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", title: "< 10ms Latency", desc: "Database must be in same datacenter. Verify with: SELECT 1; from CM host." },
          ].map((g, i) => (
            <div key={i} className={`rounded-xl border p-3 flex gap-3 items-start ${g.bg} border-border`}>
              <g.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${g.color}`} />
              <div>
                <p className="text-xs font-semibold">{g.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active services databases */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Databases for Your Selected Services
            <Badge className="ml-2 text-[10px]">{relevant.length} required</Badge>
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {relevant.map((req, i) => {
              const cfg = priorityConfig[req.priority];
              return (
                <motion.div key={req.service}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Card className={`border ${cfg.color} overflow-hidden`}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={req.priority} />
                          <h4 className="text-sm font-semibold text-foreground">{req.service}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Type</span>
                          <p className="font-medium text-foreground">{req.db}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expected Size</span>
                          <p className="font-medium text-foreground">{req.size}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{req.notes}</p>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Supported Engines</p>
                        <div className="flex flex-wrap gap-1">
                          {req.engines.map(eng => (
                            <Badge key={eng} variant="secondary" className="text-[10px] h-4 px-1.5">{eng}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Inactive services */}
        {notRelevant.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Not Required (services not selected)
              <Badge variant="secondary" className="ml-2 text-[10px]">{notRelevant.length}</Badge>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {notRelevant.map(r => (
                <Badge key={r.service} variant="outline" className="text-[10px] opacity-50">{r.service}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="rounded-xl bg-muted/50 p-4 text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold">MySQL / MariaDB notes:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Use utf8 encoding (NOT utf8mb4) for Hive, Oozie, Hue Metastores</li>
            <li>Ranger requires InnoDB engine — no MyISAM</li>
            <li>MySQL GTID-based replication is NOT supported</li>
            <li>For clusters &gt;500 hosts, each service should have its own DB server</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}