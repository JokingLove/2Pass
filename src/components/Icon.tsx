import type { SVGProps } from "react";

// A single stroke vocabulary keeps navigation, fields and compact row actions aligned.
const paths: Record<string, string> = {
  vault: "M4 3.5h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z M6 8h1m-1 8h1 M16.5 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M13.5 7.5V9m0 6v1.5m-4.5-4.5h1.5m6 0H18",
  key: "M14.5 4a5.5 5.5 0 0 0-5.2 7.4L3 17.7V21h3.4l1.5-1.5v-2.2H10v-2l1.4-1.5A5.5 5.5 0 1 0 14.5 4z M16 8h.01",
  settings: "M4 7h7m4 0h5M4 17h3m4 0h9 M15 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z M11 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  generator: "M4.5 4.5h15v15h-15z M8.5 8.5h.01m7 0h.01m-3.5 3.5h.01m-3.5 3.5h.01m7 0h.01",
  shield: "m12 3 8 3v5c0 5-4 8.5-8 10-4-1.5-8-5-8-10V6z M8.5 11.5l2.5 2.5 4.5-5",
  lock: "M6 10h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z M8 10V7a4 4 0 0 1 8 0v3m-4 4v2",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 11v5m0-8h.01",
  menu: "M3 6h18M3 12h18M3 18h18", x: "m6 6 12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14", search: "M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z M15.5 15.5 21 21",
  check: "m4 12 5 5L20 6", "list-checks": "m3 6 1.5 1.5 3-3m-4.5 10 1.5 1.5 3-3M11 6h10m-10 9h10",
  tag: "M3 4h8l10 10-7 7L3 10z M7.5 7.5h.01", grip: "M9 5h.01m6 0h.01M9 12h.01m6 0h.01M9 19h.01m6 0h.01",
  "chevron-right": "m9 5 7 7-7 7", "chevron-down": "m5 9 7 7 7-7", "arrow-left": "m10 5-7 7 7 7M3 12h18",
  "arrow-right": "m14 5 7 7-7 7M21 12H3", "arrow-up": "m5 11 7-7 7 7m-7-7v16", "arrow-down": "m5 13 7 7 7-7m-7 7V4",
  copy: "M9 8h11v13H9z M5 16H3V3h12v2", user: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  "eye-off": "m3 3 18 18 M9 5.5c5.5-2 10 2 13 6.5a19 19 0 0 1-3 3.5 M6.2 6.5A22 22 0 0 0 2 12s3.5 7 10 7c1.5 0 3-.4 4.4-1",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  edit: "m15 4 5 5M4 20l5-1L21 7l-4-4L5 15z", folder: "M3 6h6l2 2h10v11H3z",
  "more-horizontal": "M4.5 12h.45m6.8 0h.45m6.8 0h.45", "external-link": "M14 3h7v7m0-7L11 13M10 5H4v15h15v-6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 6v6l4 2",
  refresh: "M20 9A8 8 0 0 0 6 6L3 9m0-5v5h5m-4 6a8 8 0 0 0 14 3l3-3m0 5v-5h-5",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5", upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  panel: "M3 4h18v16H3z M9 4v16", globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M3 12h18M12 3c-5 6-5 12 0 18 5-6 5-12 0-18z",
};
export default function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={["grip","more-horizontal","generator"].includes(name) ? 2.3 : 1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name] || paths.info}/></svg>;
}
