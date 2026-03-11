export function qrCodeEmailTemplate(
  prenom: string,
  montant: number,
  qrCodeBase64: string,
  transactionId: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre QR Code TrustMarket</title>
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
                  <p style="color: #a0a0b0; margin: 8px 0 0; font-size: 13px;">Votre QR Code de transaction</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 40px 30px;">
                  <p style="color: #333; font-size: 16px; margin: 0 0 10px;">Bonjour <strong>${prenom}</strong>,</p>
                  <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
                    Votre QR Code pour la transaction de 
                    <strong style="color: #1a1a2e;">${montant.toLocaleString('fr-FR')} FCFA</strong> 
                    est prêt. Présentez-le au livreur lors de la remise de votre commande.
                  </p>

                  <!-- QR Code Image -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <div style="background: #fff; border: 3px solid #1a1a2e; border-radius: 12px; padding: 20px; display: inline-block;">
                          <img src="${qrCodeBase64}" alt="QR Code TrustMarket" width="200" height="200" style="display: block;" />
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Transaction Info -->
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 15px 20px; margin: 20px 0;">
                    <table width="100%">
                      <tr>
                        <td style="color: #888; font-size: 13px;">ID Transaction</td>
                        <td style="color: #1a1a2e; font-weight: bold; font-size: 13px; text-align: right;">
                          ${transactionId.slice(0, 8).toUpperCase()}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 13px; padding-top: 8px;">Montant</td>
                        <td style="color: #f0a500; font-weight: bold; font-size: 15px; text-align: right; padding-top: 8px;">
                          ${montant.toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #888; font-size: 13px; padding-top: 8px;">Validité</td>
                        <td style="color: #1a1a2e; font-size: 13px; text-align: right; padding-top: 8px;">
                          48 heures
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #e74c3c; font-size: 13px; margin: 15px 0 0; text-align: center;">
                    ⚠️ Ne partagez ce QR Code qu'avec le livreur TrustMarket.
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