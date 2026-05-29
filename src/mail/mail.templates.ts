type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type PurchaseInvoiceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PurchaseInvoiceParams = {
  firstName: string;
  purchaseId: number;
  purchaseDateIso: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  shippingAddress?: string;
  deliveryMode?: 'homeDelivery' | 'storePickup';
  pickupStoreName?: string;
  estimatedDeliveryTime?: string;
  status: 'inPreparation' | 'shipped' | 'delivered' | 'cancelled';
  items: PurchaseInvoiceItem[];
};

type NewBookNotificationParams = {
  firstName: string;
  bookTitle: string;
  bookAuthor: string;
  categories: string[];
};

type ReturnApprovedParams = {
  firstName: string;
  returnBookId: number;
  purchaseId: number;
  reasonLabel: string;
  additionalDescription?: string;
  validationCode: string;
};

export type MailBrandingOptions = {
  logoUrl?: string;
  logoCid?: string;
  brandName?: string;
};

type LayoutParams = {
  preheader: string;
  title: string;
  intro: string;
  bodyHtml: string;
  footer: string;
  branding?: MailBrandingOptions;
};

const BRAND_NAME = 'INKORA';
const BRAND_GRADIENT_START = '#0f172a';
const BRAND_GRADIENT_END = '#1d4ed8';
const BRAND_ACCENT = '#2563eb';

