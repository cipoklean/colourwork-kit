import type { ChartColour, ChartMode, ColourNote, FloatNote, KeyColour, ParsedChart, YarnWeight } from "./types";

/** Yards of yarn per stitch, by weight (source: stitchsums.com Fair Isle calculator). */
export const YD_PER_STITCH: Record<YarnWeight, number> = {
  lace: 0.012,
  fingering: 0.014,
  sport: 0.018,
  dk: 0.018,
  worsted: 0.022,
  bulky: 0.03,
};

export const WEIGHT_LABEL: Record<YarnWeight, string> = {
  lace: "lace",
  fingering: "fingering",
  sport: "sport",
  dk: "DK",
  worsted: "worsted",
  bulky: "bulky",
};

/** Printed under every yardage figure. */
export const YARDAGE_NOTE = "Yardage is an estimate for the charted section, +10%; check it against your swatch.";

/** One page of print holds a chart up to this size. */
export const MAX_WIDTH = 60;
export const MAX_HEIGHT = 70;
/** A single-colour run longer than this many stitches is a float worth catching. */
export const MAX_FLOAT = 7;

const MODES: ChartMode[] = ["round", "flat"];
const WEIGHTS = Object.keys(YD_PER_STITCH) as YarnWeight[];
const FIELDS = ["title", "designer", "mode", "weight", "repeats", "repeat", "url", "note"];

function fail(line: number | null, message: string): never {
  throw new Error(line === null ? message : `Line ${line}: ${message}`);
}

interface RawKey extends KeyColour {}

