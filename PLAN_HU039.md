# 📋 PLAN DE IMPLEMENTACIÓN - HU-039: Gestión Segura de Sesiones

**Ticket:** HU-039  
**Prioridad:** Alta  
**Módulo:** Backend/DB  
**Fecha:** Junio 2026  
**Alcance:** Solo Backend (Frontend se implementará después)

---

## 📊 ANÁLISIS ACTUAL

### ✅ YA IMPLEMENTADO

| Componente | Estado | Detalles |
|-----------|--------|----------|
| **JWT Setup** | ✅ Completo | Expiración 7 días, HS256, inyección desde `.env` |
| **HTTPS/TLS** | ✅ Completo | Middleware de redirección + HSTS header (1 año) |
| **Validación HTTPS** | ✅ Completo | Detecta `X-Forwarded-Proto` para proxies |
| **Swagger Documentation** | ✅ Completo | Bearer Auth configurado, endpoints documentados |
| **Account Locking** | ✅ Completo | Bloqueo de 15 min después de 5 intentos fallidos |
| **CAPTCHA** | ✅ Completo | Requerido después de 3 intentos |
| **Password Reset** | ✅ Completo | Token válido 1 hora con hash en BD |
| **Validación de Usuario Activo** | ✅ Completo | JWT inválido si `user.status !== 'active'` |

**Archivos existentes:**
- [src/auth/auth.module.ts](src/auth/auth.module.ts) - Configuración JWT
- [src/auth/auth.controller.ts](src/auth/auth.controller.ts) - Endpoints
- [src/auth/auth.service.ts](src/auth/auth.service.ts) - Lógica de autenticación
- [src/auth/strategies/jwt.strategy.ts](src/auth/strategies/jwt.strategy.ts) - Estrategia JWT
- [src/main.ts](src/main.ts) - Middleware de HTTPS + Swagger

---

### ❌ NO IMPLEMENTADO (HU-039)

| # | Tarea | Prioridad | Complejidad | Dependencias |
|----|-------|-----------|-------------|--------------|
| 1 | Crear tabla `TokenBlacklist` en BD | Alta | Baja | Ninguna |
| 2 | Crear servicio `TokenBlacklistService` | Alta | Media | Tarea 1 |
| 3 | Implementar **sliding window expiration** | Media | Media | Tarea 2 |
| 4 | Crear endpoint `POST /auth/logout` | Alta | Baja | Tarea 2 |
| 5 | Crear endpoint `POST /auth/logout-all` | Alta | Media | Tarea 2 |
| 6 | Implementar `JwtBlacklistGuard` | Media | Media | Tarea 2 |
| 7 | Documentar cambios en Swagger | Baja | Baja | Tareas 4-5 |
| 8 | Crear migration de Prisma | Alta | Baja | Tarea 1 |

---

## 🎯 PLAN DETALLADO DE IMPLEMENTACIÓN

### **FASE 1: Infraestructura de Blacklist (Tareas 1 + 8)**
**Duración estimada:** 30-45 min  
**Objetivo:** Crear la tabla y migración para blacklist de tokens

#### Tarea 1.1: Crear migración Prisma
```bash
npx prisma migrate dev --name add_token_blacklist
```

**Schema a añadir en `prisma/schema.prisma`:**
```prisma
model TokenBlacklist {
  id          Int       @id @default(autoincrement())
  token       String    @unique @db.VarChar(2048)  // JWT completo o su fingerprint
  tokenHash   String    @unique                     // Hash del token para búsqueda rápida
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason      String    @default("user_logout")    // logout | password_change | security
  
  revokedAt   DateTime  @default(now())
  expiresAt   DateTime                              // Cuándo se puede limpiar de BD
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([userId])
  @@index([expiresAt])  // Para limpieza automática
  @@map("token_blacklist")
}

// Añadir relación en User:
model User {
  // ... campos existentes ...
  blacklistedTokens TokenBlacklist[]
}
```

