import { Column, defineElement, Heading, MergeTag, prop, Table, TableCell, TableRow, Text, token } from "@hyper-elements/react";
import { columnNumber, rowNumber } from "./chart";
import type { ChartData } from "./chart";
import type { ParsedChart } from "./types";

const thin = { width: 1, style: "solid", color: token("colors.gridline") } as const;
const heavy = { width: 2, style: "solid", color: token("colors.rule") } as const;
const frameLine = { width: 2, style: "solid", color: token("colors.rule") } as const;
// The every-10 guide lines: one pixel in a mid tone, clearly lighter than the repeat frame.
const rulerLine = { width: 1, style: "solid", color: token("colors.ruler") } as const;
// A zero-width line: the merged email chart drops every internal gridline.
const noLine = { width: 0, style: "solid", color: token("colors.gridline") } as const;

/** WCAG relative luminance of a #rrggbb colour, to pick a readable symbol tone. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const chan = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
}

interface Run {
  symbol: string;
  start: number; // first chart column index, left to right
  end: number; // last chart column index, inclusive
}

/**
 * The chart as plain table cells — the one layout the PDF, the email and the card all draw.
 * Each stitch is a cell in its yarn colour; stitch numbers run right to left along the bottom
 * and row numbers sit on the side the knitter reads them from (right in the round; odd rows
 * right, even rows left flat). A heavier line marks every tenth stitch and row, and the edges
 * of the repeat columns carry a heavier line with an optional "×12" label underneath.
 * `symbols` prints each non-MC cell's key character so a black-and-white print still reads;
 * `tracker` adds a column of empty boxes to tick off rounds; `merged` run-length-merges
 * same-colour neighbours with colSpan for the email's size limit.
 */
