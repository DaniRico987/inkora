import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  buildAccountBlockedTemplate,
  buildAdminTemporaryPasswordTemplate,
  buildPasswordResetTemplate,
} from '../src/mail/mail.templates';

function getMimeType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

async function resolvePreviewLogoUrl(): Promise<string> {
  const logoPath = process.env.MAIL_LOGO_PATH?.trim();
  if (logoPath) {
    try {
      const logoBuffer = await readFile(logoPath);
      const mimeType = getMimeType(logoPath);
      return `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
    } catch {
      // Fall through to URL-based preview when the local file is unavailable.
    }
  }

  const frontendUrl = process.env.FRONTEND_URL?.trim();
  return (
    process.env.MAIL_LOGO_URL ||
    (frontendUrl
      ? `${frontendUrl.replace(/\/$/, '')}/branding/inkora-logo.png`
      : undefined) ||
    'https://dummyimage.com/280x72/0f172a/ffffff.png&text=INKORA'
  );
}

async function generateMailPreviews() {
  loadEnv({ override: true });
  const outputDir = join(process.cwd(), 'mail-previews');
  await mkdir(outputDir, { recursive: true });

  const logoUrl = await resolvePreviewLogoUrl();
  const branding = { logoUrl };

  const resetTemplate = buildPasswordResetTemplate({
    resetLink: 'http://localhost:5173/reset-password/demo-token-123',
  }, branding);

  const adminTemplate = buildAdminTemporaryPasswordTemplate({
    username: 'admin_demo',
    temporaryPassword: 'TempP4ss!2026',
  }, branding);

  const blockedTemplate = buildAccountBlockedTemplate({
    firstName: 'Daniela',
    blockedUntilIso: '2026-03-21T03:00:00.000Z',
  }, branding);

  const templates = [
    { fileName: 'password-reset', template: resetTemplate },
    { fileName: 'admin-temporary-password', template: adminTemplate },
    { fileName: 'account-blocked', template: blockedTemplate },
  ];

  for (const item of templates) {
    await writeFile(join(outputDir, `${item.fileName}.html`), item.template.html, {
      encoding: 'utf8',
    });
    await writeFile(join(outputDir, `${item.fileName}.txt`), item.template.text, {
      encoding: 'utf8',
    });
  }

  console.log(`Previews generated in: ${outputDir}`);
}

generateMailPreviews().catch((error) => {
  console.error('Failed to generate mail previews:', error);
  process.exit(1);
});
