import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

import { AgendasService } from './agenda.service.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto.js';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto.js';

@ApiTags('Agendas')
@ApiBearerAuth()
@Controller()
export class AgendasController {
  constructor(private readonly agendasService: AgendasService) {}

  // ---------- Disponibilidades ----------

  @Post('profissionais/:profissionalId/disponibilidades')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Cadastra um horário recorrente de disponibilidade (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Profissional não encontrado.' })
  createDisponibilidade(
    @Param('profissionalId') profissionalId: string,
    @Body() dto: CreateDisponibilidadeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agendasService.createDisponibilidade(profissionalId, dto, user.sub);
  }

  @Get('profissionais/:profissionalId/disponibilidades')
  @ApiOperation({ summary: 'Lista as disponibilidades de um profissional' })
  findDisponibilidades(@Param('profissionalId') profissionalId: string) {
    return this.agendasService.findDisponibilidadesByProfissional(profissionalId);
  }

  @Patch('disponibilidades/:id')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Atualiza uma disponibilidade (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Disponibilidade não encontrada.' })
  updateDisponibilidade(
    @Param('id') id: string,
    @Body() dto: UpdateDisponibilidadeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agendasService.updateDisponibilidade(id, dto, user.sub);
  }

  @Delete('disponibilidades/:id')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma disponibilidade (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Disponibilidade não encontrada.' })
  removeDisponibilidade(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.agendasService.removeDisponibilidade(id, user.sub);
  }

  // ---------- Bloqueios ----------

  @Post('profissionais/:profissionalId/bloqueios')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Cadastra um bloqueio (folga, férias, imprevisto) (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Profissional não encontrado.' })
  createBloqueio(
    @Param('profissionalId') profissionalId: string,
    @Body() dto: CreateBloqueioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agendasService.createBloqueio(profissionalId, dto, user.sub);
  }

  @Get('profissionais/:profissionalId/bloqueios')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Lista os bloqueios de um profissional (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Profissional não encontrado.' })
  findBloqueios(@Param('profissionalId') profissionalId: string, @CurrentUser() user: JwtPayload) {
    return this.agendasService.findBloqueiosByProfissional(profissionalId, user.sub);
  }

  @Delete('bloqueios/:id')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um bloqueio (só o gestor dono)' })
  @ApiResponse({
    status: 403,
    description: 'Perfil diferente de gestor ou profissional de outro estabelecimento.',
  })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado.' })
  removeBloqueio(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.agendasService.removeBloqueio(id, user.sub);
  }

  // ---------- Horários disponíveis ----------

  @Get('profissionais/:profissionalId/horarios-disponiveis')
  @ApiOperation({ summary: 'Calcula os horários livres de um profissional em uma data' })
  getHorariosDisponiveis(
    @Param('profissionalId') profissionalId: string,
    @Query('data') data: string,
    @Query('servicoId') servicoId: string,
  ) {
    return this.agendasService.getHorariosDisponiveis(profissionalId, data, servicoId);
  }
}
