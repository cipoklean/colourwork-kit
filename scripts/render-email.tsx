// Writes the email as HTML and plain text, checked against 11 email clients, and reports its size
// (Gmail clips at 102 KB; the kit keeps it under 90 KB).
// --preview also draws it in classic Outlook, the Gmail app and Apple Mail (light and dark).
import { mkdir, writeFile } from "node:fs/promises";
import { ElementsError, formatDiagnostics, render } from "@hyper-elements/react";
import { emailClients, renderInEmailClients } from "@hyper-elements/email-clients";
import { ColourworkEmail } from "../src/email";
import { loadChart } from "./chart";

// What the sending service fills in, for the previews only. The HTML in out/ keeps {{first_name}}.
const sample: Record<string, string> = { first_name: "Ada" };

const { chart, base } = await loadChart();
const design = <ColourworkEmail chart={chart} />;
await mkdir("out/email/previews", { recursive: true });
try {
  const { html, text, diagnostics } = await render(design, { plugins: [await emailClients()] });
  if (diagnostics.length) console.log(formatDiagnostics(diagnostics));
  await writeFile(`out/email/${base}.email.html`, html);
  await writeFile(`out/email/${base}.email.txt`, text);
  const kb = (html.length / 1024).toFixed(1);
  console.log(`wrote out/email/${base}.email.html and .txt — ${html.length} bytes (${kb} KB${html.length > 90 * 1024 ? ", OVER the 90 KB budget" : ""})`);
  if (process.argv.includes("--preview")) {
    const { previews, skipped } = await renderInEmailClients(design, {
      emailClients: ["outlook", "gmail-app", "apple-mail"],
      computers: ["windows"],
      dark: true,
      fonts: "inline",
      mergeTag: (name) => sample[name] ?? `{{${name}}}`,
    });
    for (const p of previews) await writeFile(`out/email/previews/${p.filename}`, p.html);
    console.log("previews:", previews.map((p) => p.filename).join(", "));
    if (skipped.length) console.log("skipped:", JSON.stringify(skipped));
  }
} catch (e) {
  if (!(e instanceof ElementsError)) throw e;
  console.error(formatDiagnostics(e.diagnostics));
  process.exitCode = 1;
}
