import type { TrafficLimitType } from "@/lib/types";

export function trafficUsedByType(type: TrafficLimitType, up: number, down: number): number {
  switch (type) {
    case "up":
      return up;
    case "down":
      return down;
    case "sum":
      return up + down;
    case "min":
      return Math.min(up, down);
    case "max":
    default:
      return Math.max(up, down);
  }
}
