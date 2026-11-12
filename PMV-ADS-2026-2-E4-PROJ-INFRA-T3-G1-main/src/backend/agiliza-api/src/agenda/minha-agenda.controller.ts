import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { CreateMeuBloqueioDto } from './dto/create-meu-bloqueio.dto.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { ConsultaMinhaAgendaDto } from './dto/consulta-minha-agenda.dto.js';
import { MinhaAgendaService } from './minha-agenda.service.js';

@ApiTags('Minha agenda')
@ApiBearerAuth()
@Roles(Role.PROFISSIONAL)
@Controller('minha-agenda')
export class MinhaAgendaController {
  constructor(private readonly service: MinhaAgendaService) {}

  @Get()
  @ApiOperation({ summary: 'Consulta disponibilidades, agendamentos e bloqueios do profissional logado no dia' })
  consultar(@CurrentUser() user: JwtPayload, @Query() query: ConsultaMinhaAgendaDto) {
    return this.service.consultar(user.sub, query.data);
  }

  @Get('bloqueios')
  @ApiOperation({ summary: 'Lista os bloqueios do profissional autenticado' })
  listarBloqueios(@CurrentUser() user: JwtPayload) {
    return this.service.listarBloqueios(user.sub);
  }

  @Get('disponibilidades')
  @ApiOperation({ summary: 'Lista a disponibilidade semanal do profissional autenticado' })
  listarDisponibilidades(@CurrentUser() user: JwtPayload) {
    return this.service.listarDisponibilidades(user.sub);
  }

  @Post('disponibilidades')
  @ApiOperation({ summary: 'Cadastra um horário semanal para o profissional autenticado' })
  criarDisponibilidade(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisponibilidadeDto) {
    return this.service.criarDisponibilidade(user.sub, dto);
  }

  @Delete('disponibilidades/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma disponibilidade do profissional autenticado' })
  removerDisponibilidade(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removerDisponibilidade(user.sub, id);
  }

  @Post('bloqueios')
  @ApiOperation({ summary: 'Bloqueia um horário ou um dia inteiro na agenda do profissional logado' })
  criarBloqueio(@CurrentUser() user: JwtPayload, @Body() dto: CreateMeuBloqueioDto) {
    return this.service.criarBloqueio(user.sub, dto);
  }

  @Delete('bloqueios/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um bloqueio do profissional logado' })
  removerBloqueio(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removerBloqueio(user.sub, id);
  }
}
