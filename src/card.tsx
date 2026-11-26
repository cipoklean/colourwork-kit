import { Canvas, Column, Row, Text, token } from "@hyper-elements/react";
import { chartFacts, chartKicker } from "./chart";
import { colourChartProps, ColourChart, Masthead } from "./elements";
import { colourworkTheme } from "./theme";
import type { ParsedChart } from "./types";

/** The portrait card for Instagram or Ravelry: the chart large on a wool band, the yarns beneath, the link at the foot. */
export function ColourworkCard({ chart, theme = colourworkTheme }: { chart: ParsedChart; theme?: typeof colourworkTheme }) {
  // 1080x1350 with 56px padding leaves 968x1238; masthead, swatches, footer and gaps take ~540.
  const cell = Math.max(14, Math.min(38, Math.floor(950 / chart.width), Math.floor(760 / (chart.height + 2))));
  const url = chart.url?.replace("https://", "") ?? "";
  return (
    <Canvas theme={theme} lang="en" width={1080} height={1350} title={`${chart.title} — colourwork chart`} style={{ padding: 56, gap: 26, justifyContent: "space-between" }}>
      <Masthead kicker={chartKicker(chart)} title={chart.title} standfirst={chartFacts(chart)} fitTitle />
      <Column style={{ alignItems: "center", backgroundColor: token("colors.surface"), padding: [26, 0] }}>
        <ColourChart {...colourChartProps(chart)} cell={cell} ruler />
      </Column>
      <Row style={{ gap: 24, justifyContent: "center" }}>
        {chart.key.map((k) => (
          <Column key={k.code} style={{ gap: 8, alignItems: "center", width: 200 }}>
            <Column style={{ width: 42, height: 42, backgroundColor: k.hex, border: { width: 1, style: "solid", color: token("colors.rule") } }} />
            <Column style={{ gap: 2, alignItems: "center" }}>
              <Text style={{ apply: ["label"] }}>{`${k.code} · ${k.name}`}</Text>
              <Text style={{ apply: ["caption"] }}>{`≈ ${k.yards.toLocaleString("en-US")} yd`}</Text>
            </Column>
          </Column>
        ))}
      </Row>
      <Column style={{ gap: 6, alignItems: "center" }}>
        <Text style={{ apply: ["designer"] }} fit={{ sizes: [40, 36, 32], maxLines: 1 }}>{`Chart by ${chart.designer}`}</Text>
        {url ? (
          <Text style={{ apply: ["number"], color: token("colors.primary") }} fit={{ sizes: [34, 30, 26], maxLines: 1 }}>
            {url}
          </Text>
        ) : null}
      </Column>
    </Canvas>
  );
}
