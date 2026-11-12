import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { ConsultaMinhaAgendaDto } from './dto/consulta-minha-agenda.dto.js';
import { MinhaAgendaService } from './minha-agenda.service.js';

@ApiTags('Agenda do gestor')
@ApiBearerAuth()
@Roles(Role.GESTOR)
@Controller('agenda-gestor')
export class GestorAgendaController {
  constructor(private readonly service: MinhaAgendaService) {}

  @Get(':profissionalId')
  @ApiOperation({ summary: 'Consulta a agenda de um profissional da barbearia do gestor' })
  consultar(
    @CurrentUser() user: JwtPayload,
    @Param('profissionalId') profissionalId: string,
    @Query() query: ConsultaMinhaAgendaDto,
  ) {
    return this.service.consultarDoGestor(user.sub, profissionalId, query.data);
  }
}
