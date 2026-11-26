import { readFile } from "node:fs/promises";

const f = (p: string) => readFile(new URL(`../fonts/${p}`, import.meta.url));

/** Font files for renderPdf and renderImage, which load nothing themselves. */
export async function loadFonts() {
  const out: { family: string; src: Buffer; weight: number; style?: "normal" | "italic" }[] = [];
  for (const w of [500, 600, 700]) out.push({ family: "Fraunces", src: await f(`Fraunces-${w}.ttf`), weight: w });
  out.push({ family: "Fraunces", src: await f("Fraunces-400-italic.ttf"), weight: 400, style: "italic" });
  for (const w of [400, 500, 600, 700]) out.push({ family: "IBM Plex Sans", src: await f(`IBMPlexSans-${w}.ttf`), weight: w });
  return out;
}
