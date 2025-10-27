/**
 * Greeting Utility
 *
 * Provides time-based greetings with appropriate icons.
 * Used across sales rep and manager dashboards.
 */

export interface Greeting {
  text: string;
  icon: 'sunrise' | 'sun' | 'moon';
}

/**
 * Get appropriate greeting based on current time
 *
 * Time thresholds:
 * - 12:00 AM - 4:29 AM: Good evening (moon)
 * - 4:30 AM - 11:59 AM: Good morning (sunrise)
 * - 12:00 PM - 4:59 PM: Good afternoon (sun)
 * - 5:00 PM - 11:59 PM: Good evening (moon)
 */
export const getGreeting = (): Greeting => {
  const hour = new Date().getHours();

  // Early morning hours (midnight to 4:30 AM) show evening greeting
  if (hour < 4 || hour >= 17) {
    return { text: 'Good evening', icon: 'moon' };
  }

  // Morning (4:30 AM to noon)
  if (hour < 12) {
    return { text: 'Good morning', icon: 'sunrise' };
  }

  // Afternoon (noon to 5 PM)
  return { text: 'Good afternoon', icon: 'sun' };
};
