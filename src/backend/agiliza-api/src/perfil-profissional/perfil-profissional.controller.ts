import { Body, Controller, Get, ParseFilePipe, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto.js';
import { PerfilProfissionalService } from './perfil-profissional.service.js';

@ApiTags('Perfil profissional')
@ApiBearerAuth()
@Roles(Role.PROFISSIONAL)
@Controller('meu-perfil-profissional')
export class PerfilProfissionalController {
  constructor(private readonly service: PerfilProfissionalService) {}

  @Get()
  @ApiOperation({ summary: 'Obtém o perfil e o catálogo do estabelecimento do profissional autenticado' })
  consultar(@CurrentUser() user: JwtPayload) {
    return this.service.consultar(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza o nome do profissional autenticado' })
  atualizar(@CurrentUser() user: JwtPayload, @Body() dto: AtualizarPerfilDto) {
    return this.service.atualizar(user.sub, dto);
  }

  @Patch('foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['foto'], properties: { foto: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Substitui a foto do profissional autenticado (JPG, PNG ou WebP; até 2 MB)' })
  atualizarFoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) arquivo: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.service.atualizarFoto(user.sub, arquivo);
  }

  @Get('avaliacoes')
  @ApiOperation({ summary: 'Lista avaliações e calcula a nota do profissional autenticado' })
  avaliacoes(@CurrentUser() user: JwtPayload) {
    return this.service.avaliacoes(user.sub);
  }
}