function getPurchaseStatusLabel(status: PurchaseInvoiceParams['status']): string {
  switch (status) {
    case 'inPreparation':
      return 'En preparación';
    case 'shipped':
      return 'Enviado';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLayout(params: LayoutParams): string {
  const brandName = params.branding?.brandName || BRAND_NAME;
  const logoUrl = params.branding?.logoUrl?.trim();
  const logoCid = params.branding?.logoCid?.trim();
  const logoSrc = logoCid
    ? `cid:${escapeHtml(logoCid)}`
    : logoUrl
      ? escapeHtml(logoUrl)
      : undefined;
  const headerContent = logoSrc
    ? `<img src="${logoSrc}" alt="${escapeHtml(brandName)}" style="max-height:44px;max-width:180px;display:block;" />`
    : `<span style="font-size:20px;font-weight:800;letter-spacing:0.6px;">${escapeHtml(brandName)}</span>`;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${params.title}</title>
      </head>
      <body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
        <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">
          ${params.preheader}
        </span>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ff;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(30,41,59,0.08);">
                <tr>
                  <td style="padding:18px 24px;background:linear-gradient(120deg, ${BRAND_GRADIENT_START}, ${BRAND_GRADIENT_END});color:#f8fafc;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="middle">
                          ${headerContent}
                        </td>
                        <td align="right" valign="middle">
                          <span style="display:inline-block;padding:6px 10px;border:1px solid rgba(255,255,255,0.35);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.3px;color:#eff6ff;">
                            Seguridad INKORA
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 24px 8px 24px;">
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;color:#0f172a;">${params.title}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#334155;">${params.intro}</p>
                    ${params.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 24px 24px;">
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0 14px 0;" />
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">${params.footer}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function buildPasswordResetTemplate(
  params: {
    resetLink: string;
  },
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeLink = escapeHtml(params.resetLink);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Recibimos una solicitud para restablecer tu contrasena.
    </p>
    <p style="margin:0 0 18px 0;">
      <a
        href="${safeLink}"
        style="display:inline-block;padding:12px 18px;background:${BRAND_ACCENT};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;"
      >
        Restablecer contrasena
      </a>
    </p>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#475569;">
      Este enlace expirara en 1 hora.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      Si no solicitaste este cambio, puedes ignorar este mensaje.
    </p>
  `;

  return {
    subject: 'Restablece tu contrasena en INKORA',
    html: buildLayout({
      preheader: 'Recupera el acceso a tu cuenta con un enlace temporal.',
      title: 'Restablecer contrasena',
      intro: 'Hola,',
      bodyHtml,
      footer:
        'Este correo fue enviado automaticamente. Si no reconoces esta actividad, ignora el mensaje.',
      branding,
    }),
    text:
      'Recibimos una solicitud para restablecer tu contrasena.\n' +
      `Usa este enlace para crear una nueva contrasena (expira en 1 hora): ${params.resetLink}\n` +
      'Si no solicitaste este cambio, puedes ignorar este mensaje.',
  };
}

export function buildAdminTemporaryPasswordTemplate(
  params: {
    username: string;
    temporaryPassword: string;
  },
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeUsername = escapeHtml(params.username);
  const safeTemporaryPassword = escapeHtml(params.temporaryPassword);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Se ha creado tu cuenta de administrador.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Usuario</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeUsername}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Contrasena temporal</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeTemporaryPassword}</td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      Por seguridad, cambia esta contrasena en tu primer inicio de sesion.
    </p>
  `;

  return {
    subject: 'Credenciales de administrador INKORA',
    html: buildLayout({
      preheader: 'Tu cuenta de administrador fue creada correctamente.',
      title: 'Credenciales de acceso',
      intro: 'Hola,',
      bodyHtml,
      footer:
        'Por seguridad, no compartas este correo ni estas credenciales con terceros.',
      branding,
    }),
    text:
      'Se ha creado tu cuenta de administrador en INKORA.\n' +
      `Usuario: ${params.username}\n` +
      `Contrasena temporal: ${params.temporaryPassword}\n` +
      'Por seguridad, cambia esta contrasena en tu primer inicio de sesion.',
  };
}

export function buildAccountBlockedTemplate(
  params: {
    firstName: string;
    blockedUntilIso: string;
  },
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeFirstName = escapeHtml(params.firstName);
  const safeBlockedUntil = escapeHtml(params.blockedUntilIso);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Detectamos multiples intentos fallidos de inicio de sesion y tu cuenta fue bloqueada temporalmente por seguridad.
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#0f172a;">
      <strong>Disponible nuevamente:</strong> ${safeBlockedUntil}
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      Si no fuiste tu, te recomendamos cambiar tu contrasena cuando recuperes acceso.
    </p>
  `;

  return {
    subject: 'Tu cuenta de INKORA fue bloqueada temporalmente',
    html: buildLayout({
      preheader: 'Se detectaron intentos fallidos de acceso en tu cuenta.',
      title: 'Cuenta bloqueada temporalmente',
      intro: `Hola ${safeFirstName},`,
      bodyHtml,
      footer:
        'Si necesitas ayuda, responde este correo o contacta al equipo de soporte de INKORA.',
      branding,
    }),
    text:
      `Hola ${params.firstName},\n` +
      'Detectamos multiples intentos fallidos de inicio de sesion y tu cuenta fue bloqueada temporalmente por seguridad.\n' +
      `Disponible nuevamente: ${params.blockedUntilIso}\n` +
      'Si no fuiste tu, te recomendamos cambiar tu contrasena cuando recuperes acceso.',
  };
}

export function buildPurchaseInvoiceTemplate(
  params: PurchaseInvoiceParams,
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeFirstName = escapeHtml(params.firstName);
  const safePurchaseDate = escapeHtml(params.purchaseDateIso);
  const safeEstimatedTime = escapeHtml(
    params.estimatedDeliveryTime || 'Sin estimacion disponible',
  );
  const safeDeliveryMode = escapeHtml(
    params.deliveryMode === 'storePickup'
      ? `Retiro en tienda${params.pickupStoreName ? ` (${params.pickupStoreName})` : ''}`
      : 'Envio a domicilio',
  );
  const safeStatus = escapeHtml(getPurchaseStatusLabel(params.status));
  const safePaymentMethod = escapeHtml(params.paymentMethod || 'No informado');
  const safeShippingAddress = escapeHtml(
    params.shippingAddress || 'No informada',
  );

  const itemsRows = params.items
    .map((item) => {
      return `
        <tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(item.title)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">$${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Hola ${safeFirstName}, tu compra fue confirmada correctamente.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Compra</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">#${params.purchaseId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Fecha</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safePurchaseDate}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Estado</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeStatus}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Entrega</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeDeliveryMode}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>ETA</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeEstimatedTime}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Pago</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safePaymentMethod}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Direccion</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeShippingAddress}</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <thead>
        <tr>
          <th align="left" style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#0f172a;">Libro</th>
          <th align="center" style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#0f172a;">Cant.</th>
          <th align="right" style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#0f172a;">Unitario</th>
          <th align="right" style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:13px;color:#0f172a;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;max-width:320px;margin-left:auto;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;">Subtotal</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">$${params.subtotalAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;">Impuestos (21%)</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">$${params.taxAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;background:#dbeafe;font-size:15px;font-weight:700;color:#0f172a;">Total pagado</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;background:#dbeafe;font-size:15px;font-weight:700;color:#0f172a;text-align:right;">$${params.totalAmount.toFixed(2)}</td>
      </tr>
    </table>
  `;

  return {
    subject: `Factura de compra #${params.purchaseId} - INKORA`,
    html: buildLayout({
      preheader: `Tu compra #${params.purchaseId} fue confirmada.`,
      title: 'Factura de compra',
      intro: 'Gracias por comprar en INKORA.',
      bodyHtml,
      footer:
        'Conserva este correo como comprobante de tu compra. Si tienes dudas, contacta a soporte.',
      branding,
    }),
    text:
      `Compra #${params.purchaseId} confirmada\n` +
      `Fecha: ${params.purchaseDateIso}\n` +
      `Estado: ${getPurchaseStatusLabel(params.status)}\n` +
      `Entrega: ${params.deliveryMode || 'N/D'}\n` +
      `ETA: ${params.estimatedDeliveryTime || 'N/D'}\n` +
      `Subtotal: $${params.subtotalAmount.toFixed(2)}\n` +
      `Impuestos (21%): $${params.taxAmount.toFixed(2)}\n` +
      `Total: $${params.totalAmount.toFixed(2)}\n`,
  };
}

export function buildNewBookNotificationTemplate(
  params: NewBookNotificationParams,
  branding?: MailBrandingOptions,
): MailTemplate {
  const categoriesText = params.categories.join(', ');

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ¡Buenas noticias! Hemos añadido un nuevo libro que podría interesarte.
    </p>
    <div style="margin:0 0 18px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
      <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#1e293b;">
        ${escapeHtml(params.bookTitle)}
      </h3>
      <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">
        Autor: ${escapeHtml(params.bookAuthor)}
      </p>
      <p style="margin:0;font-size:14px;color:#64748b;">
        Categorías: ${escapeHtml(categoriesText)}
      </p>
    </div>
    <p style="margin:0 0 18px 0;">
      <a
        href="#"
        style="display:inline-block;padding:12px 18px;background:${BRAND_ACCENT};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;"
      >
        Ver libro
      </a>
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      Recibes esta notificación porque estás suscrito a las categorías mencionadas.
    </p>
  `;

  return {
    subject: `Nuevo libro disponible: ${params.bookTitle}`,
    html: buildLayout({
      preheader: `Descubre "${params.bookTitle}" de ${params.bookAuthor} en INKORA.`,
      title: 'Nuevo libro disponible',
      intro: `Hola ${escapeHtml(params.firstName)},`,
      bodyHtml,
      footer:
        'Puedes gestionar tus suscripciones en tu perfil. Si no deseas recibir estas notificaciones, ajusta tus preferencias.',
      branding,
    }),
    text:
      `¡Nuevo libro disponible!\n\n` +
      `Título: ${params.bookTitle}\n` +
      `Autor: ${params.bookAuthor}\n` +
      `Categorías: ${categoriesText}\n\n` +
      'Recibes esta notificación porque estás suscrito a las categorías mencionadas.',
  };
}

export function buildBirthdayVoucherTemplate(
  params: {
    firstName: string;
    voucherUrl: string;
    voucherCode: string;
    discountPercentage: number;
    expiresAtLabel: string;
  },
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeFirstName = escapeHtml(params.firstName);
  const safeVoucherUrl = escapeHtml(params.voucherUrl);
  const safeVoucherCode = escapeHtml(params.voucherCode);
  const safeDiscountPercentage = escapeHtml(String(params.discountPercentage));
  const safeExpiresAtLabel = escapeHtml(params.expiresAtLabel);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      ¡Feliz cumpleaños ${safeFirstName}! Para celebrarlo te regalamos un bono de descuento válido por 24 horas.
    </p>
    <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
      <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#1e293b;">Tu bono</h3>
      <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Descuento:</strong> ${safeDiscountPercentage}%</p>
      <p style="margin:0 0 8px 0;font-size:16px;color:#0f172a;"><strong>Código:</strong> ${safeVoucherCode}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#334155;"><strong>Vence:</strong> ${safeExpiresAtLabel}</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#64748b;">Descarga tu bono aquí: <a href="${safeVoucherUrl}">Descargar PDF</a></p>
    </div>
  `;

  return {
    subject: `Feliz cumpleanos de parte de INKORA`,
    html: buildLayout({
      preheader: 'Tu bono de cumpleanos te espera',
      title: 'Feliz cumpleanos',
      intro: `Hola ${safeFirstName},`,
      bodyHtml,
      footer: 'Tu bono es valido por 24 horas. ¡Disfrutalo!',
      branding,
    }),
    text:
      `Feliz cumpleanos ${params.firstName}!\n` +
      `Descuento: ${params.discountPercentage}%\n` +
      `Codigo: ${params.voucherCode}\n` +
      `Vence: ${params.expiresAtLabel}\n` +
      `Descarga tu bono: ${params.voucherUrl}`,
  };
}

export function buildReturnApprovedTemplate(
  params: ReturnApprovedParams,
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeFirstName = escapeHtml(params.firstName);
  const safeReasonLabel = escapeHtml(params.reasonLabel);
  const safeValidationCode = escapeHtml(params.validationCode);
  const safeAdditionalDescription = escapeHtml(
    params.additionalDescription || 'Sin descripcion adicional',
  );

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Hola ${safeFirstName}, aprobamos tu solicitud de devolucion.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Solicitud</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">#${params.returnBookId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Compra</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">#${params.purchaseId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Motivo</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeReasonLabel}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Descripcion</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeAdditionalDescription}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Codigo de validacion</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;"><strong>${safeValidationCode}</strong></td>
      </tr>
    </table>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">
      Adjuntamos tu codigo QR en formato PNG. Presentalo en tienda fisica para validar la devolucion.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
      Si no puedes visualizar el adjunto, responde este correo para asistencia.
    </p>
  `;

  return {
    subject: `Devolucion aprobada #${params.returnBookId} - INKORA`,
    html: buildLayout({
      preheader: `Tu devolucion #${params.returnBookId} fue aprobada y ya tiene QR de validacion.`,
      title: 'Devolucion aprobada',
      intro: 'Tu solicitud esta lista para validacion en tienda.',
      bodyHtml,
      footer:
        'Este correo contiene un codigo QR unico para validar la devolucion en tienda fisica.',
      branding,
    }),
    text:
      `Tu devolucion #${params.returnBookId} fue aprobada.\n` +
      `Compra asociada: #${params.purchaseId}\n` +
      `Motivo: ${params.reasonLabel}\n` +
      `Descripcion: ${params.additionalDescription || 'Sin descripcion adicional'}\n` +
      `Codigo de validacion: ${params.validationCode}\n` +
      'Adjuntamos el codigo QR para validarlo en tienda fisica.',
  };
}

type ReturnRejectedParams = {
  firstName: string;
  returnBookId: number;
  purchaseId: number;
  reasonLabel: string;
  additionalDescription?: string;
  adminNote?: string;
};

export function buildReturnRejectedTemplate(
  params: ReturnRejectedParams,
  branding?: MailBrandingOptions,
): MailTemplate {
  const safeFirstName = escapeHtml(params.firstName);
  const safeReasonLabel = escapeHtml(params.reasonLabel);
  const safeAdditionalDescription = escapeHtml(
    params.additionalDescription || 'Sin descripcion adicional',
  );

  const safeAdminNote = params.adminNote ? escapeHtml(params.adminNote) : null;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Hola ${safeFirstName}, hemos revisado tu solicitud de devolucion y no fue aprobada.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Solicitud</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">#${params.returnBookId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Compra</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">#${params.purchaseId}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Motivo</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeReasonLabel}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-size:14px;color:#0f172a;"><strong>Descripcion</strong></td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${safeAdditionalDescription}</td>
      </tr>
    </table>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">
      Si consideras que hubo un error, por favor responde este correo indicando informacion adicional para que podamos revisarlo nuevamente.
    </p>
    ${safeAdminNote ? `<div style="margin-top:12px;padding:12px;border-left:4px solid #ef4444;background:#fff7f7;border-radius:6px;color:#7f1d1d;"><strong>Comentario del administrador:</strong><div style="margin-top:8px;font-size:14px;color:#4b1f1f;">${safeAdminNote}</div></div>` : ''}
  `;

  return {
    subject: `Solicitud de devolucion no aprobada #${params.returnBookId} - INKORA`,
    html: buildLayout({
      preheader: `Tu devolucion #${params.returnBookId} no fue aprobada.`,
      title: 'Solicitud no aprobada',
      intro: 'Resultado de la revision de tu solicitud',
      bodyHtml,
      footer:
        'Si necesitas asistencia, responde este correo y el equipo de soporte te ayudara.',
      branding,
    }),
    text:
      `Tu devolucion #${params.returnBookId} no fue aprobada.\n` +
      `Compra asociada: #${params.purchaseId}\n` +
      `Motivo: ${params.reasonLabel}\n` +
      `Descripcion: ${params.additionalDescription || 'Sin descripcion adicional'}\n`,
  };
}
