/**
 * Types for the Komari JSON-RPC2 API (`/api/rpc2`).
 * Field definitions follow the official dev docs (dev/rpc.html); a few fields
 * (`uptime`, `ping`) are present on the live wire response and included here.
 */

export interface KomariNode {
  uuid: string;
  /** Only present for authenticated callers. */
  token?: string;
  name: string;
  cpu_name: string;
  virtualization: string;
  arch: string;
  cpu_cores: number;
  cpu_physical_cores: number;
  os: string;
  kernel_version: string;
  gpu_name: string;
  ipv4?: string;
  ipv6?: string;
  region: string;
  remark?: string;
  public_remark?: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  version?: string;
  weight: number;
  price: number;
  billing_cycle: number;
  auto_renewal: boolean;
  currency: string;
  expired_at: string | null;
  group: string;
  tags: string;
  hidden: boolean;
  traffic_limit: number;
  traffic_limit_type: TrafficLimitType;
  created_at: string;
  updated_at: string;
}

export type TrafficLimitType = "sum" | "max" | "min" | "up" | "down";

export interface PingSummary {
  name: string;
  /** Latest latency in ms; -1 means no successful probe. */
  latest: number;
  avg: number;
  tail: number;
  /** Packet loss percentage 0-100. */
  loss: number;
  min: number;
  max: number;
}

export interface NodeLiveStatus {
  /** Node UUID. */
  client: string;
  /** ISO8601 UTC timestamp. */
  time: string;
  cpu: number;
  gpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  load5: number;
  load15: number;
  temp: number;
  disk: number;
  disk_total: number;
  /** Instantaneous inbound rate, bytes/sec. */
  net_in: number;
  /** Instantaneous outbound rate, bytes/sec. */
  net_out: number;
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
  online: boolean;
  /** Seconds since boot (present on live wire response). */
  uptime?: number;
  /** Keyed by ping task id. */
  ping?: Record<string, PingSummary>;
}

export interface PublicInfo {
  cors_origin_check_enabled: boolean;
  custom_body: string;
  custom_head: string;
  description: string;
  disable_password_login: boolean;
  oauth_enable: boolean;
  oauth_provider: string;
  ping_record_preserve_time: number;
  private_site: boolean;
  record_enabled: boolean;
  record_preserve_time: number;
  sitename: string;
  /** Current theme short name. */
  theme: string;
  /** Theme-defined key/value settings; shape varies per theme. */
  theme_settings: Record<string, unknown>;
}

export interface VersionInfo {
  version: string;
  hash: string;
}

export interface MeInfo {
  "2fa_enabled": boolean;
  logged_in: boolean;
  sso_id: string;
  sso_type: string;
  username: string;
  uuid: string;
}

/** One historical load sample. */
export interface StatusRecord {
  client: string;
  time: string;
  cpu: number;
  gpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  temp: number;
  disk: number;
  disk_total: number;
  net_in: number;
  net_out: number;
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
}

export interface LoadRecordsResp {
  count: number;
  /**
   * When a single uuid is requested the live server still returns a
   * `{ [uuid]: StatusRecord[] }` map; without a uuid it's the same map shape.
   */
  records: StatusRecord[] | Record<string, StatusRecord[]>;
  from: string;
  to: string;
}

export interface PingRecord {
  task_id: number;
  time: string;
  /** Latency in ms. */
  value: number;
  client: string;
}

export interface PingBasicInfo {
  client: string;
  /** Packet loss percentage. */
  loss: number;
  min: number;
  max: number;
}

export interface PingRecordsResp {
  count: number;
  basic_info: PingBasicInfo[];
  records: PingRecord[];
  from: string;
  to: string;
}

/** Nodes returned by `common:getNodes`; newer backends return an array, older ones return a uuid map. */
export type NodeCollection = KomariNode[] | Record<string, KomariNode>;
/** Map of uuid → latest status, as returned by `common:getNodesLatestStatus`. */
export type StatusMap = Record<string, NodeLiveStatus>;

/** A node joined with its latest status, the primary view model for the UI. */
export interface NodeView {
  node: KomariNode;
  status?: NodeLiveStatus;
  online: boolean;
}
