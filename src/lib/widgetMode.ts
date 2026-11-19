/** Les trois tailles de l'encart, choisies par job-finder dans l'adresse (`/widget?mode=…`). */
export const WIDGET_MODES = ["normal", "small", "free"] as const;
export type WidgetMode = (typeof WIDGET_MODES)[number];

/** Toute valeur inconnue, absente ou répétée vaut `normal`. */
export function parseWidgetMode(value: string | string[] | undefined): WidgetMode {
  return typeof value === "string" && (WIDGET_MODES as readonly string[]).includes(value) ? (value as WidgetMode) : "normal";
}
