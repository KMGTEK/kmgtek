import { BRAND_COLORS, COMPANY } from '@kmg/shared';

export interface LayoutOptions {
  title: string;
  logoUrl: string;
  webUrl: string;
  primaryColor?: string;
}

/**
 * Branded HTML wrapper applied to every outgoing email: orange header with the
 * logo, white content card, and a footer with the company address.
 */
export function renderLayout(bodyHtml: string, options: LayoutOptions): string {
  const primary = options.primaryColor || BRAND_COLORS.primary;
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND_COLORS.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
            <tr>
              <td style="background:${primary};padding:20px 28px;" align="left">
                <a href="${options.webUrl}" style="text-decoration:none;color:#ffffff;font-size:20px;font-weight:700;">
                  <img src="${options.logoUrl}" alt="${COMPANY.displayName}" height="36" style="height:36px;vertical-align:middle;border:0;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;font-size:15px;line-height:1.6;color:#1f2430;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND_COLORS.ink};color:#b8bcc6;padding:22px 28px;font-size:12px;line-height:1.6;">
                <strong style="color:#ffffff;">${COMPANY.displayName}</strong><br />
                ${COMPANY.address.full}<br />
                <a href="mailto:${COMPANY.email}" style="color:${primary};text-decoration:none;">${COMPANY.email}</a>
                &nbsp;·&nbsp;
                <a href="${COMPANY.phoneHref}" style="color:${primary};text-decoration:none;">${COMPANY.phone}</a><br /><br />
                © ${year} ${COMPANY.legalName}. All rights reserved.
              </td>
            </tr>
          </table>
          <div style="max-width:600px;color:#98a0ae;font-size:11px;padding:14px 8px;">
            You are receiving this email because you interacted with ${COMPANY.displayName}.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