export const ColourChart = defineElement({
  type: "colourwork.ColourChart",
  label: "Colourwork chart",
  description:
    "A stranded colourwork chart as table cells: yarn-coloured stitches with row and column numbers, the repeat marked, optional printed symbols, a tick-off column, and run merging for email.",
  props: {
    rows: prop.list(prop.text({ label: "Chart row" }), { label: "Chart rows", required: true, min: 1, max: 70 }),
    colours: prop.list(
      prop.object(
        {
          symbol: prop.text({ label: "Symbol", required: true, pattern: "^\\S$" }),
          code: prop.text({ label: "Code", required: true, maxLength: 8, pattern: "^[A-Za-z0-9]+$" }),
          name: prop.text({ label: "Colour name", required: true, maxLength: 40 }),
          hex: prop.color({ label: "Yarn colour", required: true }),
        },
        { label: "Colour" },
      ),
      { label: "Key", required: true, min: 1, max: 8 },
    ),
    mode: prop.choice(["round", "flat"] as const, { label: "Mode", required: true }),
    cell: prop.number({ label: "Cell size", required: true, min: 8, max: 140, integer: true }),
    repeatFrom: prop.number({ label: "Repeat from", min: 1, integer: true }),
    repeatTo: prop.number({ label: "Repeat to", min: 1, integer: true }),
    repeatLabel: prop.text({ label: "Repeat label", maxLength: 10 }),
    symbols: prop.boolean({ label: "Print key symbols", default: false }),
    tracker: prop.boolean({ label: "Tick-off column", default: false }),
    merged: prop.boolean({ label: "Merge colour runs", default: false }),
    ruler: prop.boolean({ label: "Line every 10 stitches", default: true }),
    rowNumbers: prop.boolean({ label: "Row numbers", default: true }),
  },
  render: ({ rows: rawRows, colours, mode, cell, repeatFrom, repeatTo, repeatLabel, symbols, tracker, merged, ruler, rowNumbers }) => {
    // Defensive normalisation: the parser guarantees a rectangle, but a hand-built element shouldn't crash.
    const fill = colours[0]?.symbol ?? ".";
    const width = Math.max(0, ...rawRows.map((r) => r.length));
    const height = rawRows.length;
    const rows = rawRows.map((r) => r.slice(0, width).padEnd(width, fill));
    const chart: ChartData = { mode, rows, width, height, key: colours };
    const bySymbol = new Map(colours.map((c) => [c.symbol, c]));
    const colourOf = (symbol: string) => bySymbol.get(symbol) ?? colours[0];

    const numW = Math.min(36, Math.max(14, Math.round(cell * 0.55)));
    const trackW = Math.round(cell * 0.62);
    const gapW = Math.max(4, Math.round(cell * 0.22));
    const numSize = Math.max(6, Math.round(cell * 0.3));
    const symSize = Math.round(cell * 0.44);
    const colNumSize = Math.max(7, Math.round(cell * 0.26));
    const numPad = Math.max(0, Math.floor((cell - numSize) / 2));
    const frameW = Math.max(2, Math.round(cell / 18));

    const repFrom = repeatFrom ?? 1;
    const repTo = repeatTo ?? width;
    const repFirst = width - repTo; // 0-based index of the repeat's left edge
    const repLast = width - repFrom; // 0-based index of the repeat's right edge
    const doMerge = merged && !symbols; // symbols need one cell per stitch

    const symbolInk = (hex: string) => (luminance(hex) > 0.55 ? token("colors.foreground") : token("colors.onYarn"));

    /** Border sides for the run of stitches whose left edge is at index `start` and right edge at `end`. */
    const runBorder = (r: number, start: number, end: number) => {
      const rn = rowNumber(chart, r);
      const leftNum = columnNumber(chart, start);
      const rightNum = columnNumber(chart, end);
      if (doMerge) {
        // The email's merged chart drops every internal gridline; only a repeat edge that falls
        // inside the chart keeps its heavier line (the table's own border is the outer frame).
        // Omitting `border` entirely keeps the markup small — email clients default to none.
        const right = rightNum === repFrom && repLast < width - 1;
        const left = leftNum === repTo && repFirst > 0;
        if (!right && !left) return undefined;
        return { top: noLine, right: right ? heavy : noLine, bottom: noLine, left: left ? heavy : noLine } as const;
      }
      return {
        top: ruler && rn % 10 === 0 ? rulerLine : thin,
        right: rightNum === repFrom ? heavy : thin,
        bottom: thin,
        left: leftNum === repTo ? heavy : ruler && leftNum % 10 === 0 ? rulerLine : thin,
      } as const;
    };

    const stitchCell = (r: number, c: number) => {
      const colour = colourOf(rows[r][c]);
      const showSymbol = symbols && colour.code !== "MC";
      const border = runBorder(r, c, c);
      // Centre the symbol with top and bottom padding — but the border counts against the
      // room the PDF gives the text, so leave it slack or react-pdf drops the glyph.
      const borderTB = (border?.top?.width ?? 0) + (border?.bottom?.width ?? 0);
      const pad = Math.max(0, Math.floor((cell - symSize - borderTB) / 2));
      return (
        <TableCell
          key={c}
          style={{
            width: cell,
            padding: [pad, 0, pad, 0],
            border,
            verticalAlign: "top",
            textAlign: "center",
            backgroundColor: colour.hex,
            fontFamily: token("fonts.label"),
            fontWeight: 600,
            fontSize: symSize,
            lineHeight: 1,
            color: showSymbol ? symbolInk(colour.hex) : undefined,
          }}
        >
          {showSymbol ? colour.symbol : "\u00a0"}
        </TableCell>
      );
    };

    const mergedCell = (r: number, run: Run) => {
      const colour = colourOf(run.symbol);
      return (
        <TableCell
          key={run.start}
          colSpan={run.end - run.start + 1}
          style={{
            border: runBorder(r, run.start, run.end),
            backgroundColor: colour.hex,
            fontSize: 1,
            lineHeight: 1,
          }}
        >
          {"\u00a0"}
        </TableCell>
      );
    };

    /** Consecutive same-colour cells left to right — the runs a merged row draws. */
    const displayRuns = (rowText: string): Run[] => {
      const runs: Run[] = [];
      for (let c = 0; c < rowText.length; c++) {
        const last = runs[runs.length - 1];
        if (last && last.symbol === rowText[c]) last.end = c;
        else runs.push({ symbol: rowText[c], start: c, end: c });
      }
      return runs;
    };

    const numCell = (show: boolean, rn: number) => (
      <TableCell
        style={{
          width: numW,
          padding: [numPad, 0, numPad, 0],
          verticalAlign: "top",
          textAlign: "center",
          fontFamily: token("fonts.label"),
          fontWeight: 600,
          fontSize: numSize,
          lineHeight: 1,
          color: token("colors.muted"),
        }}
      >
        {show ? String(rn) : "\u00a0"}
      </TableCell>
    );

    const emptySideCell = (w: number, key = "side") => (
      <TableCell key={key} style={{ width: w, padding: 0, fontSize: 1, lineHeight: 1 }}>{"\u00a0"}</TableCell>
    );

    const chartRows = rows.map((rowText, r) => {
      const rn = rowNumber(chart, r);
      const leftShows = mode === "flat" && rn % 2 === 0; // even (WS) numbers on the left
      const rightShows = mode === "round" || rn % 2 === 1; // odd (RS) numbers on the right
      return (
        <TableRow key={r} style={{ height: cell }}>
          {tracker ? (
            <>
              <TableCell style={{ width: trackW, padding: 0, border: { top: thin, right: thin, bottom: thin, left: thin }, fontSize: 1, lineHeight: 1 }}>
                {"\u00a0"}
              </TableCell>
              <TableCell style={{ width: gapW, padding: 0, fontSize: 1, lineHeight: 1 }}>{"\u00a0"}</TableCell>
            </>
          ) : null}
          {mode === "flat" && rowNumbers ? numCell(leftShows, rn) : null}
          {doMerge ? displayRuns(rowText).map((run) => mergedCell(r, run)) : [...rowText].map((_, c) => stitchCell(r, c))}
          {rowNumbers ? numCell(rightShows, rn) : null}
        </TableRow>
      );
    });

    // The stitch-number row doubles as the sizing row in merged mode: one cell per column at `cell` width.
    const numberRow = (
      <TableRow>
        {tracker ? emptySideCell(trackW) : null}
        {tracker ? emptySideCell(gapW, "gap") : null}
        {mode === "flat" && rowNumbers ? emptySideCell(numW) : null}
        {rows[0] ? [...rows[0]].map((_, c) => (
          <TableCell
            key={c}
            style={{
              width: cell,
              padding: [2, 0],
              textAlign: "center",
              fontFamily: token("fonts.label"),
              fontWeight: 600,
              fontSize: colNumSize,
              lineHeight: 1,
              color: token("colors.muted"),
            }}
          >
            {columnNumber(chart, c)}
          </TableCell>
        )) : null}
        {rowNumbers ? emptySideCell(numW) : null}
      </TableRow>
    );

    const labelRow = repeatLabel ? (
      <TableRow>
        {tracker ? emptySideCell(trackW) : null}
        {tracker ? emptySideCell(gapW, "gap") : null}
        {mode === "flat" && rowNumbers ? emptySideCell(numW) : null}
        {repFirst > 0 ? <TableCell colSpan={repFirst} style={{ padding: 0, fontSize: 1, lineHeight: 1 }}>{"\u00a0"}</TableCell> : null}
        <TableCell
          colSpan={repLast - repFirst + 1}
          style={{
            padding: [4, 0],
            textAlign: "center",
            fontFamily: token("fonts.label"),
            fontWeight: 600,
            fontSize: Math.max(colNumSize + 1, 8),
            lineHeight: 1,
            color: token("colors.muted"),
          }}
        >
          {repeatLabel}
        </TableCell>
        {repFrom > 1 ? <TableCell colSpan={repFrom - 1} style={{ padding: 0, fontSize: 1, lineHeight: 1 }}>{"\u00a0"}</TableCell> : null}
        {rowNumbers ? emptySideCell(numW) : null}
      </TableRow>
    ) : null;

    const totalW = (tracker ? trackW + gapW : 0) + (rowNumbers ? (mode === "flat" ? 2 : 1) * numW : 0) + width * cell;

    return (
      <Table style={{ width: totalW, borderCollapse: "collapse", border: { ...frameLine, width: frameW } }}>
        {chartRows}
        {numberRow}
        {labelRow}
      </Table>
    );
  },
});

