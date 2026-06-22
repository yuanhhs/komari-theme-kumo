/**
 * Minimal typed JSON-RPC 2.0 client for the Komari RPC2 endpoint.
 *
 * Transport is plain HTTP POST to `/api/rpc2`. The path is relative on purpose:
 *  - in production the theme is served by Komari, so it is same-origin;
 *  - in development Next.js rewrites `/api/*` to the live instance (see next.config.ts).
 *
 * Komari accepts params as a named object or a positional array; we always use
 * the named-object form.
 */

import type {
  LoadRecordsResp,
  MeInfo,
  NodeCollection,
  NodeLiveStatus,
  PingRecordsResp,
  PublicInfo,
  StatusMap,
  VersionInfo,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const RPC_ENDPOINT = `${API_BASE}/api/rpc2`;

let requestId = 0;

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string; data?: unknown };
}

export class RpcError extends Error {
  readonly code: number;
  readonly data?: unknown;
  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.data = data;
  }
}

export interface RpcOptions {
  signal?: AbortSignal;
}

/** Low-level call. Resolves with the `result`, throws {@link RpcError} on a JSON-RPC error. */
export async function rpcCall<T>(
  method: string,
  params: Record<string, unknown> = {},
  options: RpcOptions = {},
): Promise<T> {
  const id = ++requestId;
  let response: Response;
  try {
    response = await fetch(RPC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
      signal: options.signal,
      credentials: "same-origin",
    });
  } catch (cause) {
    throw new RpcError(
      `Network error calling ${method}`,
      -1,
      cause instanceof Error ? cause.message : cause,
    );
  }

  if (!response.ok) {
    throw new RpcError(`HTTP ${response.status} calling ${method}`, response.status);
  }

  const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;
  if ("error" in payload) {
    throw new RpcError(payload.error.message, payload.error.code, payload.error.data);
  }
  return payload.result;
}

export type RecordType = "load" | "ping";
export type LoadMetric =
  | "cpu"
  | "gpu"
  | "ram"
  | "swap"
  | "load"
  | "temp"
  | "disk"
  | "network"
  | "process"
  | "connections"
  | "all";

export interface GetRecordsParams {
  type?: RecordType;
  uuid?: string;
  hours?: number;
  start?: string;
  end?: string;
  load_type?: LoadMetric;
  task_id?: number;
  maxCount?: number;
}

/** Typed wrappers around the documented `common:*` methods. */
export const komari = {
  getPublicInfo: (o?: RpcOptions) =>
    rpcCall<PublicInfo>("common:getPublicInfo", {}, o),

  getVersion: (o?: RpcOptions) => rpcCall<VersionInfo>("common:getVersion", {}, o),

  getMe: (o?: RpcOptions) => rpcCall<MeInfo>("common:getMe", {}, o),

  /** All nodes returned by the backend. */
  getNodes: (o?: RpcOptions) => rpcCall<NodeCollection>("common:getNodes", {}, o),

  /** Latest status for all nodes keyed by uuid. */
  getNodesLatestStatus: (o?: RpcOptions) =>
    rpcCall<StatusMap>("common:getNodesLatestStatus", {}, o),

  /** Recent status samples for a single node. */
  getNodeRecentStatus: (uuid: string, o?: RpcOptions) =>
    rpcCall<{ count: number; records: NodeLiveStatus[] }>(
      "common:getNodeRecentStatus",
      { uuid },
      o,
    ),

  getLoadRecords: (params: Omit<GetRecordsParams, "type">, o?: RpcOptions) =>
    rpcCall<LoadRecordsResp>("common:getRecords", { type: "load", ...params }, o),

  getPingRecords: (params: Omit<GetRecordsParams, "type">, o?: RpcOptions) =>
    rpcCall<PingRecordsResp>("common:getRecords", { type: "ping", ...params }, o),
};
