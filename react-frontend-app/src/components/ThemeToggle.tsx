import { Moon, Sun } from "lucide-react"
import { useState, useEffect } from "react"

export function ThemeToggle() {
  // Initialize state based on localStorage or system preference
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      return savedTheme === "dark"
    }
    // Fall back to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  // Update the DOM and localStorage when theme changes
  useEffect(() => {
    // Get the root html element
    const root = document.documentElement
    
    // Remove both classes first to ensure clean state
    root.classList.remove("light", "dark")
    
    // Add the appropriate class
    root.classList.add(isDark ? "dark" : "light")
    
    // Save preference to localStorage
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-md hover:bg-accent"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}