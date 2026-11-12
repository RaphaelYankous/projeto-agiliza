import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgendamentosService } from './agendamentos.service.js';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { UpdateAgendamentoStatusDto } from './dto/update-agendamento-status.dto.js';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Post()
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Cria um agendamento para o cliente logado' })
  @ApiResponse({ status: 201, description: 'Agendamento criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou fora do horário de funcionamento.' })
  @ApiResponse({ status: 404, description: 'Cliente, profissional ou serviço não encontrado.' })
  @ApiResponse({ status: 409, description: 'O horário selecionado não está mais disponível.' })
  create(@CurrentUser() user: JwtPayload, @Body() createAgendamentoDto: CreateAgendamentoDto) {
    return this.agendamentosService.create(user.sub, createAgendamentoDto);
  }

  // Precisa ficar antes de qualquer rota GET com ':id', senão "meus" seria lido como um ID.
  @Get('meus')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Lista os agendamentos do cliente logado' })
  @ApiResponse({
    status: 200,
    description: 'Agendamentos do cliente, do mais recente ao mais antigo.',
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  listarMeus(@CurrentUser() user: JwtPayload) {
    return this.agendamentosService.listarDoCliente(user.sub);
  }

  @Get('resumo/:estabelecimentoId')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Consulta o resumo mensal de um estabelecimento do gestor' })
  resumoMensal(
    @CurrentUser() user: JwtPayload,
    @Param('estabelecimentoId') estabelecimentoId: string,
  ) {
    return this.agendamentosService.resumoMensalDoEstabelecimento(user.sub, estabelecimentoId);
  }

  @Delete(':id')
  @Roles(Role.CLIENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela um agendamento do cliente logado' })
  @ApiResponse({
    status: 204,
    description: 'Agendamento cancelado. O horário volta a ficar livre.',
  })
  @ApiResponse({ status: 403, description: 'O agendamento pertence a outro cliente.' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  @ApiResponse({ status: 409, description: 'O agendamento já está cancelado ou concluído.' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.agendamentosService.cancel(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza o status de um agendamento' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAgendamentoStatusDto,
  ) {
    return this.agendamentosService.updateStatus(id, dto);
  }
}
