import { ThemeConfig } from "./themeConfig";

export function applyTheme(config: ThemeConfig) {
    const root = document.documentElement;

    // =========================
    // رنگ برند
    // =========================

    root.style.setProperty(
        "--primary",
        config.colors.primary
    );

    root.style.setProperty(
        "--primary-dark",
        config.colors.primaryDark
    );

    root.style.setProperty(
        "--primary-light",
        config.colors.primaryLight
    );

    // =========================
    // Radius
    // =========================

    root.style.setProperty(
        "--radius-xl",
        `${config.radius.xl}px`
    );

    root.style.setProperty(
        "--radius-lg",
        `${config.radius.lg}px`
    );

    root.style.setProperty(
        "--radius-md",
        `${config.radius.md}px`
    );

    // =========================
    // Blur
    // =========================

    root.style.setProperty(
        "--blur-panel",
        `${config.blur.panel}px`
    );

    root.style.setProperty(
        "--blur-card",
        `${config.blur.card}px`
    );

    // =========================
    // Shadow
    // =========================

    root.style.setProperty(
        "--shadow-sm",
        config.shadow.sm
    );

    root.style.setProperty(
        "--shadow-md",
        config.shadow.md
    );

    root.style.setProperty(
        "--shadow-lg",
        config.shadow.lg
    );

    // =========================
    // Motion
    // =========================

    root.style.setProperty(
        "--motion-enabled",
        config.motion.enabled ? "1" : "0"
    );

    root.style.setProperty(
        "--motion-hover-scale",
        String(config.motion.hoverScale)
    );

    root.style.setProperty(
        "--motion-hover-lift",
        `${config.motion.hoverLift}px`
    );

    root.style.setProperty(
        "--motion-duration",
        `${config.motion.duration}ms`
    );
}