/** The parts of a chart the derivations need — a ParsedChart, or an element's props. */
export interface ChartData {
  mode: ChartMode;
  rows: string[];
  width: number;
  height: number;
  key: { symbol: string; code: string; name: string; hex: string }[];
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(h: string): string {
  const s = h.slice(1);
  return s.length === 3 ? `#${[...s].map((c) => c + c).join("")}`.toLowerCase() : `#${s}`.toLowerCase();
}

/** Parses a .chart file. Throws one plain-English Error naming the line on anything malformed. */
export function parseChart(source: string, name = "chart"): ParsedChart {
  const lines = source.split(/\r?\n/);
  const fields = new Map<string, { value: string; line: number }>();
  const key: RawKey[] = [];
  const chartRows: { text: string; line: number }[] = [];
  let section: "fields" | "key" | "chart" = "fields";
  let sawKey = false;
  let sawChart = false;
  let noteOpen = false;

  const setField = (field: string, value: string, line: number) => {
    if (fields.has(field)) fail(line, `"${field}" is set twice (first at line ${fields.get(field)!.line}).`);
    fields.set(field, { value, line });
    noteOpen = field === "note";
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    if (section !== "chart") {
      if (/^key\s*:/.test(trimmed)) {
        if (section !== "fields") fail(n, `"key:" appears twice.`);
        section = "key";
        sawKey = true;
        return;
      }
      if (/^chart\s*:/.test(trimmed)) {
        if (section === "key" && !sawKey) fail(n, `unreachable.`);
        section = "chart";
        sawChart = true;
        return;
      }
    }

    if (section === "fields") {
      // A field line, or an indented continuation of a `note:`.
      if (/^[ \t]/.test(raw) && noteOpen && fields.has("note")) {
        const prev = fields.get("note")!;
        prev.value = prev.value ? `${prev.value} ${trimmed}` : trimmed;
        return;
      }
      const m = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(trimmed);
      if (!m) fail(n, `expected a field like "title: Fernhill Yoke", or "key:" — got "${trimmed.slice(0, 40)}".`);
      const field = m[1].toLowerCase();
      if (!FIELDS.includes(field)) fail(n, `"${m[1]}" isn't a chart field — use ${FIELDS.join(", ")}, then "key:" and "chart:".`);
      // A comment is "#" after at least two spaces (or a tab), so "see #5" survives.
      const value = m[2].replace(/(\s{2,}|\t)#.*$/, "").trim();
      setField(field, value, n);
      return;
    }

    if (section === "key") {
      const tokens = trimmed.split(/\s+/);
      const [symbol, code, ...rest] = tokens;
      const hexAt = rest.findIndex((t) => t.startsWith("#"));
      const nameTokens = hexAt === -1 ? rest : rest.slice(0, hexAt);
      const hexToken = hexAt === -1 ? undefined : rest[hexAt];
      if ([...symbol].length !== 1) fail(n, `"${symbol}" — a key symbol is a single character, like "." or "x".`);
      if (symbol === "#") fail(n, `"#" can't be a key symbol — it starts a comment.`);
      if (!code || !/^[A-Za-z0-9]+$/.test(code)) fail(n, `"${symbol} ${code ?? ""}" — after the symbol comes a short code like MC or CC1.`);
      if (!nameTokens.length) fail(n, `"${symbol} ${code}" has no colour name — write it like "${symbol} ${code} Oatmeal #e8dfcd".`);
      if (!hexToken) fail(n, `"${symbol} ${code} ${nameTokens.join(" ")}" has no colour — end the entry with the hex, like #e8dfcd.`);
      if (!HEX.test(hexToken)) fail(n, `"${hexToken}" isn't a hex colour — write it as #rrggbb (or #rgb), like #e8dfcd.`);
      key.push({ symbol, code, name: nameTokens.join(" "), hex: normalizeHex(hexToken), line: n });
      return;
    }

    // section === "chart": every non-blank, non-comment line is a row; whitespace inside is ignored.
    chartRows.push({ text: trimmed.replace(/\s+/g, ""), line: n });
  });

  if (!sawKey) fail(null, `missing "key:" — list each colour on its own line under "key:", like ". MC Oatmeal #e8dfcd".`);
  if (!sawChart) fail(null, `missing "chart:" — the chart rows go last, one row per line, the last row knitted at the bottom.`);
  if (!key.length) fail(null, `the "key:" block is empty — list each colour on its own line, like ". MC Oatmeal #e8dfcd".`);
  if (!chartRows.length) fail(null, `the "chart:" block has no rows — add one row per line.`);

  const get = (f: string) => fields.get(f)?.value ?? "";
  const fieldLine = (f: string) => fields.get(f)?.line ?? null;

  for (const f of ["title", "designer", "mode", "weight"] as const) {
    if (!fields.has(f)) {
      const hint =
        f === "title" ? `add a line like "title: Fernhill Yoke"`
        : f === "designer" ? `add a line like "designer: Wren Holloway"`
        : f === "mode" ? `add "mode: round" (knitted in the round) or "mode: flat" (knitted flat)`
        : `add "weight: fingering" — one of ${WEIGHTS.join(", ")}`;
      fail(null, `missing "${f}:" — ${hint}.`);
    }
  }

  const modeRaw = get("mode").toLowerCase();
  if (!MODES.includes(modeRaw as ChartMode)) fail(fieldLine("mode"), `mode "${get("mode")}" — write "mode: round" or "mode: flat".`);
  const mode = modeRaw as ChartMode;

  const weightRaw = get("weight").toLowerCase();
  if (!WEIGHTS.includes(weightRaw as YarnWeight)) fail(fieldLine("weight"), `weight "${get("weight")}" — use one of ${WEIGHTS.join(", ")}.`);
  const weight = weightRaw as YarnWeight;

  let around = 1;
  let up = 1;
  let repeats = "1 around, 1 up";
  if (fields.has("repeats")) {
    const v = get("repeats");
    const rm = /^(\d+)\s+(around|across)\s*,\s*(\d+)\s+up$/i.exec(v);
    if (!rm) fail(fieldLine("repeats"), `repeats "${v}" — write it as "12 around, 1 up" (how many times around, how many times up).`);
    around = Number(rm[1]);
    up = Number(rm[3]);
    if (around < 1 || up < 1) fail(fieldLine("repeats"), `repeats "${v}" — the counts are whole numbers of 1 or more, like "12 around, 1 up".`);
    repeats = `${around} ${rm[2].toLowerCase()}, ${up} up`;
  }

  // Chart rows: ragged, unknown characters, size.
  const rows = chartRows.map((r) => r.text);
  const height = rows.length;
  const width = rows[0].length;
  rows.forEach((row, r) => {
    if (row.length !== width) fail(chartRows[r].line, `chart row ${r + 1} has ${row.length} stitches; the first row has ${width}. Every row must be the same length.`);
  });
  if (width > MAX_WIDTH) fail(chartRows[0].line, `Colourwork Kit prints up to ${MAX_WIDTH} × ${MAX_HEIGHT} on one page; this chart is ${width} wide.`);
  if (height > MAX_HEIGHT) fail(chartRows[height - 1].line, `Colourwork Kit prints up to ${MAX_WIDTH} × ${MAX_HEIGHT} on one page; this chart is ${height} tall.`);

  const symbols = new Map(key.map((k) => [k.symbol, k]));
  for (const row of chartRows)
    for (const ch of row.text)
      if (!symbols.has(ch)) fail(row.line, `"${ch}" isn't in the key — add it under "key:" or fix the chart.`);

  // The key: unique symbols and codes, first entry is MC, every entry used.
  const seenSymbol = new Map<string, number>();
  const seenCode = new Map<string, number>();
  for (const k of key) {
    if (seenSymbol.has(k.symbol)) fail(k.line, `"${k.symbol}" is already used at line ${seenSymbol.get(k.symbol)} — each chart character can only be one colour.`);
    seenSymbol.set(k.symbol, k.line);
    if (seenCode.has(k.code)) fail(k.line, `"${k.code}" is already used at line ${seenCode.get(k.code)} — each code names one colour.`);
    seenCode.set(k.code, k.line);
  }
  if (key[0].code !== "MC") fail(key[0].line, `the first key entry must be the MC main colour — start the key with something like ". MC Oatmeal #e8dfcd".`);
  const used = new Set(rows.join(""));
  for (const k of key)
    if (!used.has(k.symbol)) fail(k.line, `"${k.symbol}" (${k.code} ${k.name}) is in the key but the chart never uses it — remove it or fix the chart.`);

  // repeat: a column range counted from the right (1 is the rightmost stitch).
  let repeatFrom = 1;
  let repeatTo = width;
  if (fields.has("repeat")) {
    const v = get("repeat");
    const rm = /^(\d+)\s*-\s*(\d+)$/.exec(v);
    if (!rm) fail(fieldLine("repeat"), `repeat "${v}" — write a column range like "1-24" (columns are numbered from the right).`);
    const a = Number(rm[1]);
    const b = Number(rm[2]);
    if (a < 1) fail(fieldLine("repeat"), `repeat "${v}" — columns are numbered from 1 at the right edge.`);
    if (a > b) fail(fieldLine("repeat"), `repeat "${v}" — write the smaller column number first.`);
    if (b > width) fail(fieldLine("repeat"), `repeat "${v}" but the chart is only ${width} stitches wide — columns are numbered from the right, 1 to ${width}.`);
    repeatFrom = a;
    repeatTo = b;
  }

  const url = fields.has("url") ? get("url") : undefined;
  if (url && !/^https?:\/\//.test(url)) fail(fieldLine("url"), `url "${url}" — write the full link, like "https://wrenholloway.example/fernhill".`);

  // Derived: stitches per colour, with and without repeats, and yardage.
  const symToKey = new Map(key.map((k) => [k.symbol, k]));
  const chartStitches = new Map<string, number>();
  const inRepeat = new Map<string, number>();
  for (const row of rows)
    for (let c = 0; c < row.length; c++) {
      const colNum = width - c; // 1 at the right
      const k = symToKey.get(row[c])!;
      chartStitches.set(k.code, (chartStitches.get(k.code) ?? 0) + 1);
      if (colNum >= repeatFrom && colNum <= repeatTo) inRepeat.set(k.code, (inRepeat.get(k.code) ?? 0) + 1);
    }
  const colours: ChartColour[] = key.map((k) => {
    const chart = chartStitches.get(k.code) ?? 0;
    const rep = inRepeat.get(k.code) ?? 0;
    const section = rep * around * up + (chart - rep) * up;
    const yards = Math.ceil((section * YD_PER_STITCH[weight] * 1.1) / 5) * 5;
    return { ...k, chartStitches: chart, sectionStitches: section, yards };
  });

  return {
    title: get("title"),
    designer: get("designer"),
    mode,
    weight,
    repeats,
    around,
    up,
    repeatFrom,
    repeatTo,
    url,
    note: fields.has("note") && get("note") ? get("note") : undefined,
    key: colours,
    rows,
    width,
    height,
  };
}

/* ---------- derivations shared by every output ---------- */

/** The knit column number of a chart column index: 1 at the right, increasing left. */
export function columnNumber(chart: ChartData, colIndex: number): number {
  return chart.width - colIndex;
}

/** The knitting row number of a chart row index: rows[0] is the top line, the last row knitted. */
export function rowNumber(chart: ChartData, rowIndex: number): number {
  return chart.height - rowIndex;
}

/** Whether a knitting row is a right-side row: round charts are all worked on the right side. */
export function isRightSide(chart: ChartData, knitRow: number): boolean {
  return chart.mode === "round" || knitRow % 2 === 1;
}

/** The chart column indices in knitting order for a row: right-to-left on RS and in the round, left-to-right on WS. */
export function knitColumns(chart: ChartData, rowIndex: number): number[] {
  const rn = rowNumber(chart, rowIndex);
  const cols: number[] = [];
  if (isRightSide(chart, rn)) for (let c = chart.width - 1; c >= 0; c--) cols.push(c);
  else for (let c = 0; c < chart.width; c++) cols.push(c);
  return cols;
}

/** "Rnd 14" in the round, "Row 14 (RS)" or "Row 14 (WS)" flat. */
export function rowLabel(chart: ChartData, knitRow: number): string {
  if (chart.mode === "round") return `Rnd ${knitRow}`;
  return `Row ${knitRow} (${isRightSide(chart, knitRow) ? "RS" : "WS"})`;
}

export interface ColourRun {
  symbol: string;
  code: string;
  count: number;
}

/** One chart row's colour runs in knitting order: "MC 3, CC1 1, …". */
export function rowRuns(chart: ChartData, rowIndex: number): ColourRun[] {
  const row = chart.rows[rowIndex];
  const codeOf = new Map(chart.key.map((k) => [k.symbol, k.code]));
  const runs: ColourRun[] = [];
  for (const c of knitColumns(chart, rowIndex)) {
    const symbol = row[c];
    const last = runs[runs.length - 1];
    if (last && last.symbol === symbol) last.count++;
    else runs.push({ symbol, code: codeOf.get(symbol) ?? symbol, count: 1 });
  }
  return runs;
}

/** The written instruction for one chart row, e.g. "Row 14 (WS): MC 3, CC1 1 — 24 sts". */
export function instruction(chart: ChartData, rowIndex: number): string {
  const rn = rowNumber(chart, rowIndex);
  const runs = rowRuns(chart, rowIndex).map((r) => `${r.code} ${r.count}`).join(", ");
  return `${rowLabel(chart, rn)}: ${runs} — ${chart.width} sts`;
}

/**
 * Rows with two or more colours where one colour runs longer than MAX_FLOAT stitches.
 * In the round a row is circular, so a run can wrap from the left edge to the right.
 */
export function floatNotes(chart: ChartData): FloatNote[] {
  const codeOf = new Map(chart.key.map((k) => [k.symbol, k.code]));
  const notes: FloatNote[] = [];
  chart.rows.forEach((row, r) => {
    const distinct = new Set(row).size;
    if (distinct < 2) return;
    const seq = knitColumns(chart, r).map((c) => row[c]);
    // Runs in knitting order.
    const runs: { symbol: string; count: number }[] = [];
    for (const s of seq) {
      const last = runs[runs.length - 1];
      if (last && last.symbol === s) last.count++;
      else runs.push({ symbol: s, count: 1 });
    }
    // In the round the row is circular: when the first and last runs share a colour they are one float.
    if (chart.mode === "round" && runs.length > 1 && runs[0].symbol === runs[runs.length - 1].symbol) {
      const merged = { symbol: runs[0].symbol, count: runs[0].count + runs[runs.length - 1].count };
      runs.splice(0, 1);
      runs.pop();
      runs.unshift(merged);
    }
    for (const run of runs)
      if (run.count > MAX_FLOAT)
        notes.push({
          row: rowNumber(chart, r),
          label: rowLabel(chart, rowNumber(chart, r)),
          code: codeOf.get(run.symbol) ?? run.symbol,
          stitches: run.count,
        });
  });
  // Knitting order: the first float to catch is on the first row that has one.
  return notes.sort((a, b) => a.row - b.row);
}

/** The full sentence for a float note, e.g. "Rnd 14: 9-st float in MC, catch it at the middle". */
export function floatNoteText(note: FloatNote): string {
  const advice = note.stitches <= 12 ? "catch it at the middle" : "catch it every few stitches";
  return `${note.label}: ${note.stitches}-st float in ${note.code}, ${advice}`;
}

/**
 * Rows that carry three or more colours at once. Stranded colourwork usually carries two
 * yarns per row; a third means the floats on the wrong side get crowded. A note, not an error.
 */
export function colourNotes(chart: ChartData): ColourNote[] {
  const notes: ColourNote[] = [];
  chart.rows.forEach((row, r) => {
    const colours = new Set(row).size;
    if (colours > 2) {
      const rn = rowNumber(chart, r);
      notes.push({ row: rn, label: rowLabel(chart, rn), colours });
    }
  });
  return notes.sort((a, b) => a.row - b.row);
}

/** The full sentence for a colour note, e.g. "Rnd 5 carries 3 colours; stranded rows usually carry two". */
export function colourNoteText(note: ColourNote): string {
  return `${note.label} carries ${note.colours} colours; stranded rows usually carry two`;
}

/** All written instructions, bottom row first (row 1 is knitted first). */
export function instructions(chart: ChartData): string[] {
  const out: string[] = [];
  for (let r = chart.height - 1; r >= 0; r--) out.push(instruction(chart, r));
  return out;
}

/** The repeat column range as 0-based chart column indices [first, last], inclusive. */
export function repeatColumns(chart: ChartData & { repeatFrom?: number; repeatTo?: number }): { first: number; last: number } {
  const from = chart.repeatFrom ?? 1;
  const to = chart.repeatTo ?? chart.width;
  return { first: chart.width - to, last: chart.width - from };
}

/** The masthead kicker, e.g. "Colourwork chart · in the round · 24-st repeat × 12". */
export function chartKicker(chart: ParsedChart): string {
  const repW = chart.repeatTo - chart.repeatFrom + 1;
  const parts = ["Colourwork chart", chart.mode === "round" ? "in the round" : "worked flat", `${repW}-st repeat`];
  if (chart.around > 1) parts[2] += ` × ${chart.around}`;
  if (chart.up > 1) parts.push(`${chart.up} up`);
  return parts.join(" · ");
}

/** One line describing the yarn and repeats, for captions and standfirsts: "Fingering weight · 12 around, 1 up". */
export function chartFacts(chart: ParsedChart): string {
  const facts = `${WEIGHT_LABEL[chart.weight]} weight · ${chart.repeats}`;
  return facts[0].toUpperCase() + facts.slice(1);
}

const COUNT_WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * The masthead's derived sentence for the email's italic standfirst, e.g.
 * "Four colours, a 24-stitch repeat, worked in the round."
 */
export function chartSentence(chart: ParsedChart): string {
  const repW = chart.repeatTo - chart.repeatFrom + 1;
  const colours = chart.key.length <= 10 ? COUNT_WORD[chart.key.length] : String(chart.key.length);
  const mode = chart.mode === "round" ? "worked in the round" : "worked back and forth";
  return `${colours[0].toUpperCase()}${colours.slice(1)} colours, a ${repW}-stitch repeat, ${mode}.`;
}
