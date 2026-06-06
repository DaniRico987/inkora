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
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LogoutResponseDto, LogoutAllResponseDto } from './dto/logout-response.dto';
import { TokenBlacklistService } from './services/token-blacklist.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { Roles } from './roles.decorator';
import { audit } from '../audit/audit.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesion y obtener JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Inicio de sesion exitoso',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Credenciales invalidas, CAPTCHA requerido o cuenta bloqueada temporalmente',
    schema: {
      oneOf: [
        {
          example: {
            statusCode: 401,
            message: 'Credenciales inválidas',
            requiresCaptcha: true,
            failedAttempts: 3,
            attemptsRemaining: 2,
          },
        },
        {
          example: {
            statusCode: 401,
            message:
              'Cuenta bloqueada temporalmente por múltiples intentos fallidos',
            accountBlocked: true,
            blockedUntil: '2026-03-18T18:20:00.000Z',
            remainingBlockSeconds: 900,
            requiresCaptcha: true,
            failedAttempts: 5,
            attemptsRemaining: 0,
          },
        },
      ],
    },
  })
  async login(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.login(req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil obtenido correctamente' })
  @ApiUnauthorizedResponse({ description: 'Token invalido o expirado' })
  async me(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.authService.getProfile(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar los datos del perfil autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado correctamente' })
  @ApiUnauthorizedResponse({ description: 'Token invalido o expirado' })
  @audit('perfil_editado')
  async updateProfile(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  @ApiUnauthorizedResponse({ description: 'Token invalido o expirado' })
  async changePassword(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Post('admins')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Crear administrador (solo root)' })
  @ApiResponse({
    status: 201,
    description: 'Administrador creado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo root puede crear administradores',
  })
  @audit('admin_creado')
  async createAdmin(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateAdminDto,
  ) {
    return this.authService.createAdmin(dto, req.user.userId);
  }

  @Delete('admins/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('root')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Desactivar administrador (solo root)',
    description:
      'Desactiva la cuenta del administrador. No borra datos; el historial permanece intacto.',
  })
  @ApiResponse({
    status: 200,
    description: 'Administrador desactivado correctamente',
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
  @audit('admin_desactivado')
  async deleteAdmin(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.authService.deactivateAdmin(userId, req.user.userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Se ha enviado un correo con instrucciones si el email existe',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o error en reCAPTCHA',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña usando un token' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada con éxito' })
  @ApiResponse({
    status: 400,
    description: 'Token inválido/expirado o error en reCAPTCHA',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Email o username ya registrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Cerrar sesión actual',
    description: 'Revoca el token JWT actual. El usuario deberá iniciar sesión nuevamente.',
  })
  @ApiOkResponse({
    description: 'Sesión cerrada exitosamente',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token inválido o expirado',
  })
  async logout(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<LogoutResponseDto> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Token no encontrado');
    }

    await this.tokenBlacklistService.revokeToken(
      token,
      req.user.userId,
      'user_logout',
    );

    return {
      message: 'Sesión cerrada exitosamente. Por favor, inicia sesión nuevamente.',
    };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Cerrar todas las sesiones activas',
    description: 'Revoca los tokens JWT del usuario. Útil en caso de seguridad o cambio de dispositivo.',
  })
  @ApiOkResponse({
    description: 'Todas las sesiones cerradas exitosamente',
    type: LogoutAllResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token inválido o expirado',
  })
  async logoutAll(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<LogoutAllResponseDto> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Token no encontrado');
    }

    await this.tokenBlacklistService.revokeToken(
      token,
      req.user.userId,
      'user_logout',
    );

    const revokedCount = await this.authService.logoutAll(req.user.userId);

    return {
      message: 'Todas las sesiones han sido cerradas exitosamente.',
      revokedSessions: revokedCount,
    };
  }
}
