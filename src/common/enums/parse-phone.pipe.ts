// ============================================================
//  Parse Phone Pipe
//  Valide et normalise automatiquement les numéros de téléphone
//  burkinabè dans les requêtes entrantes
// ============================================================

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { formatPhone, isValidBurkinaPhone } from '../enums/phone.helper';

@Injectable()
export class ParsePhonePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('Le numéro de téléphone est requis');
    }

    if (!isValidBurkinaPhone(value)) {
      throw new BadRequestException(
        `Numéro de téléphone invalide : "${value}". ` +
        `Formats acceptés : 07XXXXXXXX, +22607XXXXXXXX`,
      );
    }

    // Retourne le numéro normalisé au format +226XXXXXXXX
    return formatPhone(value);
  }
}