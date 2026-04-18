import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ALL_SERVICES, SERVICE_CATEGORIES, NODE_PRESETS, EC_POLICIES, OS_OPTIONS } from "@/lib/clusterConfig";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Server, HardDrive, Cpu, Database,
  ShieldCheck, Settings2, ChevronDown, ChevronRight, Disc, TrendingUp, Layers, Monitor
} from "lucide-react";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ConfigPanel({ config, onChange }) {
  const [expandedCats, setExpandedCats] = useState(new Set(["storage", "compute", "sql"]));

  const toggleService = (id) => {
    const newServices = config.services.includes(id)
      ? config.services.filter(s => s !== id)
      : [...config.services, id];
    onChange({ ...config, services: newServices });
  };

  const toggleCategory = (cat) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const grouped = {};
  ALL_SERVICES.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  // Derived storage info
  const preset = NODE_PRESETS[config.nodeSize];
  const dc = config.diskCount || preset?.diskCount || 10;
  const ds = config.diskSizeGB || preset?.diskSizeGB || 8000;
  const rawPerNodeTB = (dc * ds) / 1024;
  const cr = config.compressionRatio || 1;
  const effectiveTB = config.dataSize / cr;
  const ecPol = config.erasureCoding && config.ecPolicy ? EC_POLICIES[config.ecPolicy] : EC_POLICIES.replication3x;
  const overhead = ecPol.overhead;
  const requiredRawTB = (effectiveTB * overhead) / 0.75;
  const recommendedWorkers = Math.ceil(requiredRawTB / rawPerNodeTB);

  return (
    <div className="w-full h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">Cluster Configuration</h2>
              <p className="text-[11px] text-muted-foreground">CDP Private Cloud Base 7.3</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {/* ── INFRASTRUCTURE ── */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Infrastructure</h3>

            {/* Data Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-muted-foreground" /> Current Data Size (TB)
                </Label>
                <span className="text-xs font-mono font-bold text-primary">{config.dataSize} TB</span>
              </div>
              <Slider value={[config.dataSize]}
                onValueChange={([v]) => onChange({ ...config, dataSize: v })}
                min={1} max={5000} step={1} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 TB</span><span>5 PB</span>
              </div>
            </div>

            {/* Daily Growth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" /> Daily Ingest Growth (GB/day)
                </Label>
                <span className="text-xs font-mono font-bold text-primary">{config.dailyGrowthGB} GB</span>
              </div>
              <Slider value={[config.dailyGrowthGB || 0]}
                onValueChange={([v]) => onChange({ ...config, dailyGrowthGB: v })}
                min={0} max={10000} step={10} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span><span>10,000 GB/day</span>
              </div>
            </div>

            {/* Compression Ratio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" /> Compression Ratio
                </Label>
                <span className="text-xs font-mono font-bold text-primary">{config.compressionRatio || 1}×</span>
              </div>
              <Slider value={[config.compressionRatio || 1]}
                onValueChange={([v]) => onChange({ ...config, compressionRatio: v })}
                min={1} max={10} step={0.5} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1× (none)</span>
                <span className="text-emerald-500">Effective: {effectiveTB.toFixed(1)} TB</span>
                <span>10×</span>
              </div>
            </div>

            {/* Node Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-muted-foreground" /> Node Preset
              </Label>
              <Select value={config.nodeSize}
                onValueChange={(v) => {
                  const p = NODE_PRESETS[v];
                  onChange({ ...config, nodeSize: v, ramPerNode: p.ram, coresPerNode: p.cores, diskCount: p.diskCount, diskSizeGB: p.diskSizeGB });
                }}>
                <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NODE_PRESETS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-[11px]">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Disk count + disk size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] flex items-center gap-1">
                  <Disc className="w-2.5 h-2.5 text-muted-foreground" /> Disks / Node
                </Label>
                <Input type="number" value={config.diskCount}
                  onChange={e => onChange({ ...config, diskCount: parseInt(e.target.value) || 1 })}
                  className="h-8 text-xs font-mono" min={1} max={48} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] flex items-center gap-1">
                  <HardDrive className="w-2.5 h-2.5 text-muted-foreground" /> Disk Size (GB)
                </Label>
                <Input type="number" value={config.diskSizeGB}
                  onChange={e => onChange({ ...config, diskSizeGB: parseInt(e.target.value) || 1000 })}
                  className="h-8 text-xs font-mono" min={100} max={32000} />
              </div>
            </div>

            {/* Per-node storage summary */}
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Raw / worker node</span>
                <span className="font-mono font-bold text-blue-400">{rawPerNodeTB.toFixed(1)} TB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective after compression</span>
                <span className="font-mono font-bold text-emerald-400">{effectiveTB.toFixed(1)} TB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Replication ({ecPol.label.split(" ")[0] === "3×" ? "3× repl" : ecPol.label.split("(")[0].trim()}, 75% util)</span>
                <span className="font-mono font-bold text-amber-400">{requiredRawTB.toFixed(0)} TB raw</span>
              </div>
              <div className="flex justify-between border-t border-blue-500/20 pt-0.5 mt-0.5">
                <span className="text-muted-foreground font-semibold">Workers needed (1Y) with daily growth</span>
                <span className="font-mono font-bold text-primary">{recommendedWorkers} nodes</span>
              </div>
            </div>

            {/* RAM / Cores */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">RAM / Node</Label>
                <div className="h-8 px-2 rounded-md bg-muted flex items-center text-xs font-mono">{config.ramPerNode} GB</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cores / Node</Label>
                <div className="h-8 px-2 rounded-md bg-muted flex items-center text-xs font-mono">{config.coresPerNode} vCPU</div>
              </div>
            </div>

            {/* Disk Type indicator */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className={`px-1.5 py-0.5 rounded text-white font-medium ${preset?.diskType === "NVMe" ? "bg-purple-500" : "bg-slate-500"}`}>
                {preset?.diskType || "HDD"}
              </span>
              <span>{preset?.network || "10GbE"} Network</span>
            </div>
            {/* OS Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Monitor className="w-3 h-3 text-muted-foreground" /> Operating System
              </Label>
              <Select value={config.osVersion || "rhel8"}
                onValueChange={v => onChange({ ...config, osVersion: v })}>
                <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OS_OPTIONS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-[11px]">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const os = OS_OPTIONS[config.osVersion || "rhel8"];
                return (
                  <div className={`rounded-lg ${os.bg} border ${os.border} p-2 text-[10px] space-y-0.5`}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kernel</span>
                      <span className={`font-mono font-bold ${os.color}`}>{os.kernel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package Mgr</span>
                      <span className={`font-mono font-bold ${os.color}`}>{os.pkgMgr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default FS</span>
                      <span className={`font-mono font-bold ${os.color}`}>{os.defaultFS}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Java</span>
                      <span className={`font-mono font-bold ${os.color}`}>{os.javaVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Python</span>
                      <span className={`font-mono font-bold ${os.color}`}>{os.PythonVersion}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* HA Toggle */}
            <div className="flex items-center justify-between py-0.5">
              <Label className="text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-muted-foreground" /> High Availability
              </Label>
              <Switch checked={config.highAvailability}
                onCheckedChange={v => onChange({ ...config, highAvailability: v })} />
            </div>

            {/* Erasure Coding */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-0.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" /> Erasure Coding (EC)
                </Label>
                <Switch checked={!!config.erasureCoding}
                  onCheckedChange={v => onChange({ ...config, erasureCoding: v })} />
              </div>
              {config.erasureCoding && (
                <div className="space-y-1.5">
                  <Select value={config.ecPolicy || "ec_rs_6_3"}
                    onValueChange={v => onChange({ ...config, ecPolicy: v })}>
                    <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EC_POLICIES).filter(([k]) => k !== "replication3x").map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[11px]">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const pol = EC_POLICIES[config.ecPolicy || "ec_rs_6_3"];
                    return (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[10px] space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overhead factor</span>
                          <span className="font-mono font-bold text-emerald-400">{pol.overhead}×</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min DataNodes</span>
                          <span className="font-mono font-bold text-emerald-400">{pol.minNodes}</span>
                        </div>
                        <p className="text-muted-foreground pt-0.5">{pol.description}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Rack count */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-muted-foreground" /> Racks
                </Label>
                <span className="text-xs font-mono font-bold text-primary">{config.rackCount || 2}</span>
              </div>
              <Slider value={[config.rackCount || 2]}
                onValueChange={([v]) => onChange({ ...config, rackCount: v })}
                min={1} max={20} step={1} />
            </div>
          </section>

          <Separator />

          {/* ── SERVICES ── */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Services</h3>
            {Object.entries(grouped).map(([cat, svcs]) => (
              <Collapsible key={cat} open={expandedCats.has(cat)} onOpenChange={() => toggleCategory(cat)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${SERVICE_CATEGORIES[cat]?.color || 'bg-gray-500'}`} />
                    <span className="text-[11px] font-medium">{SERVICE_CATEGORIES[cat]?.label || cat}</span>
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                      {svcs.filter(s => config.services.includes(s.id)).length}/{svcs.length}
                    </Badge>
                  </div>
                  {expandedCats.has(cat) ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0.5 ml-3 mt-0.5">
                    {svcs.map(svc => {
                      const isCore = ["hdfs", "yarn", "zookeeper"].includes(svc.id);
                      const isEnabled = config.services.includes(svc.id) || isCore;
                      return (
                        <button key={svc.id}
                          onClick={() => !isCore && toggleService(svc.id)}
                          disabled={isCore}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-all ${isEnabled ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"} ${isCore ? "opacity-70 cursor-default" : "cursor-pointer"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isEnabled ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <span className="flex-1 text-left">{svc.name}</span>
                          {isCore && <Badge variant="outline" className="text-[8px] h-3 px-1">core</Badge>}
                        </button>
                      );
                    })}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