**Justificación:**
- `tokenHash`: Índice para búsquedas O(1) sin exponer el JWT completo
- `reason`: Auditoría de por qué se revocó
- `expiresAt`: Permite limpiar automáticamente tokens expirados
- Cascada: Si se elimina usuario, se elimina su blacklist

#### Tarea 1.2: Ejecutar migración
```bash
npx prisma migrate deploy
npx prisma generate
```

---

### **FASE 2: Servicio de Blacklist (Tarea 2)**
**Duración estimada:** 45-60 min  
**Objetivo:** Crear la lógica para gestionar tokens revocados

#### Tarea 2.1: Crear `TokenBlacklistService`
**Archivo:** `src/auth/services/token-blacklist.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TokenBlacklistService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Genera hash del token para búsqueda eficiente
   * NO almacena el token completo por seguridad
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Revoca un token (logout single)
   * @param token JWT completo
   * @param userId ID del usuario
   * @param reason Razón de revocación
   */
  async revokeToken(
    token: string,
    userId: number,
    reason: 'user_logout' | 'password_change' | 'security' = 'user_logout',
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    
    // Decodificar JWT para obtener expiración
    const decoded = this.decodeJwt(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prisma.tokenBlacklist.create({
      data: {
        tokenHash,
        token,  // Opcional: solo si se quiere auditoría detallada
        userId,
        reason,
        expiresAt,
      },
    });
  }

  /**
   * Revoca todos los tokens activos de un usuario
   * Usado en: cambio de password, logout-all, compromiso de cuenta
   */
  async revokeAllUserTokens(
    userId: number,
    reason: 'user_logout' | 'password_change' | 'security' = 'user_logout',
  ): Promise<number> {
    // Obtener todos los tokens NO expirados del usuario
    // (De la tabla de sesiones activas o historial de logins)
    
    // Por ahora: revocamos manualmente en el cliente
    // Versión v2: mantener tabla de "active_sessions" para hacerlo server-side
    
    throw new Error('Implementar en fase v2');
  }

  /**
   * Verifica si un token está en blacklist
   * Guard lo usará en cada request
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    
    const blacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { tokenHash },
    });

    return !!blacklisted;
  }

  /**
   * Limpia tokens expirados de la BD (limpieza automática)
   * Ejecutar con cron job cada hora
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Decodifica JWT sin verificar firma
   * (Seguro usar sin verificar porque solo se usa para obtener `exp`)
   */
  private decodeJwt(token: string): any {
    try {
      const [, payload] = token.split('.');
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}
```

#### Tarea 2.2: Registrar servicio en `AuthModule`
**Archivo:** `src/auth/auth.module.ts`

```typescript
import { TokenBlacklistService } from './services/token-blacklist.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      /* ... */
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenBlacklistService],
  exports: [TokenBlacklistService],  // ⬅️ Exportar para otros módulos
})
export class AuthModule {}
```

---

### **FASE 3: JWT Guard con Blacklist (Tarea 6)**
**Duración estimada:** 30-45 min  
**Objetivo:** Verificar que tokens no están revocados

