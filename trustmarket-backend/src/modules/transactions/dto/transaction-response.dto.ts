// ============================================================
//  Transaction Response DTO
//  DEV 2 — Semaine 2
// ============================================================
import { TransactionStatus, Operator } from '@prisma/client';

export class TransactionResponseDto {
  id: string;
  montant: number;
  commission: number;
  montantNet: number;
  operator: Operator;
  status: TransactionStatus;
  description: string | null;
  deepLink: string;
  senderNom: string;
  receiverNom: string;
  createdAt: Date;
  updatedAt: Date;
}