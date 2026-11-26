import { readFile } from "node:fs/promises";
import { parseChart } from "../src/chart";
import type { ParsedChart } from "../src/types";

/** The chart path is the first .chart argument, default charts/fernhill.chart. Parse errors print plainly and stop. */
export async function loadChart(): Promise<{ chart: ParsedChart; base: string }> {
  const path = process.argv.find((a) => a.endsWith(".chart")) ?? "charts/fernhill.chart";
  try {
    const chart = parseChart(await readFile(path, "utf8"), path);
    const base = path.split("/").pop()!.replace(/\.chart$/, "");
    return { chart, base };
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
