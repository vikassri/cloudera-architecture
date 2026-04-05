// Cloudera CDP Private Cloud cluster configuration logic
// Based on: https://docs-archive.cloudera.com/cdp-private-cloud-base/7.1.6 & 7.3.2

export const ALL_SERVICES = [
  { id: "hdfs", name: "HDFS", category: "storage" },
  { id: "ozone", name: "Ozone", category: "storage" },
  { id: "yarn", name: "YARN", category: "compute" },
  { id: "hive", name: "Hive", category: "sql" },
  { id: "impala", name: "Impala", category: "sql" },
  { id: "hbase", name: "HBase", category: "nosql" },
  { id: "kafka", name: "Kafka", category: "streaming" },
  { id: "spark", name: "Spark", category: "compute" },
  { id: "kudu", name: "Kudu", category: "storage" },
  { id: "solr", name: "Solr", category: "search" },
  { id: "oozie", name: "Oozie", category: "workflow" },
  { id: "hue", name: "Hue", category: "ui" },
  { id: "ranger", name: "Ranger", category: "security" },
  { id: "atlas", name: "Atlas", category: "governance" },
  { id: "knox", name: "Knox", category: "security" },
  { id: "zookeeper", name: "ZooKeeper", category: "coordination" },
  { id: "kafka_connect", name: "Kafka Connect", category: "streaming" },
  { id: "schema_registry", name: "Schema Registry", category: "streaming" },
  { id: "smm", name: "Streams Messaging Manager", category: "streaming" },
  { id: "srm", name: "Streams Replication Manager", category: "streaming" },
  { id: "cruise_control", name: "Cruise Control", category: "management" },
  { id: "nifi", name: "NiFi (CFM)", category: "ingest" },
  { id: "nifi_registry", name: "NiFi Registry (CFM)", category: "ingest" },
  { id: "minifi", name: "MiNiFi (CFM Edge)", category: "ingest" },
];

export const SERVICE_CATEGORIES = {
  storage: { label: "Storage", color: "bg-blue-500" },
  compute: { label: "Compute", color: "bg-orange-500" },
  sql: { label: "SQL / Query", color: "bg-purple-500" },
  nosql: { label: "NoSQL", color: "bg-teal-500" },
  streaming: { label: "Streaming", color: "bg-rose-500" },
  ingest: { label: "Flow Mgmt (CFM)", color: "bg-green-500" },
  search: { label: "Search", color: "bg-amber-500" },
  workflow: { label: "Workflow", color: "bg-green-500" },
  ui: { label: "UI", color: "bg-cyan-500" },
  security: { label: "Security", color: "bg-red-500" },
  governance: { label: "Governance", color: "bg-indigo-500" },
  coordination: { label: "Coordination", color: "bg-yellow-600" },
  management: { label: "Management", color: "bg-slate-500" },
};

// Updated presets with disk count + disk size (64TB–100TB usable range per node)
export const NODE_PRESETS = {
  d64: {
    ram: 256, cores: 24, diskCount: 8, diskSizeGB: 8000,
    label: "Dense 64TB (256GB / 24C / 8×8TB HDD)",
    diskType: "HDD", network: "10GbE"
  },
  d72: {
    ram: 256, cores: 24, diskCount: 9, diskSizeGB: 8000,
    label: "Dense 72TB (256GB / 24C / 9×8TB HDD)",
    diskType: "HDD", network: "10GbE"
  },
  d80: {
    ram: 384, cores: 32, diskCount: 10, diskSizeGB: 8000,
    label: "Dense 80TB (384GB / 32C / 10×8TB HDD)",
    diskType: "HDD", network: "10GbE"
  },
  d96: {
    ram: 512, cores: 48, diskCount: 12, diskSizeGB: 8000,
    label: "Dense 96TB (512GB / 48C / 12×8TB HDD)",
    diskType: "HDD", network: "25GbE"
  },
  d96nvme: {
    ram: 512, cores: 48, diskCount: 8, diskSizeGB: 12000,
    label: "NVMe 96TB (512GB / 48C / 8×12TB NVMe)",
    diskType: "NVMe", network: "25GbE"
  },
  d128: {
    ram: 512, cores: 64, diskCount: 16, diskSizeGB: 8000,
    label: "Ultra 128TB (512GB / 64C / 16×8TB HDD)",
    diskType: "HDD", network: "25GbE"
  },
};

function getClusterTier(workerCount) {
  if (workerCount <= 10) return "small";
  if (workerCount <= 20) return "medium";
  if (workerCount <= 80) return "large";
  if (workerCount <= 200) return "xlarge";
  return "xxlarge";
}

