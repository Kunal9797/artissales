/**
 * Time Formatting Utilities
 *
 * Helper functions for displaying relative time in the app
 */

/**
 * Format a timestamp to relative time string
 * @param isoString ISO 8601 timestamp string or null
 * @returns Relative time string like "Active 2h ago", or empty string if never
 */
export function formatLastActive(isoString: string | null): string {
  if (!isoString) return ''; // Don't show anything if never active

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)}w ago`;

  // For very old activity, show approximate month
  return `Active ${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Get color for last active indicator
 * Green if active today, orange if within 3 days, gray otherwise
 * @param isoString ISO 8601 timestamp string or null
 * @returns Hex color string
 */
export function getLastActiveColor(isoString: string | null): string {
  if (!isoString) return '#999999'; // Gray for never

  const date = new Date(isoString);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 3600000;

  if (diffHours < 24) return '#2E7D32'; // Green - active today
  if (diffHours < 72) return '#F57C00'; // Orange - active within 3 days
  return '#999999'; // Gray - inactive
}
