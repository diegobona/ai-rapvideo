/** Stable, public failure categories; never forward raw provider diagnostics. */
export const VIDEO_FAILURE_REASONS = [
  'political_figure_not_allowed',
  'public_figure_not_allowed',
  'content_rejected',
] as const;
export type VideoFailureReason = typeof VIDEO_FAILURE_REASONS[number];

export function readVideoFailureReason(value: unknown): VideoFailureReason | undefined {
  return VIDEO_FAILURE_REASONS.find(reason => reason === value);
}