/** The props every output shares for a parsed chart; each root adds its own cell size and flags. */
export function colourChartProps(chart: ParsedChart) {
  return {
    rows: chart.rows,
    colours: chart.key.map((k) => ({ symbol: k.symbol, code: k.code, name: k.name, hex: k.hex })),
    mode: chart.mode,
    repeatFrom: chart.repeatFrom,
    repeatTo: chart.repeatTo,
    repeatLabel: chart.around > 1 ? `×${chart.around}` : undefined,
  } as const;
}

/** The props every output shares for the yarn legend. */
export function yarnKeyColours(chart: ParsedChart) {
  return chart.key.map((k) => ({ code: k.code, name: k.name, hex: k.hex, stitches: k.sectionStitches, yards: k.yards }));
}

/**
 * The yarn legend: a swatch, the code, the colour name, the stitches for the charted section
 * and the yardage estimate, with the disclaimer underneath.
 */
export const YarnKey = defineElement({
  type: "colourwork.YarnKey",
  label: "Yarn key",
  description: "Each yarn colour with its swatch, code, name, stitch count and estimated yards for the charted section.",
  props: {
    colours: prop.list(
      prop.object(
        {
          code: prop.text({ label: "Code", required: true, maxLength: 8 }),
          name: prop.text({ label: "Colour", required: true, maxLength: 40 }),
          hex: prop.color({ label: "Swatch", required: true }),
          stitches: prop.number({ label: "Stitches", required: true, min: 0, integer: true }),
          yards: prop.number({ label: "Yards", required: true, min: 0, integer: true }),
        },
        { label: "Colour" },
      ),
      { label: "Colours", required: true, min: 1, max: 8 },
    ),
    footnote: prop.text({ label: "Footnote", maxLength: 200 }),
  },
  render: ({ colours, footnote }) => {
    const head = { fontFamily: token("fonts.label"), fontSize: token("fontSizes.label"), fontWeight: 600 as const, color: token("colors.muted"), lineHeight: 1.2, verticalAlign: "middle" as const };
    const body = { verticalAlign: "middle" as const, lineHeight: 1.3 };
    const num = { fontFamily: token("fonts.label"), fontWeight: 600 as const };
    return (
      <Column style={{ gap: 6 }}>
        <Table style={{ width: "100%", borderCollapse: "collapse", rowBorder: thin }}>
          <TableRow header>
            <TableCell style={{ width: 30, padding: [0, 6, 7, 0], verticalAlign: "middle" }} />
            <TableCell style={{ ...head, padding: [0, 10, 7, 0] }}>Code</TableCell>
            <TableCell style={{ ...head, padding: [0, 10, 7, 0] }}>Colour</TableCell>
            <TableCell style={{ ...head, padding: [0, 10, 7, 0], textAlign: "right" }}>Stitches</TableCell>
            <TableCell style={{ ...head, padding: [0, 0, 7, 10], textAlign: "right" }}>Est. yards</TableCell>
          </TableRow>
          {colours.map((c) => (
            <TableRow key={c.code}>
              <TableCell style={{ width: 30, padding: [4, 6, 4, 0], backgroundColor: c.hex, border: thin, verticalAlign: "middle" }}>
                {"\u00a0"}
              </TableCell>
              <TableCell style={{ ...body, ...num, padding: [4, 10, 4, 0], fontSize: token("fontSizes.body") }}>{c.code}</TableCell>
              <TableCell style={{ ...body, padding: [4, 10, 4, 0] }}>{c.name}</TableCell>
              <TableCell style={{ ...body, ...num, padding: [4, 10, 4, 0], textAlign: "right" }}>{c.stitches.toLocaleString("en-US")}</TableCell>
              <TableCell style={{ ...body, ...num, padding: [4, 0, 4, 10], textAlign: "right" }}>≈{c.yards.toLocaleString("en-US")} yd</TableCell>
            </TableRow>
          ))}
        </Table>
        {footnote ? <Text style={{ apply: ["caption"] }}>{footnote}</Text> : null}
      </Column>
    );
  },
});

