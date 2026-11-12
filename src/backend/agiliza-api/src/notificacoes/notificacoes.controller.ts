import { Controller, Get, Patch, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { NotificacoesService } from './notificacoes.service.js';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as notificações do usuário autenticado' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.sub);
  }

  @Patch(':id/lida')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  marcarComoLida(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.marcarComoLida(user.sub, id);
  }
}
