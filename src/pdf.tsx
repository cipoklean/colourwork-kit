import { Column, Document, Heading, Link, List, ListItem, PageBreak, PageFooter, PageNumber, Row, Table, TableCell, TableRow, Text, token } from "@hyper-elements/react";
import { chartFacts, chartKicker, colourNoteText, colourNotes, floatNoteText, floatNotes, instructions, YARDAGE_NOTE } from "./chart";
import { colourChartProps, ColourChart, Masthead, YarnKey, yarnKeyColours } from "./elements";
import { webFonts } from "./fonts";
import { colourworkTheme } from "./theme";
import type { ParsedChart } from "./types";

/** Letter is 816 x 1056 px at 96 dpi; margin 44 leaves 728 x 968 of content. */
const PAGE_W = 728;
const PAGE_H = 968;
/** Room the masthead, the yarn key, the gaps and the footer take on page one. */
const CHROME_H = 372;
const NUM_W = 76;

/** The largest square stitch that keeps page one to one page, capped so small charts don't sprawl. */
function chartCell(chart: ParsedChart): number {
  const byWidth = Math.floor((PAGE_W - NUM_W) / chart.width);
  const byHeight = Math.floor((PAGE_H - CHROME_H) / (chart.height + 1));
  return Math.max(10, Math.min(30, byWidth, byHeight));
}

/** One written row with a box to tick it off in. */
function instructionTable(lines: string[]) {
  return (
    <Table style={{ width: "100%", borderCollapse: "collapse" }}>
      {lines.map((line, i) => (
        <TableRow key={i}>
          <TableCell style={{ width: 20, padding: [3, 8, 3, 0], border: { width: 1, style: "solid", color: token("colors.rule") }, fontSize: 1, lineHeight: 1 }}>
            {"\u00a0"}
          </TableCell>
          <TableCell style={{ padding: [3, 0, 3, 10], fontSize: token("fontSizes.row"), lineHeight: 1.35 }}>{line}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

/** Page one is the chart to knit from, with its yarn key; page two is the written rows, the float check and the notes. */
export function ColourworkPdf({ chart, theme = colourworkTheme }: { chart: ParsedChart; theme?: typeof colourworkTheme }) {
  const cell = chartCell(chart);
  const lines = instructions(chart);
  const checks = [
    ...floatNotes(chart).map((f) => ({ row: f.row, text: floatNoteText(f) })),
    ...colourNotes(chart).map((c) => ({ row: c.row, text: colourNoteText(c) })),
  ].sort((a, b) => a.row - b.row);
  const twoCols = lines.length > 20;
  const half = Math.ceil(lines.length / 2);
  return (
    <Document theme={theme} size="Letter" margin={44} lang="en" fonts={webFonts} title={`${chart.title} — colourwork chart`} style={{ gap: 26 }}>
      <PageFooter>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ apply: ["caption"] }}>
            {`${chart.designer} · `}
            {chart.url ? <Link href={chart.url} style={{ textDecoration: "none" }}>{chart.url.replace("https://", "")}</Link> : null}
          </Text>
          <Text style={{ apply: ["caption"], textAlign: "right" }}>
            Page <PageNumber /> of <PageNumber total />
          </Text>
        </Row>
      </PageFooter>

      <Masthead kicker={chartKicker(chart)} title={chart.title} designer={chart.designer} standfirst={chartFacts(chart)} />
      <Column style={{ alignItems: "center" }}>
        <ColourChart {...colourChartProps(chart)} cell={cell} symbols tracker ruler />
      </Column>
      <Column style={{ gap: 4 }}>
        <Heading level={2}>Yarn</Heading>
        <YarnKey colours={yarnKeyColours(chart)} footnote={YARDAGE_NOTE} />
      </Column>

      <PageBreak />

      <Column style={{ gap: 14 }}>
        <Column style={{ gap: 10 }}>
          <Heading level={2}>Written instructions</Heading>
          <Text style={{ apply: ["caption"] }}>{`${chart.title} · ${chartFacts(chart)} — knit every row in the order shown, right side first.`}</Text>
        </Column>
        {twoCols ? (
          <Row style={{ gap: 36, alignItems: "start" }}>
            <Column style={{ flex: 1 }}>{instructionTable(lines.slice(0, half))}</Column>
            <Column style={{ flex: 1 }}>{instructionTable(lines.slice(half))}</Column>
          </Row>
        ) : (
          instructionTable(lines)
        )}

        <Column style={{ gap: 6 }}>
          <Heading level={2}>Checks</Heading>
          {checks.length ? (
            <List type="bullet" style={{ gap: 4 }}>
              {checks.map((c, i) => (
                <ListItem key={i} style={{ fontSize: token("fontSizes.row") }}>{c.text}</ListItem>
              ))}
            </List>
          ) : (
            <Text style={{ apply: ["muted"] }}>No long floats and no rows over two colours — the chart stays inside stranded convention.</Text>
          )}
        </Column>

        <Text style={{ apply: ["caption"] }}>{YARDAGE_NOTE}</Text>

        {chart.note ? (
          <Column tokens={{ colors: { background: token("colors.surface") } }} style={{ backgroundColor: token("colors.surface"), padding: [14, 22], gap: 6 }}>
            <Heading level={2}>From the designer</Heading>
            <Text>{chart.note}</Text>
            <Text style={{ apply: ["caption"] }}>{chart.url ? `${chart.designer} · ${chart.url.replace("https://", "")}` : chart.designer}</Text>
          </Column>
        ) : null}
      </Column>
    </Document>
  );
}