// ============ ERASURE CODING ============
// EC overhead factor: how much raw storage is needed per unit of unique data
// 3× replication = 3.0 overhead
// EC RS-6-3 = 1.5× overhead (9 disks = 6 data + 3 parity)
// EC RS-10-4 = 1.4× overhead (14 disks = 10 data + 4 parity)
// EC RS-3-2 = 1.67× overhead (5 disks = 3 data + 2 parity)
export const EC_POLICIES = {
  replication3x: { label: "3× Replication (default)", overhead: 3.0, minNodes: 3, description: "Standard HDFS 3× block replication. No minimum rack/node requirement beyond 3 nodes." },
  ec_rs_3_2:     { label: "EC RS-3-2 (1.67×)", overhead: 5/3, minNodes: 5, description: "RS(3,2): 3 data + 2 parity blocks. Min 5 DataNodes. Good for small clusters." },
  ec_rs_6_3:     { label: "EC RS-6-3 (1.5×)", overhead: 1.5, minNodes: 9, description: "RS(6,3): 6 data + 3 parity. Min 9 DataNodes. Cloudera recommended for large clusters." },
  ec_rs_10_4:    { label: "EC RS-10-4 (1.4×)", overhead: 1.4, minNodes: 14, description: "RS(10,4): 10 data + 4 parity. Min 14 DataNodes. Best storage efficiency, highest compute overhead." },
};

// ============ CAPACITY PLANNING ============
export function computeCapacityPlan(config) {
  const { dataSize, dailyGrowthGB, compressionRatio, diskCount, diskSizeGB, nodeSize, erasureCoding, ecPolicy } = config;
  const preset = NODE_PRESETS[nodeSize] || NODE_PRESETS.d96;
  const dc = diskCount || preset.diskCount;
  const ds = diskSizeGB || preset.diskSizeGB;
  const rawPerNodeTB = (dc * ds) / 1024;

  const cr = compressionRatio || 1;
  const dailyGrowthTB = (dailyGrowthGB || 0) / 1024;

  // Replication overhead: 3× for default replication, less for EC
  const policy = erasureCoding && ecPolicy ? EC_POLICIES[ecPolicy] : EC_POLICIES.replication3x;
  const replicationOverhead = policy.overhead;

  function calcYear(years) {
    const totalDataTB = dataSize + dailyGrowthTB * 365 * years;
    const effectiveTB = totalDataTB / cr;
    // Required raw = effectiveData × replicationOverhead / 0.75 (75% utilization cap)
    const requiredRaw = (effectiveTB * replicationOverhead) / 0.75;
    const neededWorkers = Math.ceil(requiredRaw / rawPerNodeTB);
    return { years, totalDataTB: totalDataTB.toFixed(1), effectiveTB: effectiveTB.toFixed(1), requiredRaw: requiredRaw.toFixed(1), neededWorkers };
  }

  return {
    rawPerNodeTB: rawPerNodeTB.toFixed(1),
    plan1Y: calcYear(1),
    plan3Y: calcYear(3),
    plan5Y: calcYear(5),
    compressionRatio: cr,
    dailyGrowthTB: dailyGrowthTB.toFixed(2),
    replicationOverhead,
    ecPolicy: policy,
    erasureCoding: !!erasureCoding,
  };
}