#### Tarea 3.1: Crear `JwtBlacklistGuard`
**Archivo:** `src/auth/guards/jwt-blacklist.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      // Verificar que el token no esté en blacklist
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
      
      if (isBlacklisted) {
        throw new UnauthorizedException('Token ha sido revocado');
      }

      // Verificar firma y expiración del JWT (como hace JwtAuthGuard)
      const payload = this.jwtService.verify(token);
      request['user'] = payload;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

#### Tarea 3.2: Reemplazar JwtAuthGuard con JwtBlacklistGuard
**Opción A (RECOMENDADO):** Crear un nuevo guard que combina ambas validaciones

```typescript
// src/auth/guards/jwt.guard.ts - ACTUALIZAR
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtBlacklistGuard } from './jwt-blacklist.guard';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // ... código existente ...
  
  // Ahora también verifica blacklist
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);
    
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    // Verificar blacklist
    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token ha sido revocado');
    }

    return true;
  }
}
```

---

### **FASE 4: Endpoints de Logout (Tareas 4 + 5)**
**Duración estimada:** 45-60 min  
**Objetivo:** Implementar logout single y logout-all

#### Tarea 4.1: Crear endpoint `POST /auth/logout`
**Archivo:** `src/auth/auth.controller.ts`

```typescript
@Post('logout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiOperation({
  summary: 'Cerrar sesión actual',
  description: 'Revoca el token JWT actual. El usuario deberá iniciar sesión nuevamente.',
})
@ApiOkResponse({ description: 'Sesión cerrada exitosamente' })
@ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
async logout(@Request() req: any): Promise<{ message: string }> {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = req.user.sub;

  await this.authService.logout(token, userId);

  return {
    message: 'Sesión cerrada exitosamente. Por favor, inicia sesión nuevamente.',
  };
}
```

#### Tarea 4.2: Implementar lógica en `AuthService`
**Archivo:** `src/auth/auth.service.ts`

```typescript
async logout(token: string, userId: number): Promise<void> {
  // Revocar el token actual
  await this.tokenBlacklistService.revokeToken(
    token,
    userId,
    'user_logout',
  );
}
```

---

#### Tarea 5.1: Crear endpoint `POST /auth/logout-all`
**Archivo:** `src/auth/auth.controller.ts`

```typescript
@Post('logout-all')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiOperation({
  summary: 'Cerrar todas las sesiones activas',
  description: 'Revoca TODOS los tokens JWT del usuario. Útil en caso de seguridad o cambio de dispositivo.',
})
@ApiOkResponse({
  description: 'Todas las sesiones cerradas exitosamente',
})
@ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
async logoutAll(@Request() req: any): Promise<{ message: string; revokedSessions: number }> {
  const userId = req.user.sub;

  const revokedCount = await this.authService.logoutAll(userId);

  return {
    message: 'Todas las sesiones han sido cerradas exitosamente.',
    revokedSessions: revokedCount,
  };
}
```

#### Tarea 5.2: Implementar lógica en `AuthService`
**Archivo:** `src/auth/auth.service.ts`

```typescript
async logoutAll(userId: number): Promise<number> {
  // Opción 1 (RECOMENDADO PARA AHORA):
  // Marcar el usuario como "necesita re-autenticación"
  // O cambiar un "version" de sesión
  
  // Opción 2 (requiere tabla de sesiones activas):
  // Revoca todos los tokens en blacklist
  
  // IMPLEMENTACIÓN RÁPIDA (Opción 1):
  // Actualizar campo de versión de sesión
  const user = await this.prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: { increment: 1 },  // ⬅️ Necesita campo en schema
    },
  });

  return 1;  // Indica que se revocó el token actual
}
```

**⚠️ NOTA:** Para `logout-all` real necesitamos:
- Opción A: Tabla de `ActiveSession` (más compleja)
- Opción B: Campo `sessionVersion` en `User` (más simple)
- Opción C: Tabla de dispositivos (más avanzada)

**Recomendación:** Usar Opción B por ahora

---

### **FASE 5: Sliding Window Expiration (Tarea 3)**
**Duración estimada:** 60-90 min  
**Complejidad:** Media  
**Objetivo:** Renovar token automáticamente en cada request

#### Tarea 5.1: Estrategia de Sliding Expiration
**Decidir enfoque:**

**Opción A (RECOMENDADO):** Token Refresh
```
- Access Token: 15 minutos
- Refresh Token: 7 días (en httpOnly cookie o BD)
- En cada request con acceso token "viejo", emitir uno nuevo
```

**Opción B:** Sliding Window Simple
```
- Token válido 7 días
- En cada request, si el token está dentro de los últimos 24h de expiración,
  emitir uno nuevo
