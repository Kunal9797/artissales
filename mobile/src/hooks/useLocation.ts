import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied');
      return false;
    }
    return true;
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    setLoading(true);
    setError(null);

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 0,
      };

      setLocation(locationData);
      setLoading(false);
      return locationData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  };

  // Auto-fetch location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    requestPermission,
  };
};
