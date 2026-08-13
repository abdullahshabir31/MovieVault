import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "movievault-theme";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
});

function applyTheme(theme) {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || "dark";

    // Only allow light or dark
    const validTheme = stored === "light" ? "light" : "dark";

    setThemeState(validTheme);
    applyTheme(validTheme);
  }, []);

  const setTheme = (next) => {
    const validTheme = next === "light" ? "light" : "dark";

    setThemeState(validTheme);
    localStorage.setItem(STORAGE_KEY, validTheme);
    applyTheme(validTheme);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