export function generateClusterArchitecture(config) {
  const { services, workerCount, highAvailability, nodeSize, ramPerNode, coresPerNode, dataSize, diskCount, diskSizeGB, compressionRatio, dailyGrowthGB } = config;
  const tier = getClusterTier(workerCount);
  const enabledIds = new Set(services);

  // Always-on core services
  ["hdfs", "yarn", "zookeeper"].forEach(s => enabledIds.add(s));

  // Service dependencies
  if (enabledIds.has("atlas") || enabledIds.has("ranger")) {
    enabledIds.add("hbase");
    enabledIds.add("kafka");
    enabledIds.add("solr");
    enabledIds.add("zookeeper");
  }
  if (enabledIds.has("kafka")) enabledIds.add("zookeeper");

  const masters = [], utilities = [], gateways = [], workers = [];

  // ============ MASTER HOSTS ============
  if (!highAvailability || tier === "small") {
    const roles = ["NameNode", "YARN ResourceManager", "JobHistory Server", "ZooKeeper"];
    if (enabledIds.has("kudu")) roles.push("Kudu Master");
    if (enabledIds.has("spark")) roles.push("Spark History Server");
    if (enabledIds.has("hbase")) roles.push("HBase Master");
    if (enabledIds.has("schema_registry")) roles.push("Schema Registry");
    if (enabledIds.has("ozone")) roles.push("Ozone Manager (OM)", "Storage Container Manager (SCM)");
    masters.push({ name: "Master Host 1", roles, type: "master", haRole: "standalone" });
  } else if (tier === "medium") {
    const m1 = ["NameNode", "JournalNode", "FailoverController", "YARN ResourceManager", "ZooKeeper"];
    const m2 = ["NameNode (Standby)", "JournalNode", "FailoverController", "YARN ResourceManager (Standby)", "ZooKeeper"];
    const m3 = ["JournalNode", "ZooKeeper"];
    if (enabledIds.has("kudu")) { m1.push("Kudu Master"); m2.push("Kudu Master"); m3.push("Kudu Master"); }
    if (enabledIds.has("hbase")) { m1.push("HBase Master"); m2.push("HBase Master (Standby)"); }
    if (enabledIds.has("schema_registry")) { m1.push("Schema Registry"); m2.push("Schema Registry"); }
    if (enabledIds.has("spark")) m3.push("Spark History Server");
    if (enabledIds.has("ozone")) { m1.push("Ozone Manager (OM)"); m2.push("Ozone Manager (OM Standby)"); m3.push("SCM"); }
    masters.push(
      { name: "Master Host 1", roles: m1, type: "master", haRole: "active" },
      { name: "Master Host 2", roles: m2, type: "master", haRole: "standby" },
      { name: "Master Host 3", roles: m3, type: "master", haRole: "aux" }
    );
  } else if (tier === "large" || tier === "xlarge") {
    const m1 = ["NameNode", "JournalNode", "FailoverController", "YARN ResourceManager", "ZooKeeper"];
    const m2 = ["NameNode (Standby)", "JournalNode", "FailoverController", "YARN ResourceManager (Standby)", "ZooKeeper"];
    const m3 = ["ZooKeeper", "JournalNode", "JobHistory Server"];
    if (enabledIds.has("kudu")) { m1.push("Kudu Master"); m2.push("Kudu Master"); m3.push("Kudu Master"); }
    if (enabledIds.has("hbase")) { m1.push("HBase Master"); m2.push("HBase Master"); m3.push("HBase Master"); }
    if (enabledIds.has("schema_registry")) { m1.push("Schema Registry"); m2.push("Schema Registry"); }
    if (enabledIds.has("spark")) m3.push("Spark History Server");
    if (enabledIds.has("ozone")) { m1.push("Ozone Manager (OM)"); m2.push("Ozone Manager (OM)"); m3.push("SCM / Recon"); }
    masters.push(
      { name: "Master Host 1", roles: m1, type: "master", haRole: "active" },
      { name: "Master Host 2", roles: m2, type: "master", haRole: "standby" },
      { name: "Master Host 3", roles: m3, type: "master", haRole: "aux" }
    );
  } else {
    // xxlarge 200-500
    const m1 = ["NameNode", "JournalNode", "FailoverController", "ZooKeeper"];
    const m2 = ["NameNode (Standby)", "JournalNode", "FailoverController", "ZooKeeper"];
    const m3 = ["YARN ResourceManager", "ZooKeeper", "JournalNode"];
    const m4 = ["YARN ResourceManager (Standby)", "ZooKeeper", "JournalNode"];
    const m5 = ["JobHistory Server", "ZooKeeper", "JournalNode"];
    if (enabledIds.has("kudu")) { m1.push("Kudu Master"); m2.push("Kudu Master"); m3.push("Kudu Master"); }
    if (enabledIds.has("hbase")) { m1.push("HBase Master"); m2.push("HBase Master"); m3.push("HBase Master"); }
    if (enabledIds.has("schema_registry")) { m3.push("Schema Registry"); m4.push("Schema Registry"); }
    if (enabledIds.has("spark")) m5.push("Spark History Server");
    if (enabledIds.has("ozone")) { m1.push("Ozone Manager"); m2.push("Ozone Manager"); m3.push("SCM"); m4.push("Recon"); }
    masters.push(
      { name: "Master Host 1", roles: m1, type: "master", haRole: "active" },
      { name: "Master Host 2", roles: m2, type: "master", haRole: "standby" },
      { name: "Master Host 3", roles: m3, type: "master", haRole: "active" },
      { name: "Master Host 4", roles: m4, type: "master", haRole: "standby" },
      { name: "Master Host 5", roles: m5, type: "master", haRole: "aux" }
    );
  }

  // ============ UTILITY HOSTS ============
  if (tier === "small") {
    const uR = ["Cloudera Manager", "CM Management Service", "Secondary NameNode"];
    if (enabledIds.has("cruise_control")) uR.push("Cruise Control");
    if (enabledIds.has("hive")) { uR.push("Hive Metastore"); uR.push("HiveServer2"); }
    if (enabledIds.has("impala")) { uR.push("Impala Catalog Server"); uR.push("Impala StateStore"); }
    if (enabledIds.has("hue")) uR.push("Hue");
    if (enabledIds.has("oozie")) uR.push("Oozie");
    if (enabledIds.has("hbase")) uR.push("HBase Backup Master");
    if (enabledIds.has("ranger")) uR.push("Ranger Admin/Tagsync/Usersync");
    if (enabledIds.has("atlas")) uR.push("Atlas Server");
    if (enabledIds.has("solr")) uR.push("Solr Server (Infra)");
    if (enabledIds.has("smm")) uR.push("Streams Messaging Manager");
    if (enabledIds.has("srm")) uR.push("SRM Service");
    uR.push("ZooKeeper");
    if (enabledIds.has("knox")) uR.push("Knox Gateway");
    uR.push("Gateway Configuration");
    utilities.push({ name: "Utility / Gateway Host", roles: uR, type: "utility" });
  } else if (tier === "medium") {
    const u1 = ["Cloudera Manager", "CM Management Service"];
    if (enabledIds.has("cruise_control")) u1.push("Cruise Control");
    if (enabledIds.has("hive")) u1.push("Hive Metastore");
    if (enabledIds.has("impala")) { u1.push("Impala Catalog Server"); u1.push("Impala StateStore"); }
    if (enabledIds.has("oozie")) u1.push("Oozie");
    if (enabledIds.has("ranger")) u1.push("Ranger Admin/Tagsync/Usersync");
    if (enabledIds.has("atlas")) u1.push("Atlas Server");
    if (enabledIds.has("solr")) u1.push("Solr Server (Infra)");
    if (enabledIds.has("smm")) u1.push("Streams Messaging Manager");
    if (enabledIds.has("srm")) u1.push("SRM Service");
    if (enabledIds.has("knox")) u1.push("Knox Gateway");
    const u2 = [];
    if (enabledIds.has("hive")) u2.push("Hive Metastore");
    if (enabledIds.has("ranger")) u2.push("Ranger Admin Server");
    if (enabledIds.has("atlas")) u2.push("Atlas Server");
    if (enabledIds.has("solr")) u2.push("Solr Server (Infra)");
    if (enabledIds.has("knox")) u2.push("Knox Gateway");
    utilities.push({ name: "Utility Host 1", roles: u1, type: "utility" });
    if (u2.length > 0) utilities.push({ name: "Utility Host 2", roles: u2, type: "utility" });
  } else if (tier === "large") {
    const u1 = ["Cloudera Manager"];
    if (enabledIds.has("cruise_control")) u1.push("Cruise Control");
    if (enabledIds.has("hive")) u1.push("Hive Metastore");
    if (enabledIds.has("ranger")) u1.push("Ranger Admin Server");
    if (enabledIds.has("atlas")) u1.push("Atlas Server");
    if (enabledIds.has("solr")) u1.push("Solr Server (Infra)");
    if (enabledIds.has("smm")) u1.push("Streams Messaging Manager");
    if (enabledIds.has("srm")) u1.push("SRM Service");
    const u2 = ["CM Management Service"];
    if (enabledIds.has("hive")) u2.push("Hive Metastore");
    if (enabledIds.has("impala")) { u2.push("Impala Catalog Server"); u2.push("Impala StateStore"); }
    if (enabledIds.has("oozie")) u2.push("Oozie");
    if (enabledIds.has("ranger")) u2.push("Ranger Admin/Tagsync/Usersync");
    if (enabledIds.has("atlas")) u2.push("Atlas Server");
    if (enabledIds.has("solr")) u2.push("Solr Server (Infra)");
    utilities.push({ name: "Utility Host 1", roles: u1, type: "utility" });
    utilities.push({ name: "Utility Host 2", roles: u2, type: "utility" });
  } else {
    const u1 = ["Cloudera Manager"];
    if (enabledIds.has("cruise_control")) u1.push("Cruise Control");
    if (enabledIds.has("smm")) u1.push("Streams Messaging Manager");
    if (enabledIds.has("srm")) u1.push("SRM Service");
    const u2 = [];
    if (enabledIds.has("hive")) u2.push("Hive Metastore");
    if (enabledIds.has("impala")) { u2.push("Impala Catalog Server"); u2.push("Impala StateStore"); }
    if (enabledIds.has("oozie")) u2.push("Oozie");
    const u3 = ["Host Monitor"];
    const u4 = [];
    if (enabledIds.has("ranger")) u4.push("Ranger Admin/Tagsync/Usersync");
    if (enabledIds.has("atlas")) u4.push("Atlas Server");
    if (enabledIds.has("solr")) u4.push("Solr Server (Infra)");
    const u5 = [];
    if (enabledIds.has("hive")) u5.push("Hive Metastore");
    if (enabledIds.has("ranger")) u5.push("Ranger Admin Server");
    if (enabledIds.has("atlas")) u5.push("Atlas Server");
    if (enabledIds.has("solr")) u5.push("Solr Server (Infra)");
    utilities.push({ name: "Utility Host 1", roles: u1, type: "utility" });
    if (u2.length > 0) utilities.push({ name: "Utility Host 2", roles: u2, type: "utility" });
    utilities.push({ name: "Utility Host 3", roles: u3, type: "utility" });
    if (u4.length > 0) utilities.push({ name: "Utility Host 4", roles: u4, type: "utility" });
    if (u5.length > 0) utilities.push({ name: "Utility Host 5", roles: u5, type: "utility" });
    utilities.push({ name: "Utility Host 6", roles: ["Reports Manager"], type: "utility" });
    utilities.push({ name: "Utility Host 7", roles: ["Service Monitor"], type: "utility" });
  }

  // ============ GATEWAY HOSTS ============
  if (tier !== "small") {
    const gCount = tier === "medium" ? 1 : 2;
    for (let i = 1; i <= gCount; i++) {
      const gR = ["Gateway Configuration"];
      if (enabledIds.has("hue")) gR.push("Hue");
      if (enabledIds.has("hive")) gR.push("HiveServer2");
      if (i <= 2 && enabledIds.has("knox") && tier !== "medium") gR.push("Knox Gateway");
      gateways.push({ name: `Gateway Host ${i}`, roles: gR, type: "gateway" });
    }
  }

  // ============ CFM / INGEST HOSTS ============
  // NiFi nodes are separate ingest hosts (not workers)
  const ingestNodes = [];
  if (enabledIds.has("nifi")) {
    const nifiCount = tier === "small" ? 1 : tier === "medium" ? 2 : 3;
    for (let i = 1; i <= nifiCount; i++) {
      const nR = ["NiFi Node"];
      if (enabledIds.has("nifi_registry") && i === 1) nR.push("NiFi Registry");
      ingestNodes.push({ name: `CFM Ingest Host ${i}`, roles: nR, type: "ingest" });
    }
  }

  // ============ WORKER HOSTS ============
  const wRoles = ["DataNode", "NodeManager"];
  if (enabledIds.has("impala")) wRoles.push("Impalad");
  if (enabledIds.has("kudu")) wRoles.push("Kudu Tablet Server");
  if (enabledIds.has("kafka")) wRoles.push("Kafka Broker");
  if (enabledIds.has("kafka_connect")) wRoles.push("Kafka Connect");
  if (enabledIds.has("hbase")) wRoles.push("HBase RegionServer");
  if (enabledIds.has("solr")) wRoles.push("Solr Server");
  if (enabledIds.has("srm")) wRoles.push("SRM Driver");
  if (enabledIds.has("ozone")) wRoles.push("Ozone DataNode");
  wRoles.push(`ZooKeeper (3 hosts)`);
  const displayCount = Math.min(workerCount, 6);
  for (let i = 1; i <= displayCount; i++) {
    workers.push({ name: `Worker Host ${i}`, roles: [...wRoles], type: "worker" });
  }

  // ============ STORAGE CALCULATIONS ============
  const effDiskGB = diskSizeGB || 8000;
  const effDiskCount = diskCount || 10;
  const rawPerWorkerTB = (effDiskCount * effDiskGB) / 1024;
  // rawTotalTB = actual raw capacity of the cluster (1Y-sized workers)
  const rawTotalTB = rawPerWorkerTB * workerCount;
  const cr = compressionRatio || 1;
  // Replication overhead from EC policy (or default 3×)
  const policy = config.erasureCoding && config.ecPolicy ? EC_POLICIES[config.ecPolicy] : EC_POLICIES.replication3x;
  const replicationOverhead = policy.overhead;
  // Today's data effective size (after compression)
  const effectiveDataTB = dataSize / cr;
  // Total Raw should be = effectiveTB × replicationOverhead (the raw needed to store current data)
  // This is the "correct" raw requirement for today's data
  const requiredRawTB = (effectiveDataTB * replicationOverhead) / 0.75;
  // Utilization = today's required raw vs actual cluster raw capacity — max display 75% (cluster is sized for year 1)
  const utilizationPct = Math.min(75, Math.round((requiredRawTB / rawTotalTB) * 100));
  const recommendedWorkers = workerCount;

  const totalNodes = masters.length + utilities.length + gateways.length + ingestNodes.length + workerCount;
  const totalRAM = totalNodes * (ramPerNode || 256);
  const totalCores = totalNodes * (coresPerNode || 32);

  return {
    masters, utilities, gateways, ingestNodes, workers, workerCount,
    enabledIds: [...enabledIds],
    summary: {
      totalNodes, totalRAM, totalCores,
      masterCount: masters.length, utilityCount: utilities.length,
      gatewayCount: gateways.length, ingestCount: ingestNodes.length,
      workerCount,
      rawPerWorkerTB: rawPerWorkerTB.toFixed(1),
      rawTotalTB: rawTotalTB.toFixed(0),
      requiredRawTB: requiredRawTB.toFixed(0),
      effectiveDataTB: effectiveDataTB.toFixed(1),
      recommendedWorkers,
      utilizationPct,
      tier, highAvailability,
      diskCount: effDiskCount,
      diskSizeGB: effDiskGB,
      dataSize,
      compressionRatio: cr,
      replicationOverhead,
      ecPolicyLabel: policy.label,
      erasureCoding: !!config.erasureCoding,
    },
  };
}

