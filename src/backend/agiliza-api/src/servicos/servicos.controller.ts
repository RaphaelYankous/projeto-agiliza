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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicosService } from './servicos.service.js';
import { CreateServicoDto } from './dto/create-servico.dto.js';
import { UpdateServicoDto } from './dto/update-servico.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

@ApiTags('Serviços')
@ApiBearerAuth()
@Controller('estabelecimentos/:estabelecimentoId/servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Post()
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Cadastra um novo serviço no estabelecimento' })
  create(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @CurrentUser() user: JwtPayload,
    @Body() createServicoDto: CreateServicoDto,
  ) {
    createServicoDto.estabelecimentoId = estabelecimentoId;
    return this.servicosService.create(
      estabelecimentoId,
      user.sub,
      createServicoDto,
    );
  }

  @Get()
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Lista todos os serviços de um estabelecimento' })
  findAll(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicosService.findAllByEstabelecimento(
      estabelecimentoId,
      user.sub,
    );
  }

  @Get('publicos')
  @ApiOperation({ summary: 'Lista os serviços de um estabelecimento para qualquer usuário logado' })
  findAllPublicos(@Param('estabelecimentoId') estabelecimentoId: string) {
    return this.servicosService.findAllPublicos(estabelecimentoId);
  }

  @Get(':id')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Recupera os detalhes de um serviço por ID' })
  findOne(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicosService.findOne(estabelecimentoId, user.sub, id);
  }

  @Patch(':id')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Atualiza dados de um serviço' })
  update(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateServicoDto: UpdateServicoDto,
  ) {
    return this.servicosService.update(
      estabelecimentoId,
      user.sub,
      id,
      updateServicoDto,
    );
  }

  @Delete(':id')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um serviço' })
  remove(
    @Param('estabelecimentoId') estabelecimentoId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicosService.remove(estabelecimentoId, user.sub, id);
  }
}
