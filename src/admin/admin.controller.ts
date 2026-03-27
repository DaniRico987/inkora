import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuthService } from '../auth/auth.service';
import { CreateAdminDto } from '../auth/dto/create-admin.dto';
import { AdminService } from './admin.service';

@ApiTags('Administradores')
@ApiBearerAuth('JWT')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiOperation({
    summary: 'Crear administrador',
    description:
      'Permite al usuario root crear un nuevo administrador con contraseña temporal',
  })
  @ApiBody({
    type: CreateAdminDto,
    description: 'Datos necesarios para crear el administrador',
  })
  @ApiResponse({
    status: 201,
    description: 'Administrador creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo root puede crear administradores',
  })
  async createAdmin(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateAdminDto,
  ) {
    return this.authService.createAdmin(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiOperation({
    summary: 'Listar administradores activos',
    description:
      'Obtiene la lista de administradores activos. Solo puede hacerlo el usuario root',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de administradores activos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo root puede listar administradores',
  })
  async findAllActive() {
    return this.adminService.findActiveAdmins();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiOperation({
    summary: 'Desactivar administrador',
    description:
      'El usuario root puede desactivar la cuenta de un administrador. La desactivación no afecta el historial de operaciones. El id es el userId del administrador.',
  })
  @ApiResponse({
    status: 200,
    description: 'Administrador desactivado correctamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description:
      'Solo root puede desactivar administradores. No puede desactivar su propia cuenta',
  })
  @ApiResponse({
    status: 404,
    description: 'Administrador no encontrado o ya inactivo',
  })
  async deleteAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.authService.deactivateAdmin(id, req.user.userId);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiOperation({
    summary: 'Activar administrador',
    description:
      'El usuario root puede activar la cuenta de un administrador previamente desactivado. El id es el userId del administrador.',
  })
  @ApiResponse({
    status: 200,
    description: 'Administrador activado correctamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo root puede activar administradores',
  })
  @ApiResponse({
    status: 404,
    description: 'Administrador no encontrado o ya está activo',
  })
  async activateAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.authService.activateAdmin(id, req.user.userId);
  }
}

