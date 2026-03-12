export function otpEmailTemplate(prenom: string, otpCode: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code de vérification TrustMarket</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #f0a500; margin: 0; font-size: 24px; letter-spacing: 2px;">TRUST<span style="color: #ffffff;">MARKET</span></h1>
                  <p style="color: #a0a0b0; margin: 8px 0 0; font-size: 13px;">Votre marché de confiance au Burkina Faso</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 40px 30px;">
                  <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Bonjour <strong>${prenom}</strong>,</p>
                  <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
                    Pour vérifier votre compte TrustMarket, utilisez le code ci-dessous.
                    Ce code est valable pendant <strong>10 minutes</strong>.
                  </p>

                  <!-- OTP Code -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <div style="background: #f8f9fa; border: 2px dashed #f0a500; border-radius: 12px; padding: 20px 40px; display: inline-block;">
                          <p style="margin: 0 0 5px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Votre code OTP</p>
                          <p style="margin: 0; font-size: 42px; font-weight: bold; color: #1a1a2e; letter-spacing: 8px;">${otpCode}</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #e74c3c; font-size: 13px; margin: 20px 0 0; text-align: center;">
                    ⚠️ Ne partagez jamais ce code avec personne.
                  </p>
                  <p style="color: #888; font-size: 13px; margin: 10px 0 0; text-align: center;">
                    Si vous n'avez pas demandé ce code, ignorez cet email.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
                  <p style="margin: 0; color: #aaa; font-size: 12px;">
                    © 2026 TrustMarket — Ouagadougou, Burkina Faso
                  </p>
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