// ============ DATABASE REQUIREMENTS ============
export const DATABASE_REQUIREMENTS = [
  {
    service: "Cloudera Manager Server",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "< 100 MB (small, but critical)",
    notes: "Most important to back up. Stores all service configs, role assignments, command history, users.",
    priority: "critical",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "MariaDB 10.6", "Oracle 19c"],
  },
  {
    service: "Hive Metastore",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Small–Medium (grows with tables & partitions)",
    notes: "UTF-8 encoding required. MySQL utf8 (not utf8mb4). No Percona. Stores Hive table schemas and partition metadata.",
    priority: "high",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "MariaDB 10.6", "Oracle 19c"],
  },
  {
    service: "Ranger Admin",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Medium (grows with policies)",
    notes: "InnoDB engine required for MySQL/MariaDB. Stores access control policies, users, groups.",
    priority: "high",
    engines: ["PostgreSQL 14+", "MySQL 8.0 (InnoDB only)", "MariaDB 10.6 (InnoDB only)", "Oracle 19c"],
  },
  {
    service: "Oozie Server",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Can grow very large",
    notes: "UTF-8/UTF8MB4 encoding. Stores workflow, coordinator, and bundle data.",
    priority: "high",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "MariaDB 10.6", "Oracle 19c"],
  },
  {
    service: "Hue Server",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Small",
    notes: "User account info, job submissions, Hive queries. UTF-8 required.",
    priority: "medium",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "MariaDB 10.6"],
  },
  {
    service: "Reports Manager",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Medium",
    notes: "Tracks disk utilization and processing activity over time.",
    priority: "medium",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "MariaDB 10.6", "Oracle 19c"],
  },
  {
    service: "Schema Registry",
    db: "PostgreSQL / MySQL / Oracle",
    size: "Small",
    notes: "Stores schemas, their versions, and branches for Kafka topics.",
    priority: "medium",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "Oracle 19c"],
  },
  {
    service: "Streams Messaging Manager (SMM)",
    db: "PostgreSQL / MySQL / Oracle",
    size: "Small–Medium",
    notes: "Stores Kafka metadata, metrics, and alert definitions.",
    priority: "medium",
    engines: ["PostgreSQL 14+", "MySQL 8.0", "Oracle 19c"],
  },
  {
    service: "YARN Queue Manager",
    db: "PostgreSQL (required)",
    size: "Small",
    notes: "CDP 7.1.9+: embedded DB. Earlier versions require dedicated PostgreSQL.",
    priority: "low",
    engines: ["PostgreSQL 14+"],
  },
  {
    service: "Ranger KMS",
    db: "PostgreSQL / MySQL / MariaDB / Oracle",
    size: "Small",
    notes: "Stores encrypted KMS master keys. Highly sensitive — use encrypted storage.",
    priority: "critical",
    engines: ["PostgreSQL 14+", "MySQL 8.0 (InnoDB only)", "MariaDB 10.6", "Oracle 19c"],
  },
];

