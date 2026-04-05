import React, { useState, useMemo } from "react";
import ConfigPanel from "@/components/cluster/ConfigPanel";
import ArchitectureDiagram from "@/components/cluster/ArchitectureDiagram";
import DatabasesTab from "@/components/cluster/DatabasesTab";
import DiskRecommendationsTab from "@/components/cluster/DiskRecommendationsTab";
import NetworkRackDiagram from "@/components/cluster/NetworkRackDiagram";
import CapacityPlanTab from "@/components/cluster/CapacityPlanTab";
import BOMTab from "@/components/cluster/BOMTab";
import HAAnalysisTab from "@/components/cluster/HAAnalysisTab";
import NodeDiskLayoutTab from "@/components/cluster/NodeDiskLayoutTab";
import { generateClusterArchitecture, computeCapacityPlan, NODE_PRESETS } from "@/lib/clusterConfig";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, LayoutDashboard, Database, HardDrive, Network, TrendingUp, ShoppingCart, ShieldCheck, LayoutGrid } from "lucide-react";

const DEFAULT_PRESET = NODE_PRESETS.d96;

const DEFAULT_CONFIG = {
  services: ["hdfs", "yarn", "zookeeper", "hive", "impala", "spark", "hbase", "kafka", "kudu", "ranger", "atlas", "hue", "oozie", "knox", "cruise_control", "schema_registry", "smm"],
  dataSize: 1000,
  dailyGrowthGB: 500,
  compressionRatio: 1,
  nodeSize: "d96",
  ramPerNode: DEFAULT_PRESET.ram,
  coresPerNode: DEFAULT_PRESET.cores,
  diskCount: DEFAULT_PRESET.diskCount,
  diskSizeGB: DEFAULT_PRESET.diskSizeGB,
  highAvailability: true,
  rackCount: 2,
  erasureCoding: false,
  ecPolicy: "ec_rs_6_3",
};

const TABS = [
  { id: "architecture", label: "Architecture", icon: LayoutDashboard },
  { id: "capacity", label: "Capacity Plan", icon: TrendingUp },
  { id: "ha", label: "HA Analysis", icon: ShieldCheck },
  { id: "disklayout", label: "Disk Layout", icon: LayoutGrid },
  { id: "network", label: "Network & Racks", icon: Network },
  { id: "databases", label: "Databases", icon: Database },
  { id: "disks", label: "Disk Requirements", icon: HardDrive },
  { id: "bom", label: "BOM & Cost", icon: ShoppingCart },
];

export default function ClusterDesigner() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("architecture");

  // Auto-derive workerCount from 1Y capacity plan
  const capacityPlan = useMemo(() => computeCapacityPlan(config), [config]);
  const derivedWorkerCount = Math.max(3, capacityPlan.plan1Y.neededWorkers);
  const effectiveConfig = useMemo(() => ({ ...config, workerCount: derivedWorkerCount }), [config, derivedWorkerCount]);
  const architecture = useMemo(() => {
    const arch = generateClusterArchitecture(effectiveConfig);
    // Architecture summary should reflect 1Y plan numbers (the cluster is sized for 1Y)
    arch.summary.requiredRawTB = (capacityPlan.plan1Y.requiredRaw * .75).toFixed(1);
    arch.summary.utilizationPct = 75; // by definition: 1Y-sized cluster at 75% util for 1Y data
    return arch;
  }, [effectiveConfig, capacityPlan.plan1Y]);

  return (
    <div className="h-screen flex bg-background overflow-hidden font-inter">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 xl:w-88 flex-shrink-0 border-r border-border overflow-hidden" style={{ width: "340px" }}>
        <ConfigPanel config={config} onChange={setConfig} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card flex-shrink-0">
          {/* Mobile sidebar trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-1.5 mr-1">
                <Settings2 className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <ConfigPanel config={config} onChange={setConfig} />
            </SheetContent>
          </Sheet>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="h-8 bg-muted">
              {TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs h-7 px-3">
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Cluster badge */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono">{architecture.summary.workerCount}W / {architecture.summary.masterCount}M / {architecture.summary.utilityCount}U</span>
            <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{architecture.summary.tier.toUpperCase()}</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{architecture.summary.utilizationPct}% util</span>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "architecture" && <ArchitectureDiagram architecture={architecture} />}
          {activeTab === "capacity" && <CapacityPlanTab config={config} capacityPlan={capacityPlan} />}
          {activeTab === "ha" && <HAAnalysisTab architecture={architecture} config={effectiveConfig} />}
          {activeTab === "disklayout" && <NodeDiskLayoutTab config={effectiveConfig} architecture={architecture} />}
          {activeTab === "network" && <NetworkRackDiagram architecture={architecture} config={effectiveConfig} />}
          {activeTab === "databases" && <DatabasesTab enabledIds={architecture.enabledIds} />}
          {activeTab === "disks" && <DiskRecommendationsTab config={effectiveConfig} />}
          {activeTab === "bom" && <BOMTab architecture={architecture} config={effectiveConfig} capacityPlan={capacityPlan} />}
        </div>
      </div>
    </div>
  );
}