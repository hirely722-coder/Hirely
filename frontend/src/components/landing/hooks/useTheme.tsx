import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Load theme from localStorage on client-side mount (Default: Classic Slate Light Mode)
  useEffect(() => {
    const savedApex = localStorage.getItem("apex-theme");
    const savedLanding = localStorage.getItem("landing-theme") as Theme | null;
    
    if (savedApex === "dark" || savedLanding === "dark") {
      setTheme("dark");
    } else {
      setTheme("light");
      if (!savedApex) {
        localStorage.setItem("apex-theme", "slate");
      }
    }
  }, []);

  // Update theme class on HTML element and save theme to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("apex-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("apex-theme", "slate");
    }
    localStorage.setItem("landing-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
