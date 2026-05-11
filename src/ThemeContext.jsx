import { createContext, useContext, useState } from "react";

export const THEMES = {
  dark: {
    bg:          "#13111a",
    bgSide:      "#1a1726",
    bgCard:      "#1e1b2e",
    bgRow:       "#26233a",
    bgInput:     "#26233a",
    bgTag:       "#26233a",
    border:      "#2e2a45",
    borderSub:   "#251f3a",
    borderNav:   "#2e2a45",
    text:        "#e2dff5",
    textMuted:   "#a89ec8",
    textDim:     "#7b6fa0",
    textFaint:   "#554f72",
    textAccent:  "#a78bfa",
    textTitle:   "#f0eeff",
    accent:      "#7c3aed",
    accentSide:  "#a78bfa",
    shadow:      "0 2px 12px rgba(0,0,0,0.4)",
    shadowHover: "0 4px 20px rgba(124,58,237,0.25)",
    navActive:   "#2d1f5e",
    gradient:    "linear-gradient(135deg, #7c3aed, #06b6d4)",
  },
light: {
  bg:          "#f3fafa",
  bgSide:      "#ffffff",
  bgCard:      "#ffffff",
  bgRow:       "#e8f7f9",
  bgInput:     "#f3fafa",
  bgTag:       "#cffafe",
  border:      "#a5f3fc",
  borderSub:   "#cffafe",
  borderNav:   "#e8f7f9",
  text:        "#0c2a2e",
  textMuted:   "#155e63",
  textDim:     "#0e7490",
  textFaint:   "#67c9d4",
  textAccent:  "#0891b2",
  textTitle:   "#061a1d",
  accent:      "#0891b2",
  accentSide:  "#0e7490",
  shadow:      "0 2px 12px rgba(8,145,178,0.08)",
  shadowHover: "0 4px 20px rgba(8,145,178,0.15)",
  navActive:   "#cffafe",
  gradient:    "linear-gradient(135deg, #0891b2, #06b6d4)",
},
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const theme = THEMES[mode];
  const toggle = () => setMode(m => m === "dark" ? "light" : "dark");
  return (
    <ThemeContext.Provider value={{ mode, theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
