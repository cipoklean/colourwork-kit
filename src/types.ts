export type ChartMode = "round" | "flat";

export type YarnWeight = "lace" | "fingering" | "sport" | "dk" | "worsted" | "bulky";

/** One colour in the chart's key, as written under `key:`. */
export interface KeyColour {
  /** The single character used for this colour in the chart rows. */
  symbol: string;
  /** The short code used in written instructions, e.g. "MC", "CC1". */
  code: string;
  name: string;
  /** The yarn colour, normalized to #rrggbb. */
  hex: string;
  /** The file line the entry was written on, for error messages. */
  line: number;
}

/** A key colour with the stitch counts and yardage derived from the chart. */
export interface ChartColour extends KeyColour {
  /** Cells of this colour in the chart as written (one instance of the charted section). */
  chartStitches: number;
  /** Stitches for the charted section: the repeat columns times `repeats`, the rest times `up`. */
  sectionStitches: number;
  /** Yardage estimate: sectionStitches x yd/st x 1.10, rounded up to the nearest 5 yd. */
  yards: number;
}

/** A single-colour run longer than 7 stitches in one row — a float to catch. */
export interface FloatNote {
  /** The knitting row number (1 is the first row knitted, the chart's bottom line). */
  row: number;
  /** "Rnd 14" in the round, "Row 14 (RS)" or "Row 14 (WS)" flat. */
  label: string;
  code: string;
  stitches: number;
}

/** A row carrying more than two colours — over stranded convention, a note rather than an error. */
export interface ColourNote {
  /** The knitting row number (1 is the first row knitted, the chart's bottom line). */
  row: number;
  /** "Rnd 14" in the round, "Row 14 (RS)" or "Row 14 (WS)" flat. */
  label: string;
  /** How many different key symbols the row uses, MC included. */
  colours: number;
}

/** A parsed .chart file: the fields, the key and the rows, plus what was derived from them. */
export interface ParsedChart {
  title: string;
  designer: string;
  mode: ChartMode;
  weight: YarnWeight;
  /** `repeats:` as written, e.g. "12 around, 1 up". */
  repeats: string;
  /** How many times the repeat goes around (horizontally) and up (vertically). */
  around: number;
  up: number;
  /** The `repeat:` column range, as stitch numbers counted from the right; the whole width by default. */
  repeatFrom: number;
  repeatTo: number;
  url?: string;
  /** One or two lines from the designer, at the foot of the email and page two. */
  note?: string;
  key: ChartColour[];
  /** The chart rows exactly as written: index 0 is the top line, the last row knitted. */
  rows: string[];
  width: number;
  height: number;
}
