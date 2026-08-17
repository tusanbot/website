import { ThemeConfig } from "./themeConfig";
import { applyTheme } from "./themeUtils";

export function saveTheme(config: ThemeConfig) {
    localStorage.setItem(
        "tusan-theme",
        JSON.stringify(config)
    );

    applyTheme(config);
}