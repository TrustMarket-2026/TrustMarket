import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — Mon profil
  @Get('me')
  @ApiOperation({ summary: 'Récupérer mon profil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMyProfile(
    @CurrentUser() user: { userId: string },
  ): Promise<UserResponseDto> {
    return this.usersService.getMyProfile(user.userId);
  }

  // PATCH /users/me — Mettre à jour mon profil
  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMyProfile(user.userId, dto);
  }

  // DELETE /users/me — Supprimer mon compte
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer mon compte' })
  @ApiResponse({ status: 200, description: 'Compte supprimé' })
  async deleteMyAccount(
    @CurrentUser() user: { userId: string },
  ): Promise<{ message: string }> {
    return this.usersService.deleteMyAccount(user.userId);
  }

  // GET /users — Liste tous les users (ADMIN uniquement)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Liste tous les utilisateurs (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getAllUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // GET /users/phone/:telephone — Trouve par téléphone (ADMIN)
  @Get('phone/:telephone')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Trouver un utilisateur par téléphone (Admin)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findByPhone(
    @Param('telephone') telephone: string,
  ): Promise<UserResponseDto | null> {
    return this.usersService.findByPhone(telephone);
  }

  // GET /users/:id — Récupère un user par ID (ADMIN)
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID (Admin)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(id);
  }
}