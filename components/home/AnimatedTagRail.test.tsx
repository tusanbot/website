// Interaction contract for AnimatedTagRail.
// The component is intentionally small and reusable; these cases are kept here
// as documentation for manual/browser verification until the project test stack
// exposes a DOM test runner.

export const animatedTagRailAcceptance = [
  "renders nothing for an empty item list",
  "duplicates items to create a continuous marquee",
  "pauses on hover and keyboard focus",
  "applies a subtle scale effect to the focused/hovered tag",
  "opens a single expandable panel for items with panel content",
  "keeps the rail paused while an expandable panel is open",
  "supports direct navigation for normal linked tags",
  "supports reduced-motion preference",
  "supports RTL and LTR direction",
  "allows manual pause/resume",
  "keeps the content keyboard accessible",
] as const;
