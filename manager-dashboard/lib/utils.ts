/**
 * Utility Functions
 *
 * Common utility functions used throughout the application.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 *
 * This utility combines clsx and tailwind-merge to handle
 * conditional classes and resolve Tailwind conflicts.
 *
 * @param inputs - Class names to merge
 * @returns Merged class string
 *
 * @example
 * cn('px-2 py-1', condition && 'px-4') // => 'py-1 px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a readable string
 *
 * @param date - Date to format (Date object, timestamp, or ISO string)
 * @param formatString - Date format string (default: 'PPP')
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // => "Nov 11, 2025"
 * formatDate(timestamp, 'PPpp') // => "Nov 11, 2025, 2:30 PM"
 */
export function formatDate(
  date: Date | number | string | undefined,
  formatString: string = 'PPP'
): string {
  if (!date) return '—';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return '—';
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

/**
 * Format a date to a relative time string
 *
 * @param date - Date to format
 * @returns Relative time string (e.g., "2 hours ago")
 *
 * @example
 * formatRelativeTime(new Date()) // => "less than a minute ago"
 */
export function formatRelativeTime(date: Date | number | string | undefined): string {
  if (!date) return '—';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) return '—';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '—';
  }
}

/**
 * Format a number with Indian number system (lakhs, crores)
 *
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 *
 * @example
 * formatIndianNumber(1234567) // => "12,34,567"
 * formatIndianNumber(12345678.5, 2) // => "1,23,45,678.50"
 */
export function formatIndianNumber(num: number | undefined, decimals: number = 0): string {
  if (num === undefined || num === null) return '—';

  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency in Indian Rupees
 *
 * @param amount - Amount to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234567) // => "₹12,34,567"
 * formatCurrency(12345.5, 2) // => "₹12,345.50"
 */
export function formatCurrency(amount: number | undefined, decimals: number = 0): string {
  if (amount === undefined || amount === null) return '—';

  return `₹${formatIndianNumber(amount, decimals)}`;
}

/**
 * Format a percentage
 *
 * @param value - Value to format (0-1 or 0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @param asDecimal - Whether value is a decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.75) // => "75.0%"
 * formatPercentage(75, 1, false) // => "75.0%"
 */
export function formatPercentage(
  value: number | undefined,
  decimals: number = 1,
  asDecimal: boolean = true
): string {
  if (value === undefined || value === null) return '—';

  const percentage = asDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Normalize phone number to E.164 format (+91XXXXXXXXXX)
 *
 * @param phone - Phone number to normalize
 * @returns Normalized phone number or original if invalid
 *
 * @example
 * normalizePhone('9876543210') // => "+919876543210"
 * normalizePhone('+91 98765 43210') // => "+919876543210"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 91, assume it's already country code
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }

  // If 10 digits, add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Return original if can't normalize
  return phone;
}

/**
 * Format phone number for display
 *
 * @param phone - Phone number to format
 * @returns Formatted phone number
 *
 * @example
 * formatPhone('+919876543210') // => "+91 98765 43210"
 */
export function formatPhone(phone: string | undefined): string {
  if (!phone) return '—';

  const normalized = normalizePhone(phone);
  if (normalized.startsWith('+91')) {
    const number = normalized.slice(3);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }

  return phone;
}

/**
 * Truncate a string to a maximum length
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated string
 *
 * @example
 * truncate('Long text here', 10) // => "Long te..."
 */
export function truncate(str: string | undefined, maxLength: number, suffix: string = '...'): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Calculate percentage change between two numbers
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive or negative)
 *
 * @example
 * percentageChange(120, 100) // => 20 (20% increase)
 * percentageChange(80, 100) // => -20 (20% decrease)
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Sleep for a specified duration (useful for testing)
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after duration
 *
 * @example
 * await sleep(1000) // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce a function call
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate initials from a name
 *
 * @param name - Full name
 * @returns Initials (up to 2 characters)
 *
 * @example
 * getInitials('John Doe') // => "JD"
 * getInitials('Kumar') // => "K"
 */
export function getInitials(name: string | undefined): string {
  if (!name) return '?';

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Check if a value is empty (null, undefined, '', [], {})
 *
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Safe JSON parse with fallback
 *
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
