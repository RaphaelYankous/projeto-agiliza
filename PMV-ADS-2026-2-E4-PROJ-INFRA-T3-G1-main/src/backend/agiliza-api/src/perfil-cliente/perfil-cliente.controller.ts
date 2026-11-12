import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { PerfilClienteService } from './perfil-cliente.service.js';

@ApiTags('Perfil cliente')
@ApiBearerAuth()
@Roles(Role.CLIENTE)
@Controller('meu-perfil-cliente')
export class PerfilClienteController {
  constructor(private readonly service: PerfilClienteService) {}

  @Get()
  @ApiOperation({ summary: 'Obtém os dados do perfil do cliente autenticado' })
  consultar(@CurrentUser() user: JwtPayload) {
    return this.service.consultar(user.sub);
  }

  @Get('fidelidade')
  @ApiOperation({ summary: 'Obtém os pontos de fidelidade do cliente autenticado' })
  fidelidade(@CurrentUser() user: JwtPayload) {
    return this.service.consultarFidelidade(user.sub);
  }
}