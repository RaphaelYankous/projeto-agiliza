import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseFilePipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LIMITE_UPLOAD_FOTO, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import { AvaliacoesClienteService } from './avaliacoes-cliente.service.js';
import { CriarAvaliacaoClienteDto } from './dto/criar-avaliacao-cliente.dto.js';

// Rotas com dois segmentos depois de /avaliacoes: não colidem com GET /avaliacoes/:id.
@ApiTags('Avaliações do cliente')
@ApiBearerAuth()
@Controller('avaliacoes')
export class AvaliacoesClienteController {
  constructor(private readonly service: AvaliacoesClienteService) {}

  @Post('agendamento/:agendamentoId')
  @Roles(Role.CLIENTE)
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Avalia um atendimento concluído do cliente logado' })
  @ApiResponse({ status: 201, description: 'Avaliação registrada.' })
  @ApiResponse({ status: 400, description: 'Nota, comentário ou foto inválidos.' })
  @ApiResponse({ status: 403, description: 'O agendamento pertence a outro cliente.' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.' })
  @ApiResponse({ status: 409, description: 'Atendimento não concluído ou já avaliado.' })
  criar(
    @CurrentUser() user: JwtPayload,
    @Param('agendamentoId') agendamentoId: string,
    @Body() dto: CriarAvaliacaoClienteDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) foto?: ArquivoFoto,
  ) {
    return this.service.criar(user.sub, agendamentoId, dto, foto);
  }

  @Get('cliente/minhas')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Lista as avaliações já feitas pelo cliente logado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de { agendamentoId, nota, comentario, temFoto }.',
  })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  listarMinhas(@CurrentUser() user: JwtPayload) {
    return this.service.listarDoCliente(user.sub);
  }

  @Get('agendamento/:agendamentoId/foto')
  @Roles(Role.CLIENTE)
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Obtém a foto que o cliente logado enviou na avaliação (imagem privada)' })
  @ApiResponse({ status: 200, description: 'Imagem JPG, PNG ou WebP.' })
  @ApiResponse({ status: 404, description: 'Avaliação sem foto ou de outro cliente.' })
  async foto(
    @CurrentUser() user: JwtPayload,
    @Param('agendamentoId') agendamentoId: string,
  ): Promise<StreamableFile> {
    const { conteudo, tipo } = await this.service.buscarFoto(user.sub, agendamentoId);
    return new StreamableFile(conteudo, { type: tipo });
  }
}
