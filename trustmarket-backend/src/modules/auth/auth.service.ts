import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { generateOTP, getOTPExpiry, isOTPExpired } from '../../common/helpers/otp.helper';
import { formatPhone, isValidBurkinaPhone } from '../../common/helpers/phone.helper';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────
  // INSCRIPTION
  // ─────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1. Valide le numéro de téléphone burkinabè
    if (!isValidBurkinaPhone(dto.telephone)) {
      throw new BadRequestException(
        'Numéro de téléphone invalide. Utilisez un numéro burkinabè valide (ex: 07XXXXXXXX)',
      );
    }

    const telephoneFormate = formatPhone(dto.telephone);

    // 2. Vérifie que l'email et le téléphone ne sont pas déjà utilisés
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { telephone: telephoneFormate }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    // 3. Hash du mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 4. Génération de l'OTP
    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    // 5. Création de l'utilisateur (non vérifié)
    const user = await this.prisma.user.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: telephoneFormate,
        password: hashedPassword,
        role: dto.role ?? 'CLIENT',
        otpCode,
        otpExpiry,
        isVerified: false,
      },
    });

    // TODO Prompt 1-6 : Envoyer l'OTP par email via EmailService
    // await this.emailService.sendOtp(user.email, user.prenom, otpCode);

    // En développement, on retourne l'OTP dans la réponse
    const isDev = this.configService.get('app.nodeEnv') === 'development';

    return {
      message: 'Inscription réussie. Vérifiez votre email pour le code OTP.',
      email: user.email,
      ...(isDev && { otpCode }), // Seulement en développement !
    };
  }

  // ─────────────────────────────────────────
  // VÉRIFICATION OTP
  // ─────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Aucun compte trouvé avec cet email');
    }

    if (user.isVerified) {
      throw new BadRequestException('Ce compte est déjà vérifié');
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new BadRequestException('Aucun OTP en attente. Faites une nouvelle demande.');
    }

    // Vérifie que l'OTP n'est pas expiré
    if (isOTPExpired(user.otpExpiry)) {
      throw new BadRequestException('Code OTP expiré. Demandez un nouveau code.');
    }

    // Vérifie que le code est correct
    if (user.otpCode !== dto.code) {
      throw new UnauthorizedException('Code OTP incorrect');
    }

    // Active le compte
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    });

    // Génère les tokens JWT directement après vérification
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Compte vérifié avec succès !',
      ...tokens,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    };
  }

  // ─────────────────────────────────────────
  // RENVOI OTP
  // ─────────────────────────────────────────
  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Aucun compte trouvé avec cet email');
    }

    if (user.isVerified) {
      throw new BadRequestException('Ce compte est déjà vérifié');
    }

    const otpCode = generateOTP();
    const otpExpiry = getOTPExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry },
    });

    // TODO Prompt 1-6 : Envoyer l'OTP par email
    // await this.emailService.sendOtp(user.email, user.prenom, otpCode);

    const isDev = this.configService.get('app.nodeEnv') === 'development';

    return {
      message: 'Nouveau code OTP envoyé par email.',
      ...(isDev && { otpCode }),
    };
  }

  // ─────────────────────────────────────────
  // CONNEXION
  // ─────────────────────────────────────────
  async login(dto: LoginDto) {
    // Cherche par email OU par téléphone
    const telephone = isValidBurkinaPhone(dto.emailOrPhone)
      ? formatPhone(dto.emailOrPhone)
      : null;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.emailOrPhone },
          ...(telephone ? [{ telephone }] : []),
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email/téléphone ou mot de passe incorrect');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Compte non vérifié. Vérifiez votre email pour le code OTP.',
      );
    }

    // Vérifie le mot de passe
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email/téléphone ou mot de passe incorrect');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Connexion réussie',
      ...tokens,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    };
  }

  // ─────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────
  async refreshTokens(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Accès refusé');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Tokens renouvelés avec succès',
      ...tokens,
    };
  }

  // ─────────────────────────────────────────
  // DÉCONNEXION
  // ─────────────────────────────────────────
  async logout(userId: string) {
    // Avec JWT stateless, la déconnexion se fait côté client
    // Pour une sécurité renforcée, on pourrait blacklister le token dans Redis
    return { message: 'Déconnexion réussie' };
  }

  // ─────────────────────────────────────────
  // MÉTHODE PRIVÉE — Génération des tokens
  // ─────────────────────────────────────────
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}