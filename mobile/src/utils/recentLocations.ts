import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recentLocations';
const MAX_RECENT = 5;

export type RecentLocation = {
  city: string;
  state: string;
  pincode: string;
};

/**
 * Get recent locations from storage
 */
export async function getRecentLocations(): Promise<RecentLocation[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading recent locations:', error);
  }
  return [];
}

/**
 * Save a location to recents (dedupes and keeps max 5)
 */
export async function saveRecentLocation(location: RecentLocation): Promise<void> {
  try {
    const existing = await getRecentLocations();

    // Remove duplicate if exists (same city+state+pincode)
    const filtered = existing.filter(
      (loc) =>
        !(loc.city.toLowerCase() === location.city.toLowerCase() &&
          loc.state === location.state &&
          loc.pincode === location.pincode)
    );

    // Add new location at the beginning
    const updated = [location, ...filtered].slice(0, MAX_RECENT);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent location:', error);
  }
}

/**
 * Format location for display (e.g., "Mumbai, MH 400001")
 */
export function formatLocationLabel(location: RecentLocation): string {
  // Abbreviate state name (first 2-3 chars)
  const stateAbbrev = getStateAbbreviation(location.state);
  return `${location.city}, ${stateAbbrev} ${location.pincode}`;
}

/**
 * Get state abbreviation
 */
function getStateAbbreviation(state: string): string {
  const abbreviations: Record<string, string> = {
    'Andhra Pradesh': 'AP',
    'Arunachal Pradesh': 'AR',
    'Assam': 'AS',
    'Bihar': 'BR',
    'Chhattisgarh': 'CG',
    'Goa': 'GA',
    'Gujarat': 'GJ',
    'Haryana': 'HR',
    'Himachal Pradesh': 'HP',
    'Jharkhand': 'JH',
    'Karnataka': 'KA',
    'Kerala': 'KL',
    'Madhya Pradesh': 'MP',
    'Maharashtra': 'MH',
    'Manipur': 'MN',
    'Meghalaya': 'ML',
    'Mizoram': 'MZ',
    'Nagaland': 'NL',
    'Odisha': 'OD',
    'Punjab': 'PB',
    'Rajasthan': 'RJ',
    'Sikkim': 'SK',
    'Tamil Nadu': 'TN',
    'Telangana': 'TS',
    'Tripura': 'TR',
    'Uttar Pradesh': 'UP',
    'Uttarakhand': 'UK',
    'West Bengal': 'WB',
    'Delhi': 'DL',
    'Jammu and Kashmir': 'JK',
    'Ladakh': 'LA',
    'Puducherry': 'PY',
  };
  return abbreviations[state] || state.substring(0, 2).toUpperCase();
}