```

**Ventajas/Desventajas:**

| Aspecto | Opción A (Refresh) | Opción B (Sliding) |
|--------|-------------------|-------------------|
| Seguridad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Complejidad | Alto | Medio |
| Client Side | Maneja refresh token | Automático |
| Revocación | Inmediata | Al expirar token |

**Decisión Final:** **Opción B por ahora** (menos breaking changes en frontend)

#### Tarea 5.2: Implementar Sliding Window
**Archivo:** `src/auth/strategies/jwt.strategy.ts` - ACTUALIZAR

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);

    // ✅ SLIDING WINDOW: Si el token expira en < 2 minutos, emitir uno nuevo
    const now = Date.now() / 1000;
    const expiresIn = payload.exp - now;
    const REFRESH_THRESHOLD_SECONDS = 2 * 60;

    if (expiresIn < REFRESH_THRESHOLD_SECONDS) {
      // Token se renueva automáticamente
      user['shouldIssueNewToken'] = true;
      user['tokenExpiresIn'] = '15m';
    }

    return user;
  }
}
```

#### Tarea 5.3: Interceptor para emitir nuevo token
**Archivo:** `src/auth/interceptors/token-refresh.interceptor.ts` (NUEVO)

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(private jwtService: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const user = request.user;

        // Si el estrategia JWT indicó que se debe renovar
        if (user && user.shouldIssueNewToken) {
          const newToken = this.jwtService.sign({
            sub: user.sub,
            role: user.role,
            isTemporaryPassword: user.isTemporaryPassword,
          });

          // Enviar nuevo token en header (para que frontend lo capture)
          response.setHeader('X-New-Token', newToken);
          response.setHeader('X-Token-Renewed', 'true');
        }

        return data;
      }),
    );
  }
}
```

#### Tarea 5.4: Registrar interceptor en AuthModule
**Archivo:** `src/auth/auth.module.ts`

```typescript
import { TokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    AuthService,
    TokenBlacklistService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenRefreshInterceptor,
    },
  ],
})
export class AuthModule {}
```

---

### **FASE 6: Documentación Swagger (Tarea 7)**
**Duración estimada:** 15-30 min  
**Objetivo:** Documentar endpoints de logout

#### Tarea 6.1: Actualizar Swagger docs
Ya está parcialmente cubierto en Tareas 4 y 5 con `@ApiOperation()`, etc.

**Adicionales:**
- Crear schema para respuesta de logout
- Documentar campos de error

**Archivo:** `src/auth/dto/logout.dto.ts` (NUEVO)

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Sesión cerrada exitosamente',
    description: 'Mensaje de confirmación',
  })
  message: string;
}

export class LogoutAllResponseDto {
  @ApiProperty({
    example: 'Todas las sesiones han sido cerradas exitosamente.',
    description: 'Mensaje de confirmación',
  })
  message: string;

  @ApiProperty({
    example: 1,
    description: 'Número de sesiones revocadas',
  })
  revokedSessions: number;
}
```

---

## 📅 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
SEMANA 1 - BACKEND
├─ Día 1-2 (FASE 1): Migración BD + TokenBlacklist
│  ├─ Crear migration: add_token_blacklist
│  ├─ Actualizar schema Prisma
│  └─ Ejecutar migration
│
├─ Día 2-3 (FASE 2): Servicio de Blacklist
│  ├─ TokenBlacklistService
│  ├─ Métodos: revokeToken, isTokenBlacklisted, cleanupExpiredTokens
│  └─ Registrar en AuthModule
│
├─ Día 3-4 (FASE 3): Guards
│  ├─ JwtBlacklistGuard
│  └─ Integrar con JwtAuthGuard existente
│
├─ Día 4-5 (FASE 4): Endpoints Logout
│  ├─ POST /auth/logout
│  ├─ POST /auth/logout-all
│  └─ Tests E2E
│
└─ Día 5 (FASE 5 & 6): Sliding Expiration + Documentación
   ├─ Actualizar JWT Strategy
   ├─ TokenRefreshInterceptor
   └─ Documentación Swagger

