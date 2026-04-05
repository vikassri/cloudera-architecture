import React, { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NODE_PRESETS } from "@/lib/clusterConfig";
import { ShoppingCart, Download, DollarSign, Server, HardDrive, Network, Database, Edit2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

// Default unit prices (USD)
const DEFAULT_PRICES = {
  workerServer: 25000,
  masterServer: 18000,
  utilityServer: 15000,
  gatewayServer: 12000,
  hddPerTB: 25,
  ssdOS: 400,
  ssdMeta: 800,
  nvmeDisk: 1200,
  networkSwitch25G: 18000,
  rack: 1500,
  patchPanel: 400,
  dbServerHW: 12000,
  powerPerServerPerYear: 800,
  installServices: 0.15,
  maintenance: 0.20,
};

function fmt(n) {
  if (isNaN(n) || n == null) return "$0";
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}K`
    : `$${Math.round(n).toLocaleString()}`;
}

function fmtRaw(n) {
  return isNaN(n) ? "0" : Math.round(n).toLocaleString();
}

// Interactive BOM row — unit price is editable inline
function BOMRow({ item, onPriceChange, editMode }) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 group">
      <td className="px-5 py-2 text-[11px] text-foreground">{item.label}</td>
      <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">{item.qty}</td>
      <td className="px-3 py-2 text-right font-mono text-[11px]">
        {editMode ? (
          <Input
            type="number"
            value={item.unit}
            onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
            className="h-6 w-24 text-[11px] font-mono text-right ml-auto"
            min={0}
          />
        ) : (
          <span className="text-muted-foreground">{fmt(item.unit)}</span>
        )}
      </td>
      <td className="px-5 py-2 text-right font-mono text-[11px] font-semibold">{fmt(item.total)}</td>
    </tr>
  );
}

function SectionTable({ title, icon: Icon, color, items, total, editMode, onItemPriceChange }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className={`text-sm font-bold font-mono ${color}`}>{fmt(total)}</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left px-5 py-2 text-[11px] text-muted-foreground font-medium">Item</th>
            <th className="text-right px-3 py-2 text-[11px] text-muted-foreground font-medium">Qty</th>
            <th className="text-right px-3 py-2 text-[11px] text-muted-foreground font-medium">
              {editMode ? <span className="text-primary">Unit Price ✎</span> : "Unit Price"}
            </th>
            <th className="text-right px-5 py-2 text-[11px] text-muted-foreground font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <BOMRow key={i} item={item} editMode={editMode}
              onPriceChange={v => onItemPriceChange(i, v)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BOMTab({ architecture, config, capacityPlan }) {
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [editMode, setEditMode] = useState(false);

  const preset = NODE_PRESETS[config.nodeSize] || NODE_PRESETS.d96;
  const { masterCount, utilityCount, gatewayCount, workerCount } = architecture.summary;
  const diskCount = config.diskCount || preset.diskCount;
  const diskSizeGB = config.diskSizeGB || preset.diskSizeGB;
  const rackCount = config.rackCount || 2;
  const totalNodes = masterCount + utilityCount + gatewayCount + workerCount;

  // Build item arrays (recomputed from prices)
  const buildItems = useCallback((p) => {
    // COMPUTE
    const computeItems = [
      { key: "workerServer", label: `Worker Nodes ×${workerCount}`, qty: workerCount, unit: p.workerServer, total: workerCount * p.workerServer },
      { key: "masterServer", label: `Master Nodes ×${masterCount}`, qty: masterCount, unit: p.masterServer, total: masterCount * p.masterServer },
      { key: "utilityServer", label: `Utility Nodes ×${utilityCount}`, qty: utilityCount, unit: p.utilityServer, total: utilityCount * p.utilityServer },
      ...(gatewayCount > 0 ? [{ key: "gatewayServer", label: `Gateway Nodes ×${gatewayCount}`, qty: gatewayCount, unit: p.gatewayServer, total: gatewayCount * p.gatewayServer }] : []),
    ];

    // STORAGE
    const totalHDDs = workerCount * diskCount;
    const hddTBTotal = (totalHDDs * diskSizeGB) / 1024;
    const hddCostPerDisk = p.hddPerTB * (diskSizeGB / 1024);
    const storageItems = [
      { key: "hddPerTB", label: `HDD Drives (${(diskSizeGB/1000).toFixed(0)}TB × ${diskCount} × ${workerCount} nodes)`, qty: totalHDDs, unit: hddCostPerDisk, total: hddTBTotal * p.hddPerTB },
      { key: "ssdOS", label: `OS SSD pairs (all nodes)`, qty: totalNodes, unit: p.ssdOS, total: totalNodes * p.ssdOS },
      { key: "ssdMeta", label: `Metadata SSD (master/utility)`, qty: masterCount * 2 + utilityCount, unit: p.ssdMeta, total: (masterCount * 2 + utilityCount) * p.ssdMeta },
    ];

    // NETWORK
    const networkItems = [
      { key: "networkSwitch25G", label: `Top-of-Rack Switches (25GbE) ×${rackCount}`, qty: rackCount, unit: p.networkSwitch25G, total: rackCount * p.networkSwitch25G },
      { key: "rack", label: `Racks ×${rackCount}`, qty: rackCount, unit: p.rack, total: rackCount * p.rack },
      { key: "patchPanel", label: `Patch Panels ×${rackCount}`, qty: rackCount, unit: p.patchPanel, total: rackCount * p.patchPanel },
    ];

    // DATABASE
    const dbItems = [
      { key: "dbServerHW", label: `External DB Servers (Primary + Standby)`, qty: 2, unit: p.dbServerHW, total: 2 * p.dbServerHW },
      { key: "ssdMeta", label: `DB Storage SSD`, qty: 8, unit: p.ssdMeta, total: 8 * p.ssdMeta },
    ];

    return { computeItems, storageItems, networkItems, dbItems };
  }, [workerCount, masterCount, utilityCount, gatewayCount, diskCount, diskSizeGB, rackCount, totalNodes]);

  const { computeItems, storageItems, networkItems, dbItems } = buildItems(prices);

  const computeTotal = computeItems.reduce((s, i) => s + i.total, 0);
  const storageTotal = storageItems.reduce((s, i) => s + i.total, 0);
  const networkTotal = networkItems.reduce((s, i) => s + i.total, 0);
  const dbTotal = dbItems.reduce((s, i) => s + i.total, 0);
  const hwSubtotal = computeTotal + storageTotal + networkTotal + dbTotal;
  const installCost = hwSubtotal * prices.installServices;
  const powerY1 = totalNodes * prices.powerPerServerPerYear;
  const maintY1 = hwSubtotal * prices.maintenance;
  const grandTotalCapex = hwSubtotal + installCost;
  const totalOpexY1 = powerY1 + maintY1;
  const plan5Workers = capacityPlan.plan5Y.neededWorkers;
  const expansionWorkers = Math.max(0, plan5Workers - workerCount);
  const expansionCost = expansionWorkers * (prices.workerServer + diskCount * (diskSizeGB / 1024) * prices.hddPerTB + prices.ssdOS);
  const tco5Y = grandTotalCapex + totalOpexY1 * 5 + expansionCost;

  // Update unit price for a section row
  const makeUpdater = (sectionKey) => (itemIndex, newUnit) => {
    const items = buildItems(prices)[sectionKey];
    const item = items[itemIndex];
    if (!item?.key) return;
    setPrices(p => ({ ...p, [item.key]: newUnit }));
  };

  const exportBOM = () => {
    const allItems = [
      ...computeItems.map(i => ["Compute", i.label, i.qty, i.unit, i.total]),
      ...storageItems.map(i => ["Storage", i.label, i.qty, i.unit, i.total]),
      ...networkItems.map(i => ["Network", i.label, i.qty, i.unit, i.total]),
      ...dbItems.map(i => ["Database", i.label, i.qty, i.unit, i.total]),
    ];
    const rows = [
      ["Cloudera CDP Private Cloud — Bill of Materials"],
      ["Generated:", new Date().toLocaleDateString()],
      ["Configuration:", `${workerCount} Workers · ${masterCount} Masters · ${architecture.summary.tier.toUpperCase()} tier`],
      ["Storage Policy:", architecture.summary.ecPolicyLabel || "3× Replication"],
      [],
      ["CATEGORY", "ITEM", "QTY", "UNIT PRICE (USD)", "TOTAL (USD)"],
      ...allItems,
      [],
      ["SUMMARY"],
      ["Hardware Subtotal", "", "", "", hwSubtotal],
      ["Installation & Integration (15%)", "", "", "", installCost],
      ["CAPEX Total", "", "", "", grandTotalCapex],
      ["Annual Power", "", "", "", powerY1],
      ["Annual Maintenance (20%)", "", "", "", maintY1],
      ["Annual OPEX", "", "", "", totalOpexY1],
      [`5-Year Expansion (+${expansionWorkers} workers)`, "", "", "", expansionCost],
      ["5-Year TCO", "", "", "", tco5Y],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cdp-cluster-bom.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Bill of Materials & Cost Estimator
            </h2>
            <p className="text-sm text-muted-foreground">
              Hardware cost estimates · {architecture.summary.ecPolicyLabel || "3× Replication"} · Click "Edit Prices" to adjust any line item inline.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => { setPrices(DEFAULT_PRICES); }} className="gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Button variant={editMode ? "default" : "outline"} size="sm"
              onClick={() => setEditMode(v => !v)} className="gap-1.5 text-xs">
              <Edit2 className="w-3.5 h-3.5" />
              {editMode ? "Done Editing" : "Edit Prices"}
            </Button>
            <Button size="sm" onClick={exportBOM} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {editMode && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-[11px] text-primary flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5" />
            Edit mode active — click any unit price cell in the tables below to change it. Totals update instantly.
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "CAPEX (HW + Install)", value: fmt(grandTotalCapex), color: "text-blue-400", bg: "bg-blue-500/10", sub: "One-time" },
            { label: "Annual OPEX", value: fmt(totalOpexY1), color: "text-amber-400", bg: "bg-amber-500/10", sub: "Power + Maintenance" },
            { label: "5-Year TCO", value: fmt(tco5Y), color: "text-violet-400", bg: "bg-violet-500/10", sub: `Inc. +${expansionWorkers} expansion nodes` },
            { label: "Cost / Worker Node", value: fmt(grandTotalCapex / Math.max(1, workerCount)), color: "text-emerald-400", bg: "bg-emerald-500/10", sub: "Avg all-in" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border border-border ${s.bg} p-4 space-y-1`}>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* BOM Tables */}
        <SectionTable title="Compute (Servers)" icon={Server} color="text-blue-400"
          items={computeItems} total={computeTotal} editMode={editMode}
          onItemPriceChange={makeUpdater("computeItems")} />
        <SectionTable title="Storage (Disks)" icon={HardDrive} color="text-amber-400"
          items={storageItems} total={storageTotal} editMode={editMode}
          onItemPriceChange={makeUpdater("storageItems")} />
        <SectionTable title="Network & Racks" icon={Network} color="text-emerald-400"
          items={networkItems} total={networkTotal} editMode={editMode}
          onItemPriceChange={makeUpdater("networkItems")} />
        <SectionTable title="External Databases (RDBMS)" icon={Database} color="text-purple-400"
          items={dbItems} total={dbTotal} editMode={editMode}
          onItemPriceChange={makeUpdater("dbItems")} />

        {/* Summary table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Cost Summary</h3>
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {[
                { label: "Compute Hardware", val: computeTotal },
                { label: "Storage Hardware", val: storageTotal },
                { label: "Network & Racks", val: networkTotal },
                { label: "Database Servers", val: dbTotal },
                { label: "Hardware Subtotal", val: hwSubtotal, bold: true },
                { label: `Installation & Integration (${Math.round(prices.installServices * 100)}%)`, val: installCost, indent: true },
                { label: "CAPEX Total", val: grandTotalCapex, bold: true, color: "text-blue-400" },
                { label: "Annual Power Cost", val: powerY1, indent: true },
                { label: `Annual Maintenance (${Math.round(prices.maintenance * 100)}% HW)`, val: maintY1, indent: true },
                { label: "Annual OPEX", val: totalOpexY1, bold: true, color: "text-amber-400" },
                { label: `5Y Expansion (+${expansionWorkers} workers → ${plan5Workers} total)`, val: expansionCost, indent: true },
                { label: "5-Year TCO", val: tco5Y, bold: true, color: "text-violet-400", large: true },
              ].map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                  <td className={`px-5 py-2.5 text-[11px] ${r.bold ? "font-bold text-foreground" : ""} ${r.indent ? "pl-10 text-muted-foreground" : "text-foreground"}`}>
                    {r.label}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-mono font-bold text-[11px] ${r.color || ""} ${r.large ? "text-base" : ""}`}>
                    {fmt(r.val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* OPEX inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" /> OPEX & Overhead Rates
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: "powerPerServerPerYear", label: "Power / Server / Year ($)" },
              { key: "installServices", label: "Install Rate (e.g. 0.15 = 15%)" },
              { key: "maintenance", label: "Maintenance Rate (e.g. 0.20)" },
              { key: "dbServerHW", label: "DB Server HW ($)" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] text-muted-foreground">{f.label}</label>
                <Input type="number" value={prices[f.key]}
                  onChange={e => setPrices(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="h-7 text-xs font-mono" />
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-4">
          Estimates are indicative only. Actual costs depend on vendor pricing, region, and negotiated discounts. CDP software licenses not included.
        </p>
      </div>
    </ScrollArea>
  );
}
