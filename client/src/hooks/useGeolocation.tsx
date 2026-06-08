import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { detectGeo } from '../api/geo';

export type GeoStatus = 'loading' | 'success' | 'denied' | 'error';

export interface GeolocationState {
  isInColombia: boolean;
  geoStatus: GeoStatus;
  message: string | null;
  coords: { latitude: number; longitude: number } | null;
}

export interface GeolocationActions {
  requestLocation: () => Promise<void>;
}

export type GeolocationContextReturn = GeolocationState & GeolocationActions;

const GeolocationContext = createContext<GeolocationContextReturn | undefined>(undefined);

const CACHE_KEY = 'inkora_geolocation_cache';

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GeolocationState>(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error reading geolocation cache:', e);
    }
    return {
      isInColombia: false,
      geoStatus: 'loading',
      message: 'Obteniendo ubicación...',
      coords: null,
    };
  });

  const fetchGeoDetection = useCallback(async (lat: number, lng: number) => {
    try {
      setState(prev => ({ ...prev, geoStatus: 'loading', message: 'Verificando ubicación...' }));
      const response = await detectGeo(lat, lng);
      
      const newState: GeolocationState = {
        isInColombia: response.isInColombia,
        geoStatus: 'success',
        message: response.message,
        coords: { latitude: lat, longitude: lng },
      };
      
      setState(newState);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.error('Error in geo-detect API request:', err);
      const newState: GeolocationState = {
        isInColombia: false,
        geoStatus: 'error',
        message: 'No fue posible determinar la ubicación del usuario',
        coords: { latitude: lat, longitude: lng },
      };
      setState(newState);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newState));
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      const newState: GeolocationState = {
        isInColombia: false,
        geoStatus: 'error',
        message: 'La geolocalización no está soportada por este dispositivo',
        coords: null,
      };
      setState(newState);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newState));
      return;
    }

    setState(prev => ({ ...prev, geoStatus: 'loading' }));

    console.log('Solicitando geolocalización al navegador...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Coordenadas obtenidas con éxito:', latitude, longitude);
        void fetchGeoDetection(latitude, longitude);
      },
      (error) => {
        console.warn('Error al obtener geolocalización de la API del navegador:', {
          code: error.code,
          message: error.message,
        });

        let geoStatus: GeoStatus = 'error';
        let message = 'No fue posible determinar la ubicación del usuario';

        if (error.code === error.PERMISSION_DENIED) {
          geoStatus = 'denied';
          message = 'El acceso a la ubicación fue denegado. Algunas opciones no estarán disponibles.';
        }

        const newState: GeolocationState = {
          isInColombia: false,
          geoStatus,
          message,
          coords: null,
        };

        setState(newState);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(newState));
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [fetchGeoDetection]);

  // Request location on initial mount and listen to permission status changes
  useEffect(() => {
    let permissionCleanup: (() => void) | undefined = undefined;

    const checkPermissionsAndRequest = async () => {
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          
          const handlePermissionChange = () => {
            if (result.state === 'denied') {
              const newState: GeolocationState = {
                isInColombia: false,
                geoStatus: 'denied',
                message: 'El acceso a la ubicación fue denegado. Algunas opciones no estarán disponibles.',
                coords: null,
              };
              setState(newState);
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(newState));
            } else if (result.state === 'prompt') {
              sessionStorage.removeItem(CACHE_KEY);
              void requestLocation();
            } else if (result.state === 'granted') {
              const cached = sessionStorage.getItem(CACHE_KEY);
              let shouldRequest = true;
              if (cached) {
                try {
                  const parsed = JSON.parse(cached);
                  if (parsed.geoStatus === 'success') {
                    shouldRequest = false;
                  }
                } catch {
                  // ignore
                }
              }
              if (shouldRequest) {
                sessionStorage.removeItem(CACHE_KEY);
                void requestLocation();
              }
            }
          };

          handlePermissionChange();
          result.addEventListener('change', handlePermissionChange);
          permissionCleanup = () => {
            result.removeEventListener('change', handlePermissionChange);
          };
          return;
        } catch (e) {
          console.error('Permissions API error:', e);
        }
      }

      // Fallback
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) {
        void requestLocation();
      }
    };

    void checkPermissionsAndRequest();

    return () => {
      if (permissionCleanup) {
        permissionCleanup();
      }
    };
  }, [requestLocation]);

  return (
    <GeolocationContext.Provider
      value={{
        ...state,
        requestLocation,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeolocation(): GeolocationContextReturn {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error('useGeolocation debe usarse dentro de <GeolocationProvider />');
  }
  return context;
}
