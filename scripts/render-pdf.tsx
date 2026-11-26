import { mkdir, writeFile } from "node:fs/promises";
import { ElementsError, formatDiagnostics, outline, render, validate } from "@hyper-elements/react";
import { renderPdf } from "@hyper-elements/react/pdf";
import { ColourworkPdf } from "../src/pdf";
import { loadChart } from "./chart";
import { loadFonts } from "./fonts";

const { chart, base } = await loadChart();
const design = <ColourworkPdf chart={chart} />;
await mkdir("out", { recursive: true });
const report = validate(design);
if (report.diagnostics.length) console.log(formatDiagnostics(report.diagnostics));
if (process.argv.includes("--outline")) console.log(outline(design));
if (!report.valid) process.exit(1);
try {
  const { html } = await render(design);
  await writeFile(`out/${base}.print.html`, html);
  const { pdf, diagnostics } = await renderPdf(design, { fonts: await loadFonts() });
  if (diagnostics.length) console.log(formatDiagnostics(diagnostics));
  await writeFile(`out/${base}.pdf`, pdf);
  console.log(`wrote out/${base}.pdf`);
} catch (e) {
  if (!(e instanceof ElementsError)) throw e;
  console.error(formatDiagnostics(e.diagnostics));
  process.exitCode = 1;
}
