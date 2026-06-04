import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AuditLogFilterDto {
  @ApiPropertyOptional({ example: 12, description: 'Filtrar por ID de usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    example: 'admin@inkora.com',
    description: 'Filtrar por email o username del usuario',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    example: 'compra_creada',
    description: 'Filtrar por accion registrada',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: 'purchases',
    description: 'Filtrar por entidad afectada',
  })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    description: 'Fecha/hora inicial en formato ISO',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.999Z',
    description: 'Fecha/hora final en formato ISO',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