// ============ DISK RECOMMENDATIONS ============
export const DISK_RECOMMENDATIONS = [
  {
    component: "OS / Boot",
    icon: "Monitor",
    color: "bg-slate-500",
    quantity: "2× (RAID 1)",
    size: "480 GB – 960 GB SSD",
    type: "SSD (mirrored)",
    mountPoint: "/",
    notes: "OS, logs, and core programs. Cloudera recommends ~20 GB for /root with room for future log growth. RAID 1 for resilience on all node types.",
    applies: "All Nodes",
    details: [
      "/ (root): 20 GB minimum",
      "Swap: 2× system RAM or max 128 GB (whichever is lower)",
      "Use XFS filesystem preferred over ext4",
      "Separate /var/log partition recommended (50–100 GB)",
    ],
  },
  {
    component: "HDFS DataNode",
    icon: "HardDrive",
    color: "bg-blue-500",
    quantity: "8–16× per node (JBOD, NO RAID)",
    size: "8 TB – 20 TB HDD per disk",
    type: "HDD — JBOD (no RAID)",
    mountPoint: "/grid/0/ … /grid/N/",
    notes: "RAID is NOT needed — HDFS handles redundancy via 3× replication. Mount each disk independently using /grid/[0-n] format. XFS or ext4 filesystem.",
    applies: "Worker Nodes",
    details: [
      "XFS preferred; ext4 acceptable; ext3 last resort",
      "Mount as /grid/0/, /grid/1/, … /grid/N/",
      "No RAID — HDFS replication (3×) provides redundancy",
      "Disk Balancer tool can rebalance data across disks",
      "Typical: 10×8TB = 80TB raw per worker",
    ],
  },
  {
    component: "HDFS NameNode",
    icon: "Database",
    color: "bg-blue-600",
    quantity: "2× (RAID 1 or mirrored)",
    size: "1–2 TB SSD",
    type: "SSD (mirrored/RAID 1)",
    mountPoint: "/dfs/nn",
    notes: "Stores the HDFS namespace (fsimage + edit logs). Must be highly reliable. SSD strongly recommended. In HA mode, JournalNodes handle edits.",
    applies: "Master Nodes",
    details: [
      "Dedicated SSD disk for NameNode data directory",
      "Configure dfs.namenode.name.dir to point to this disk",
      "In HA: JournalNodes share edits — separate SSD for /dfs/jn",
      "Size: ~1 GB per million HDFS files (fsimage grows with namespace)",
      "RAID 10 recommended for master node disks overall",
    ],
  },
  {
    component: "HDFS JournalNode",
    icon: "GitCommit",
    color: "bg-cyan-500",
    quantity: "1× dedicated disk (SSD)",
    size: "500 GB – 1 TB SSD",
    type: "SSD (dedicated)",
    mountPoint: "/dfs/jn",
    notes: "JournalNodes store HDFS edit logs for NameNode HA. A dedicated SSD disk is REQUIRED per Cloudera docs (requires dedicated disk). Deploy on 3 hosts for quorum.",
    applies: "Master Nodes (HA only)",
    details: [
      "Dedicated disk — never share with other services",
      "3 JournalNodes required for quorum (fault tolerance of 1)",
      "Configure dfs.journalnode.edits.dir to this disk",
      "SSD strongly recommended for low latency",
      "Size: typically 500 GB is ample for most clusters",
    ],
  },
  {
    component: "ZooKeeper",
    icon: "Network",
    color: "bg-yellow-600",
    quantity: "1× dedicated disk (SSD)",
    size: "100–500 GB SSD",
    type: "SSD (dedicated)",
    mountPoint: "/var/lib/zookeeper",
    notes: "ZooKeeper is latency-sensitive. A dedicated SSD prevents I/O interference from HDFS or other services. Deploy on minimum 3 nodes (odd number).",
    applies: "ZooKeeper Nodes (3 min)",
    details: [
      "Dedicated SSD disk — critical for low write latency",
      "dataDir should be on dedicated fast storage",
      "dataLogDir can be separate from dataDir",
      "3 or 5 nodes recommended (odd quorum)",
      "Size: 100 GB is usually sufficient; ZK data is small",
      "Avoid co-location with high I/O services",
    ],
  },
  {
    component: "Kudu Master",
    icon: "Cylinder",
    color: "bg-indigo-500",
    quantity: "2× (1 data + 1 WAL, both SSD)",
    size: "500 GB – 1 TB SSD each",
    type: "SSD / NVMe",
    mountPoint: "/var/lib/kudu/master, /var/lib/kudu/master-wal",
    notes: "Two separate disks required: one for Kudu Master data and one for WAL. NVMe/SSD for WAL if SLA-driven. Maximum 3 Kudu Masters.",
    applies: "Master Nodes (Kudu)",
    details: [
      "Disk 1: Kudu Master Data → /var/lib/kudu/master",
      "Disk 2: Kudu Master WAL → separate dedicated disk",
      "SLA workloads: NVMe strongly recommended for WAL",
      "Max 3 Kudu Masters (Raft consensus requires odd number)",
      "Size: 500 GB per disk typically sufficient for masters",
    ],
  },
  {
    component: "Kudu Tablet Server",
    icon: "Layers",
    color: "bg-violet-500",
    quantity: "Share with HDFS + 1 WAL disk",
    size: "Max 8 TiB usable per tablet server (post-replication)",
    type: "HDD (data) + SSD/NVMe (WAL)",
    mountPoint: "/data[N]/kudu-data, /data/kudu-wal",
    notes: "Share HDD data disks with HDFS. Dedicated SSD/NVMe for WAL. Max 8 TiB stored per tablet server (post-replication, post-compression). Max 1000 tablets per server.",
    applies: "Worker Nodes (Kudu)",
    details: [
      "Data: share disks with HDFS — /grid/0/kudu-data + /grid/0/hdfs-data",
      "WAL: dedicated SSD disk always recommended",
      "NVMe for WAL if SLA-driven workloads",
      "Max 8 TiB post-replication per tablet server",
      "Max 1000 tablets/server (2000 absolute max)",
      "Max 50 GiB per tablet recommended",
      "Max 100 tablet servers in a Kudu cluster",
    ],
  },
  {
    component: "Ozone Master (OM/SCM)",
    icon: "CloudCog",
    color: "bg-teal-500",
    quantity: "2× NVMe (RAID 1) for meta",
    size: "2×4 TB NVMe + 2×480 GB SSD (OS)",
    type: "NVMe (RAID 1 pairs)",
    mountPoint: "/data/ozone-meta",
    notes: "Ozone master nodes need NVMe for metadata storage. RAID 1 pairs for business continuity. Supports up to 10 billion keys with 4 TB NVMe.",
    applies: "Master Nodes (Ozone)",
    details: [
      "2× NVMe in RAID 1 for Ozone metadata (OM/SCM)",
      "Mount Ozone partitions as RAID1 (800 GB) pair",
      "Remaining NVMe space: JBOD for shuffle/cache",
      "3 master nodes minimum for full HA",
      "4 TB NVMe supports up to 10B keys",
      "Network: 2×25 Gbps per master node",
    ],
  },
  {
    component: "Ozone DataNode",
    icon: "CloudStorage",
    color: "bg-emerald-500",
    quantity: "24× HDD (no-compute) or 8× HDD (mixed)",
    size: "16 TB HDD per disk",
    type: "HDD (JBOD) + NVMe metadata",
    mountPoint: "/data/ozone/[0-N]",
    notes: "Ozone datanodes use large HDD arrays. For mixed compute nodes, additional NVMe for shuffle. Erasure Coding (RS 6,3) reduces raw overhead vs triple replication.",
    applies: "Worker Nodes (Ozone)",
    details: [
      "No-compute: 24×16TB HDD = 384 TB raw per node",
      "Mixed compute: 8×12TB HDD typical",
      "EC RS(6,3): ~1.5× overhead vs triple replication 3×",
      "Network: 2×12 Gbps (no-compute), 25 Gbps (mixed)",
      "Avoid JVM heap sizes 32–47 GB (use <31 GB or >48 GB)",
      "Min config: 3 master + 9 datanodes for EC RS(6,3) HA",
    ],
  },
  {
    component: "Kafka Broker",
    icon: "Radio",
    color: "bg-rose-500",
    quantity: "6–12× per broker (JBOD)",
    size: "1–4 TB SSD per disk",
    type: "SSD preferred (JBOD)",
    mountPoint: "/data/kafka/[0-N]",
    notes: "Kafka benefits from fast disk I/O. SSD significantly improves throughput. JBOD preferred. Minimum 3 brokers. Size based on retention window × throughput.",
    applies: "Worker Nodes (Kafka)",
    details: [
      "Minimum 3 brokers recommended",
      "JBOD configuration — Kafka manages redundancy",
      "Size: throughput (GB/s) × retention (hours) × 3600",
      "SSD strongly preferred for producer/consumer latency",
      "Separate log.dirs entries for each disk",
      "Replication factor ≥ 3 for production",
    ],
  },
];