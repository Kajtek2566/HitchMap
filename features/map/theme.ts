import type { ThemeColors, ThemeMode } from "@/features/map/types";

export const THEMES: Record<ThemeMode, ThemeColors> = {
  light: {
    bg: "rgba(255,250,241,0.94)",
    card: "#fff8ef",
    text: "#162033",
    sub: "#556277",
    muted: "#7d8796",
    border: "rgba(196, 176, 150, 0.42)",
    action: "#0f766e",
    actionStrong: "#115e59",
    input: "rgba(255,255,255,0.84)",
    overlay: "rgba(10,18,32,0.26)",
    drawer: "#fffaf3",
  },
  dark: {
    bg: "rgba(17,24,39,0.93)",
    card: "#182235",
    text: "#f8fafc",
    sub: "#d1d8e3",
    muted: "#95a3b8",
    border: "rgba(104, 121, 149, 0.35)",
    action: "#2dd4bf",
    actionStrong: "#14b8a6",
    input: "rgba(8,15,28,0.9)",
    overlay: "rgba(2,6,23,0.66)",
    drawer: "#101827",
  },
};

export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#082f49" }] },
];
