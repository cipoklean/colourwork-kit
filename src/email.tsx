import { Button, Column, Email, Heading, Section, Text, token } from "@hyper-elements/react";
import { chartKicker, chartSentence, YARDAGE_NOTE, WEIGHT_LABEL } from "./chart";
import { colourChartProps, ColourChart, Masthead, YarnKey, yarnKeyColours } from "./elements";
import { webFonts } from "./fonts";
import { colourworkTheme } from "./theme";
import type { ParsedChart } from "./types";

/** The email's content column is 552px inside its 24px side padding; cap cells at 18px. */
function emailCell(chart: ParsedChart): number {
  const numberCols = chart.mode === "flat" ? 2 : 1;
  return Math.max(8, Math.min(18, Math.floor(540 / (chart.width + numberCols * 0.6))));
}

/** One or two sentences of newsletter copy before the chart, built from the chart's own facts. */
function emailIntro(chart: ParsedChart): string {
  const repW = chart.repeatTo - chart.repeatFrom + 1;
  const dir = chart.mode === "round" ? "around" : "across";
  const repClause =
    chart.around > 1 || chart.up > 1
      ? `, worked ${[chart.around > 1 ? `${chart.around} times ${dir}` : null, chart.up > 1 ? `${chart.up} times up` : null].filter(Boolean).join(" and ")}`
      : "";
  return `${chart.title} is out today — a ${WEIGHT_LABEL[chart.weight]}-weight colourwork chart from ${chart.designer}. One ${repW}-stitch repeat${repClause}; the yarn list below says how much of each colour it takes.`;
}

/** The designer's "new pattern" email: masthead, the chart as merged table cells, the yarn key, one button. */
export function ColourworkEmail({ chart, theme = colourworkTheme }: { chart: ParsedChart; theme?: typeof colourworkTheme }) {
  const kicker = `New pattern · ${chartKicker(chart).replace(/^Colourwork chart · /, "")}`;
  return (
    <Email
      theme={theme}
      width={600}
      lang="en"
      fonts={webFonts}
      title={`${chart.title} — colourwork chart`}
      previewText={`${chart.title}: a ${WEIGHT_LABEL[chart.weight]} colourwork chart from ${chart.designer}.`}
      style={{ gap: 0 }}
    >
      <Section style={{ padding: [36, 24, 26, 24] }}>
        <Masthead
          kicker={kicker}
          title={chart.title}
          designer={chart.designer}
          standfirst={chartSentence(chart)}
          greetingMergeTag="first_name"
        />
      </Section>
      <Section style={{ padding: [0, 24, 30, 24], gap: 22, alignItems: "center" }}>
        <Text>{emailIntro(chart)}</Text>
        <ColourChart {...colourChartProps(chart)} cell={emailCell(chart)} merged rowNumbers={false} />
        <Column style={{ width: "100%", gap: 4 }}>
          <Text style={{ apply: ["label"] }}>{"Yarn — for the charted section, you'll need about:"}</Text>
          <YarnKey colours={yarnKeyColours(chart)} />
        </Column>
        {chart.url ? <Button href={chart.url}>Get the pattern</Button> : null}
      </Section>
      {chart.note ? (
        <Section tokens={{ colors: { background: token("colors.surface") } }} style={{ padding: [20, 24], gap: 4 }}>
          <Heading level={2}>From the designer</Heading>
          <Text>{chart.note}</Text>
          <Text style={{ apply: ["caption"] }}>{chart.url ? `${chart.designer} · ${chart.url.replace("https://", "")}` : chart.designer}</Text>
        </Section>
      ) : null}
      <Section style={{ padding: [16, 24, 28, 24] }}>
        <Text style={{ apply: ["caption"], textAlign: "center" }}>{YARDAGE_NOTE}</Text>
      </Section>
    </Email>
  );
}
