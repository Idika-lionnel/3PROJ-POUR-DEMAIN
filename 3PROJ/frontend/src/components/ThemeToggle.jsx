import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-3 rounded-xl transition ${
        darkMode ? "bg-slate-800 text-white" : "bg-white text-blue-600"
      }`}
    >
      {darkMode ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}