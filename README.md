# Cloudera CDP Cluster Designer

An interactive React application for designing Cloudera CDP Private Cloud Base clusters.  
It helps you plan services, capacity, high availability, disk layouts and a rough bill of materials (BOM) for hardware.

## Features

- **Cluster configuration panel**
  - Select CDP services (HDFS, YARN, Hive, Impala, Kafka, Ranger, etc.).
  - Tune data size, daily ingest growth and compression ratio.
  - Choose node presets (RAM, cores, disk count/size) and customize disks.

- **Architecture view**
  - Visual master / utility / gateway / worker / ingest node layout.
  - Shows total node counts, RAM, cores and cluster tier (small → xxlarge).

- **Capacity planning**
  - 1‑year and 5‑year capacity projections based on growth and compression.
  - Calculates required raw TB and recommended worker counts.

- **High‑availability analysis**
  - Highlights HA posture of NameNode, YARN, ZooKeeper, JournalNodes, HBase, Kudu, Ranger, NiFi, etc.
  - Summarizes failure scenarios and expected recovery behaviour.

- **Disk layout & recommendations**
  - Per‑node disk layout diagrams for master, utility, worker, gateway and NiFi nodes.
  - Guidance on JBOD vs RAID, SSD vs HDD/NVMe and mount points.

- **Bill of materials (BOM)**
  - Approximate hardware BOM with editable unit prices.
  - CSV export for further analysis.

> This tool is intended as a planning aid, not a substitute for official Cloudera sizing guides or production architecture reviews.

## Tech stack

- **Frontend:** React 18, React Router
- **UI:** Tailwind CSS, Radix UI primitives, lucide-react icons, framer‑motion
- **State / data:** React Query, custom hooks and configuration utilities
- **Tooling:** Vite, ESLint, TypeScript (for type‑checking only)

## Getting started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or compatible package manager

### Install dependencies

```bash
npm install
```

### Run the app in development

```bash
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173/`) in your browser.

### Production build

```bash
npm run build
```

This outputs a production bundle to the `dist/` directory.

### Preview production build locally

```bash
npm run preview
```

## Project structure (high level)

- `src/main.jsx` – Vite entry point; mounts the React app.
- `src/App.jsx` – Router and top‑level providers.
- `src/pages/ClusterDesigner.jsx` – Main cluster designer page and tab layout.
- `src/components/cluster/` – Architecture, capacity, HA, disk layout, BOM and database tabs.
- `src/lib/clusterConfig.js` – Core sizing logic, presets and recommendations.
- `src/lib/AuthContext.jsx` – Lightweight auth context used for the local app.
- `src/api/base44Client.js` – Local stub API returning a fake user.

## Notes

- All numbers and recommendations are approximate and based on public Cloudera documentation and best‑effort modelling.
- Always validate final designs against Cloudera sizing guides and your organization’s standards before production use.