/**
 * The pattern leaflet's header: a small sans kicker, the Fraunces title, an optional standfirst
 * (which can open "Hi {{first_name}}!" for the sending service to fill) and the designer's credit.
 */
export const Masthead = defineElement({
  type: "colourwork.Masthead",
  label: "Pattern masthead",
  description: "A small sans kicker, the serif title, an optional italic standfirst with a greeting merge tag, and the designer's credit.",
  props: {
    kicker: prop.text({ label: "Kicker", required: true, maxLength: 90 }),
    title: prop.text({ label: "Title", required: true, maxLength: 50 }),
    designer: prop.text({ label: "Designer", maxLength: 60 }),
    standfirst: prop.text({ label: "Standfirst", maxLength: 160 }),
    greetingMergeTag: prop.text({ label: "Greeting merge tag", maxLength: 40, pattern: "^[A-Za-z_][A-Za-z0-9_]*$" }),
    fitTitle: prop.boolean({ label: "Shrink title to one line", default: false }),
  },
  render: ({ kicker, title, designer, standfirst, greetingMergeTag, fitTitle }) => (
    <Column style={{ gap: 10 }}>
      <Text style={{ apply: ["label"], padding: [0, 0, 2, 0] }}>{kicker}</Text>
      <Heading level={1} fit={fitTitle ? { sizes: [72, 62, 52, 44], maxLines: 1 } : undefined}>{title}</Heading>
      {standfirst || greetingMergeTag ? (
        <Text style={{ apply: ["standfirst"] }}>
          {greetingMergeTag ? (
            <>
              Hi <MergeTag name={greetingMergeTag} />.{" "}
            </>
          ) : null}
          {standfirst}
        </Text>
      ) : null}
      {designer ? <Text style={{ apply: ["designer"] }}>{`Chart by ${designer}`}</Text> : null}
    </Column>
  ),
});
