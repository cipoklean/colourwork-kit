import { defineTheme } from "@hyper-elements/react";

// "Undyed wool and rust": the calm paper of a yarn shop's pattern leaflet, blue-black ink for
// type and chart lines, and the chart's own rust as the one accent — the button, the links.
// Fraunces, a soft old-style serif, sets the titles and the designer's note; IBM Plex Sans sets
// the numbers, labels and written instructions. Contrast on the paper: ink 12.6:1, muted 5.1:1,
// rust 5.3:1 (and 5.9:1 under the white button text).
export const colourworkTheme = defineTheme({
  colors: {
    background: "#f2ede4",
    foreground: "#1e2a33",
    primary: "#9c4a24",
    primaryForeground: "#fffaf2",
    primaryHover: "#7c3a1b",
    surface: "#e7e0d1",
    muted: "#59666e",
    rule: "#1e2a33",
    gridline: "#cfc4ae",
    ruler: "#6f6350", // the every-10 guide lines: darker than the grid, lighter than the frame
    onYarn: "#fffaf2", // chart symbols printed on a dark yarn colour
  },
  fonts: {
    body: "'IBM Plex Sans', Helvetica, Arial, sans-serif",
    heading: "'Fraunces', Georgia, 'Times New Roman', serif",
    label: "'IBM Plex Sans', Helvetica, Arial, sans-serif",
    italic: "'Fraunces', Georgia, 'Times New Roman', serif",
  },
  fontSizes: { body: 13, label: 10, row: 12.5, caption: 10 },
  lineHeights: { body: 1.45 },
  spacing: { rowGap: 7 },
  radii: { button: 3 },
  elements: {
    Heading: {
      fontWeight: 600,
      by: {
        level: {
          1: { fontSize: 42, lineHeight: 1.02, letterSpacing: -0.5 },
          // Level 2 is the small sans section heading: Yarn, Instructions, Float check.
          2: { fontFamily: "{fonts.label}", fontSize: "{fontSizes.label}", fontWeight: 600, lineHeight: 1.2 },
        },
      },
    },
    Button: {
      fontFamily: "{fonts.label}",
      fontWeight: 600,
      borderRadius: "{radii.button}",
      padding: [14, 26],
      hover: { backgroundColor: "{colors.primaryHover}" },
    },
  },
  styles: {
    caption: { fontSize: "{fontSizes.caption}", color: "{colors.muted}" },
    // Small sans labels: the kicker.
    label: { fontFamily: "{fonts.label}", fontSize: "{fontSizes.label}", fontWeight: 600, letterSpacing: 0.4 },
    number: { fontFamily: "{fonts.label}", fontWeight: 600 },
    muted: { color: "{colors.muted}" },
    standfirst: { fontFamily: "{fonts.italic}", fontStyle: "italic", color: "{colors.muted}" },
    designer: { fontFamily: "{fonts.italic}", fontStyle: "italic", color: "{colors.muted}" },
  },
  formats: {
    email: {
      fontSizes: { body: 16, label: 12, row: 15, caption: 13 },
      lineHeights: { body: 1.55 },
      elements: { Heading: { by: { level: { 1: { fontSize: 36, letterSpacing: -0.5, mobile: { fontSize: 29 } } } } } },
    },
    canvas: {
      fontSizes: { body: 30, label: 24, row: 30, caption: 24 },
      lineHeights: { body: 1.3 },
      elements: { Heading: { by: { level: { 1: { fontSize: 92, letterSpacing: -2 } } } } },
    },
  },
});

declare module "@hyper-elements/react" {
  interface Register {
    theme: typeof colourworkTheme;
  }
}
