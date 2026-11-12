import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { UsuarioResponseDto } from './dtos/usuario-response.dto.js';
import { UsuarioCreateDto } from './dtos/usuario-create.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  findAll(): Promise<UsuarioResponseDto[]> {
    return this.usuariosService.findAll();
  }

  @Get('me/foto')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém a foto de perfil do usuário autenticado, de qualquer perfil' })
  minhaFoto(@CurrentUser() user: JwtPayload): Promise<{ foto: string | null }> {
    return this.usuariosService.fotoDe(user.sub);
  }

  @Post()
  @Public()
  create(@Body() dto: UsuarioCreateDto): Promise<UsuarioResponseDto> {
    return this.usuariosService.create(dto);
  }
}
