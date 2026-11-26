import type { EmailProps } from "@hyper-elements/react";

const CDN = "https://cdn.jsdelivr.net/fontsource/fonts";

const woff2 = (family: string, pkg: string, weight: number, style?: "italic") => ({
  family,
  src: `${CDN}/${pkg}@latest/latin-${weight}-${style ?? "normal"}.woff2`,
  format: "woff2" as const,
  weight,
  ...(style ? { style } : {}),
});

/** Web fonts for the email and the print HTML. Clients that can't load them fall back to Georgia and Arial. */
export const webFonts: NonNullable<EmailProps["fonts"]> = [
  ...([500, 600, 700] as const).map((w) => woff2("Fraunces", "fraunces", w)),
  woff2("Fraunces", "fraunces", 400, "italic"),
  ...([400, 500, 600, 700] as const).map((w) => woff2("IBM Plex Sans", "ibm-plex-sans", w)),
];
