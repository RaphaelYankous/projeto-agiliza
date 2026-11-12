import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { TAMANHO_MAXIMO_FOTO, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ProfissionaisService } from './profissionais.service.js';
import { CreateProfissionalDto } from './dto/create-profissional.dto.js';
import { UpdateProfissionalDto } from './dto/update-profissional.dto.js';

@ApiTags('Profissionais')
@ApiBearerAuth()
@Controller('estabelecimentos/:estabelecimentoId/profissionais')
export class ProfissionaisController {
  constructor(
    private readonly profissionaisService: ProfissionaisService,
  ) {}

  @Post()
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: 'Cadastra um novo profissional no estabelecimento do gestor logado',
  })
  create(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @CurrentUser() user: JwtPayload,
    @Body() createProfissionalDto: CreateProfissionalDto,
  ) {
    return this.profissionaisService.create(
      estabelecimentoId,
      user.sub,
      createProfissionalDto,
    );
  }

  @Get()
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: 'Lista, em ordem alfabética, os profissionais do estabelecimento do gestor logado',
  })
  findAll(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.profissionaisService.findAllByEstabelecimento(
      estabelecimentoId,
      user.sub,
    );
  }

  @Get('publicos')
  @ApiOperation({
    summary: 'Lista os profissionais do estabelecimento para qualquer usuário logado, sem dados de contato',
  })
  findAllPublicos(@Param('estabelecimentoId') estabelecimentoId: string) {
    return this.profissionaisService.findAllPublicos(estabelecimentoId);
  }

  @Get(':id')
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: 'Recupera os dados de um profissional do estabelecimento do gestor logado',
  })
  findOne(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.profissionaisService.findOne(estabelecimentoId, user.sub, id);
  }

  @Patch(':id')
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: 'Atualiza nome, sobrenome, e-mail, telefone e serviços de um profissional do estabelecimento do gestor logado',
  })
  update(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateProfissionalDto: UpdateProfissionalDto,
  ) {
    return this.profissionaisService.update(
      estabelecimentoId,
      user.sub,
      id,
      updateProfissionalDto,
    );
  }

  @Patch(':id/foto')
  @Roles(Role.GESTOR)
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: TAMANHO_MAXIMO_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['foto'], properties: { foto: { type: 'string', format: 'binary' } } } })
  @ApiOperation({
    summary: 'Substitui a foto de um profissional do estabelecimento do gestor logado (JPG, PNG ou WebP; até 2 MB)',
  })
  atualizarFoto(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) arquivo: ArquivoFoto,
  ) {
    return this.profissionaisService.atualizarFoto(estabelecimentoId, user.sub, id, arquivo);
  }

  @Delete(':id')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui um profissional do estabelecimento do gestor logado, preservando o histórico',
  })
  remove(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.profissionaisService.remove(estabelecimentoId, user.sub, id);
  }
}
