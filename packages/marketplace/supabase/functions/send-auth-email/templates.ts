/**
 * HTML email template builder for auth emails
 * Uses Second Turn Games brand design (Nord color scheme)
 */

export interface EmailTemplateProps {
  heading: string
  body: string
  ctaText: string
  ctaUrl: string
  expiryNote: string
  featuresHeading?: string
  footerNote: string
  footerSecurity: string
  tagline: string
  features?: string[]
}

export function buildEmailHtml(props: EmailTemplateProps): string {
  const {
    heading,
    body,
    ctaText,
    ctaUrl,
    expiryNote,
    featuresHeading,
    footerNote,
    footerSecurity,
    tagline,
    features,
  } = props

  const logoUrl = 'https://ettbijaifahenypkmsts.supabase.co/storage/v1/object/public/public-assets/logo_nav.svg'

  // Build features section HTML if features are provided
  const featuresHtml = features && features.length > 0 && featuresHeading
    ? `
      <tr>
        <td style="padding: 0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="height: 1px; background-color: #D8DEE9;"></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px 40px 32px 40px;">
          <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #2E3440;">
            ${featuresHeading}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="text-align: left;">
            ${features.map(feature => `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #4C566A;">• ${feature}</td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
    : ''

  // Build footer security line if provided
  const footerSecurityHtml = footerSecurity
    ? `<p style="margin: 0; font-size: 13px; color: #4C566A;">${footerSecurity}</p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ECEFF4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${body.substring(0, 100)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ECEFF4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #FEFEFE; border-radius: 16px; box-shadow: 0 4px 24px rgba(46, 52, 64, 0.08);">

          <!-- Accent Bar -->
          <tr>
            <td style="height: 6px; background-color: #88C0D0; border-radius: 16px 16px 0 0;"></td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 32px 40px;">
              <img
                src="${logoUrl}"
                alt="Second Turn Games"
                width="180"
                style="display: block; max-width: 180px; height: auto;"
              />
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #2E3440; line-height: 1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4C566A;">
                ${body}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #88C0D0; border-radius: 10px;">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #2E3440; text-decoration: none; letter-spacing: 0.3px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Note -->
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 13px; color: #4C566A;">
                ${expiryNote}
              </p>
            </td>
          </tr>

          <!-- Features Section (optional) -->
          ${featuresHtml}

          <!-- Footer Note -->
          <tr>
            <td style="background-color: #ECEFF4; border-radius: 0 0 16px 16px; padding: 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #4C566A;">
                      ${footerNote}
                    </p>
                    ${footerSecurityHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Company Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #4C566A;">
                Second Turn Games SIA · Riga, Latvia
              </p>
              <p style="margin: 0; font-size: 12px; color: #4C566A;">
                ${tagline}
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}
