import { Injectable, Logger } from '@nestjs/common';

interface CountryBoundary {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  // Bounding boxes for supported countries
  private readonly countryBoundaries: Record<string, CountryBoundary> = {
    CO: {
      minLat: -4.3,
      maxLat: 13.5,
      minLng: -82.0,
      maxLng: -66.0,
    },
    // Future countries can be added here easily
  };

  /**
   * Determina si una coordenada pertenece a un país específico (por código ISO).
   */
  private isCoordinateInCountry(latitude: number, longitude: number, countryCode: string): boolean {
    const boundary = this.countryBoundaries[countryCode];
    if (!boundary) {
      return false;
    }

    return (
      latitude >= boundary.minLat &&
      latitude <= boundary.maxLat &&
      longitude >= boundary.minLng &&
      longitude <= boundary.maxLng
    );
  }

  /**
   * Detecta si las coordenadas se encuentran en Colombia y genera la respuesta respectiva.
   */
  detectLocation(latitude: number, longitude: number): { isInColombia: boolean; message: string } {
    try {
      if (
        latitude === undefined ||
        longitude === undefined ||
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return {
          isInColombia: false,
          message: 'No fue posible determinar la ubicación del usuario',
        };
      }

      const isInColombia = this.isCoordinateInCountry(latitude, longitude, 'CO');
      
      return {
        isInColombia,
        message: isInColombia
          ? 'El usuario se encuentra en Colombia'
          : 'El usuario no se encuentra en Colombia',
      };
    } catch (error) {
      this.logger.error('Error al detectar ubicación:', error);
      return {
        isInColombia: false,
        message: 'No fue posible determinar la ubicación del usuario',
      };
    }
  }
}
