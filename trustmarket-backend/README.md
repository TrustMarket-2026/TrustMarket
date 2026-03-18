# DEV 3 — Semaine 1 : Module QR Code

## Fichiers générés

```
src/
├── modules/
│   └── qrcode/
│       ├── dto/
│       │   ├── generate-qr.dto.ts    ← DTO génération QR
│       │   └── scan-qr.dto.ts        ← DTO scan acheteur
│       ├── qrcode.service.ts         ← Logique métier (generateQR + validateScan)
│       ├── qrcode.controller.ts      ← 3 endpoints REST
│       └── qrcode.module.ts          ← Module NestJS
└── common/
    └── helpers/
        └── crypto.helper.ts          ← COPIE locale (à remplacer par celle de Dev 1)
```

## Endpoints exposés

| Méthode | Route                        | Rôle                        | Appelant        |
|---------|------------------------------|-----------------------------|-----------------|
| POST    | /qrcode/generate             | Génère QR après FUNDS_HELD  | TransactionsService (Dev 2) |
| POST    | /qrcode/scan                 | Scan acheteur → DELIVERED   | ACHETEUR (app)  |
| GET     | /qrcode/:transactionId       | Récupère QR du vendeur      | VENDEUR (app)   |

## Dépendances à demander à Dev 1 (Issue GitHub sem. 1)

- `src/common/helpers/crypto.helper.ts` → signHMAC + verifyHMAC
- `src/modules/auth/guards/jwt-auth.guard.ts`
- `src/modules/auth/decorators/current-user.decorator.ts`
- `src/database/prisma.service.ts` + `database.module.ts`

## Dépendances à demander à Dev 2 (Issue GitHub sem. 2)

- Queue BullMQ `'transactions'` avec jobs `autoRefund` et `releaseFunds`
- `MobileMoneyAccountService` (non requis sem. 1)

## Installation

```bash
npm install qrcode @types/qrcode
```

## Variables d'environnement nécessaires

```env
JWT_SECRET=...        # utilisé pour signer le token HMAC du QR Code
```

## Flux QR Code v4

```
Paiement confirmé (Dev 2 → FUNDS_HELD)
    ↓
POST /qrcode/generate
    ↓ token = UUID + HMAC-SHA256(transactionId + secret + timestamp)
    ↓ image PNG 300x300 base64
    ↓ status → QR_GENERATED
    ↓ job BullMQ autoRefund (delay 48h)
    ↓ Notif push + email VENDEUR (avec image QR en PJ)
        ↓
        [VENDEUR partage le QR à son livreur]
            ↓
            [LIVREUR livre le colis à l'ACHETEUR]
                ↓
POST /qrcode/scan (par l'ACHETEUR)
    ↓ vérifie HMAC + expiry + usage unique + buyerId = senderId
    ↓ status → DELIVERED
    ↓ annule job autoRefund
    ↓ déclenche job releaseFunds (Dev 2)
    ↓ Notif ACHETEUR + VENDEUR
```