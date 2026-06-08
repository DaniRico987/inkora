import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DetectGeoDto } from './dto/detect-geo.dto';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detectar la ubicación geográfica del usuario',
    description:
      'Recibe latitud y longitud y determina si la ubicación corresponde a Colombia para habilitar funcionalidades exclusivas.',
  })
  @ApiBody({ type: DetectGeoDto })
  @ApiResponse({
    status: 200,
    description: 'Detección procesada correctamente.',
    schema: {
      type: 'object',
      properties: {
        isInColombia: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'El usuario se encuentra en Colombia',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Coordenadas inválidas o incompletas.',
  })
  async detectLocation(@Body() dto: DetectGeoDto) {
    return this.geoService.detectLocation(dto.latitude, dto.longitude);
  }
}
