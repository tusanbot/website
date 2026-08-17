"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="btn-primary px-4 py-2 rounded-xl"
        >
            {theme === "light" ? "حالت تیره" : "حالت روشن"}
        </button>
    );

}