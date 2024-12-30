import { Moon, Sun } from "lucide-react"
import { useTheme } from "../hooks/useTheme"
 
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
 
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-accent"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}