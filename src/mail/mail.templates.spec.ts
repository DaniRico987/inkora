import {
  buildAccountBlockedTemplate,
  buildAdminTemporaryPasswordTemplate,
  buildPasswordResetTemplate,
} from './mail.templates';

describe('Mail templates', () => {
  describe('buildPasswordResetTemplate', () => {
    it('should include reset link in html and text', () => {
      const resetLink = 'http://localhost:5173/reset-password/token-123';
      const template = buildPasswordResetTemplate({ resetLink });

      expect(template.subject).toContain('Restablece tu contrasena');
      expect(template.html).toContain(resetLink);
      expect(template.text).toContain(resetLink);
      expect(template.text).toContain('expira en 1 hora');
    });

    it('should render logo image when branding logoUrl is provided', () => {
      const template = buildPasswordResetTemplate(
        {
          resetLink: 'http://localhost:5173/reset-password/token-123',
        },
        {
          logoUrl: 'https://example.com/inkora-logo.png',
        },
      );

      expect(template.html).toContain('https://example.com/inkora-logo.png');
      expect(template.html).toContain('<img');
      expect(template.html).toContain('alt="INKORA"');
    });
  });

  describe('buildAdminTemporaryPasswordTemplate', () => {
    it('should include admin credentials in html and text', () => {
      const template = buildAdminTemporaryPasswordTemplate({
        username: 'admin_user',
        temporaryPassword: 'Abc123!@#',
      });

      expect(template.subject).toContain('Credenciales de administrador');
      expect(template.html).toContain('admin_user');
      expect(template.html).toContain('Abc123!@#');
      expect(template.text).toContain('admin_user');
      expect(template.text).toContain('Abc123!@#');
    });

    it('should escape html-sensitive values', () => {
      const template = buildAdminTemporaryPasswordTemplate({
        username: '<admin>',
        temporaryPassword: 'pass"<>&',
      });

      expect(template.html).toContain('&lt;admin&gt;');
      expect(template.html).toContain('pass&quot;&lt;&gt;&amp;');
      expect(template.html).not.toContain('<admin>');
    });
  });

  describe('buildAccountBlockedTemplate', () => {
    it('should include block timestamp in html and text', () => {
      const blockedUntilIso = '2026-03-20T18:30:00.000Z';
      const template = buildAccountBlockedTemplate({
        firstName: 'Dania',
        blockedUntilIso,
      });

      expect(template.subject).toContain('bloqueada temporalmente');
      expect(template.html).toContain('Dania');
      expect(template.html).toContain(blockedUntilIso);
      expect(template.text).toContain('Dania');
      expect(template.text).toContain(blockedUntilIso);
    });

    it('should escape html-sensitive firstName', () => {
      const template = buildAccountBlockedTemplate({
        firstName: 'Ana <script>',
        blockedUntilIso: '2026-03-20T18:30:00.000Z',
      });

      expect(template.html).toContain('Ana &lt;script&gt;');
      expect(template.html).not.toContain('Ana <script>');
    });
  });
});
