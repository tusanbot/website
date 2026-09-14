"use client";

/**
 * Slide duration is owned by ContentStudio's React state.
 *
 * This component intentionally does not mutate the editor inputs from the DOM.
 * The previous implementation polled the timeline every 250ms and pushed the
 * timeline's displayed duration back into the editor. That created a feedback
 * loop which overwrote manual duration edits almost immediately.
 */
export default function ContentStudioTimelineSync() {
  return null;
}
