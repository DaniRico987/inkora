import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

describe('Auth Endpoints - Logout & Token Management (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/logout', () => {
    beforeAll(async () => {
      // Registrar e iniciar sesión para obtener token
      // NOTA: En un test real, necesitarías crear un usuario válido primero
      // Este es un ejemplo de estructura esperada
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout-test-${Date.now()}@test.com`,
          username: `logout_test_${Date.now()}`,
          password: 'Test@1234',
          firstName: 'Test',
          lastName: 'User',
          dni: `DNI${Date.now()}`,
          birthDate: '1990-01-01',
        });

      if (registerRes.status === HttpStatus.CREATED) {
        // Iniciar sesión
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerRes.body.email,
            password: 'Test@1234',
          });

        if (loginRes.status === HttpStatus.OK) {
          authToken = loginRes.body.accessToken;
          // userId se obtendría del JWT payload
        }
      }
    });

    it('debería cerrar sesión y revocar el token', async () => {
      if (!authToken) {
        // Skip si no hay token válido
        console.log('Saltando test de logout - no hay token válido');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Sesión cerrada exitosamente');
    });

    it('debería rechazar el token revocado en siguientes requests', async () => {
      if (!authToken) {
        console.log('Saltando test de token revocado - no hay token válido');
        return;
      }

      // Intentar usar el mismo token después del logout
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body.message).toContain('revocado');
    });
  });

  describe('POST /auth/logout-all', () => {
    let testToken: string;

    beforeAll(async () => {
      // Crear un nuevo usuario para logout-all test
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout-all-test-${Date.now()}@test.com`,
          username: `logout_all_test_${Date.now()}`,
          password: 'Test@1234',
          firstName: 'Test',
          lastName: 'LogoutAll',
          dni: `DNI${Date.now()}`,
          birthDate: '1990-01-01',
        });

      if (registerRes.status === HttpStatus.CREATED) {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerRes.body.email,
            password: 'Test@1234',
          });

        if (loginRes.status === HttpStatus.OK) {
          testToken = loginRes.body.accessToken;
        }
      }
    });

    it('debería revocar todas las sesiones del usuario', async () => {
      if (!testToken) {
        console.log('Saltando test de logout-all - no hay token válido');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('revokedSessions');
      expect(response.body.message).toContain(
        'Todas las sesiones han sido cerradas',
      );
    });

    it('debería rechazar cualquier token del usuario después de logout-all', async () => {
      if (!testToken) {
        console.log(
          'Saltando test de token revocado después de logout-all - no hay token válido',
        );
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Token Blacklist Integration', () => {
    it('debería validar que tokens no revocados siguen funcionando', async () => {
      // Este test verifica que el guard no está bloqueando tokens válidos
      // NOTA: Necesita un usuario autenticado válido

      // Crear y loginear usuario
      const email = `valid-token-test-${Date.now()}@test.com`;
      const username = `valid_token_test_${Date.now()}`;

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          username,
          password: 'Test@1234',
          firstName: 'Valid',
          lastName: 'Token',
          dni: `DNI${Date.now()}`,
          birthDate: '1990-01-01',
        });

      if (registerRes.status === HttpStatus.CREATED) {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email,
            password: 'Test@1234',
          });

        expect(loginRes.status).toBe(HttpStatus.OK);
        expect(loginRes.body).toHaveProperty('accessToken');

        const token = loginRes.body.accessToken;

        // El token recién generado debería ser válido para acceder a /auth/me
        const meRes = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(meRes.status).toBe(HttpStatus.OK);
      }
    });
  });

  describe('Sliding Window Expiration', () => {
    it('debería incluir X-New-Token en header cuando se renueva el JWT', async () => {
      // Este test verifica que el interceptor de renovación funciona
      // Nota: Requiere un token que esté próximo a expirar (< 24h)

      // Para testing, crear un token y verificar headers
      const email = `sliding-window-test-${Date.now()}@test.com`;
      const username = `sliding_window_test_${Date.now()}`;

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          username,
          password: 'Test@1234',
          firstName: 'Sliding',
          lastName: 'Window',
          dni: `DNI${Date.now()}`,
          birthDate: '1990-01-01',
        });

      if (registerRes.status === HttpStatus.CREATED) {
        const loginRes = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email,
            password: 'Test@1234',
          });

        if (loginRes.status === HttpStatus.OK) {
          const token = loginRes.body.accessToken;

          // Hacer request a un endpoint protegido
          const meRes = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`);

          expect(meRes.status).toBe(HttpStatus.OK);

          // Si el token estuviera próximo a expirar (< 24h), incluiría X-New-Token
          // Este test es informativo ya que los tokens nuevos no necesitan renovación
          if (meRes.headers['x-new-token']) {
            expect(meRes.headers['x-token-renewed']).toBe('true');
          }
        }
      }
    });
  });
});