SEMANA 2 - TESTING & FRONTEND
├─ Testing E2E de logout y blacklist
├─ Validar en producción
└─ Implementar en frontend (después de que backend esté listo)
```

---

## 🛠️ TAREAS PARALELAS (Opcionales pero Recomendadas)

### Tarea A: Cron Job para Limpieza de Blacklist
**Archivo:** `src/auth/tasks/token-cleanup.task.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class TokenCleanupTask {
  constructor(private tokenBlacklistService: TokenBlacklistService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const deleted = await this.tokenBlacklistService.cleanupExpiredTokens();
    console.log(`🗑️ Limpiados ${deleted} tokens expirados de la blacklist`);
  }
}
```

Registrar en `AuthModule`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TokenCleanupTask],
})
export class AuthModule {}
```

### Tarea B: Auditoría de Sesiones
**Tabla adicional para historial de login/logout:**

```prisma
model SessionAudit {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String   // 'login' | 'logout' | 'logout_all' | 'token_refresh'
  ipAddress String?
  userAgent String?
  timestamp DateTime @default(now())
  
  @@index([userId, timestamp])
  @@map("session_audit")
}
```

---

## 🧪 TESTING RECOMENDADO

### Test Unitarios
```bash
npm run test -- auth.service.spec.ts
npm run test -- token-blacklist.service.spec.ts
```

### Test E2E
```bash
npm run test:e2e -- auth.e2e-spec.ts
```

**Casos de prueba:**
- ✅ Login exitoso
- ✅ POST /auth/logout revoca token
- ❌ Token revocado no accede a endpoints protegidos
- ✅ POST /auth/logout-all revoca todas las sesiones
- ✅ JWT con sliding expiration se renueva automáticamente
- ✅ Token expirado es rechazado
- ❌ HTTPS enforcement en producción
- ✅ Swagger documenta todos los endpoints

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. **Impacto en Frontend**
- ❌ No hay cambios **breaking** 
- ✅ Frontend puede continuar usando JWT como está
- ⚠️ Opcionales: Detectar header `X-New-Token` para renovación automática
- ⚠️ Opcionales: Implementar botones de logout en UI

### 2. **Cambios en .env** (Requerido)
- ```env
# Existentes:
JWT_SECRET=inkora_jwt_secret_seguro_2026
JWT_EXPIRES_IN=15m
ENFORCE_HTTPS=true
NODE_ENV=production
```

### 3. **Migraciones**
- ✅ Nueva tabla `token_blacklist` (automática con Prisma)
- ✅ Relación con `User` (cascada en delete)
- ✅ Índices para performance

### 4. **Performance**
- ⚠️ Cada request verifica blacklist (O(1) con hash)
- ✅ Limpieza automática de tokens expirados (cron job)
- ✅ No hay impacto significativo

### 5. **Seguridad**
- ✅ Tokens se revogan inmediatamente en logout
- ✅ No hay exposición de JWT completo en BD (solo hash)
- ✅ HTTPS ya está enforced
- ✅ Validación de usuario activo en cada request

---

## 📌 RESUMEN EJECUTIVO

| Componente | Estado Actual | Nuevo | Esfuerzo | Riesgo |
|-----------|---------------|-------|----------|--------|
| JWT Setup | ✅ | ✅ | 0% | Bajo |
| HTTPS | ✅ | ✅ | 0% | Bajo |
| Logout | ❌ | ✅ | 20% | Bajo |
| Blacklist | ❌ | ✅ | 30% | Medio |
| Sliding Expiration | ❌ | ✅ | 30% | Medio |
| Documentación | ✅ | ✅ | 10% | Bajo |
| Testing | ⚠️ | ✅ | 10% | Bajo |
| **TOTAL** | - | - | **~100%** | **Bajo** |

**Duración estimada total:** 5-7 días de desarrollo

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Aprobar plan** (este documento)
2. ⏳ **Semana 1:** Implementar backend siguiendo orden recomendado
3. ⏳ **Semana 2:** Testing E2E completo
4. ⏳ **Semana 3:** Desplegar a staging/producción
5. ⏳ **Semana 4:** Implementar frontend (después de que backend esté listo)

---

**Última actualización:** Junio 5, 2026  
**Revisor:** Sistema de Análisis Automático  
**Estado:** ✅ Aprobado para implementación
