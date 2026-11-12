import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { LIMITE_UPLOAD_FOTO } from '../../common/utils/foto-perfil.js';
import type { JwtPayload } from '../../auth/types/jwt-payload.js';
import { Role } from '../../usuarios/entities/usuario.entity.js';
import {
  EstabelecimentoGaleriaService,
  LIMITE_GALERIA,
  type ArquivoGaleria,
} from './estabelecimento-galeria.service.js';
import { LimiteArquivosGaleriaFilter } from './limite-arquivos-galeria.filter.js';

@ApiTags('Estabelecimentos')
@ApiBearerAuth()
@Controller('estabelecimentos/:id/fotos')
export class EstabelecimentoGaleriaController {
  constructor(private readonly galeriaService: EstabelecimentoGaleriaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lista as fotos da galeria do estabelecimento, na ordem de envio' })
  listar(@Param('id') id: string) {
    return this.galeriaService.listar(id);
  }

  @Get(':fotoId')
  @Public()
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Obtém uma foto da galeria do estabelecimento (imagem pública)' })
  async foto(@Param('id') id: string, @Param('fotoId') fotoId: string): Promise<StreamableFile> {
    const { conteudo, tipo } = await this.galeriaService.foto(id, fotoId);
    return new StreamableFile(conteudo, { type: tipo, length: conteudo.length });
  }

  @Post()
  @Roles(Role.GESTOR)
  @UseFilters(LimiteArquivosGaleriaFilter)
  @UseInterceptors(
    FilesInterceptor('fotos', undefined, {
      limits: { fileSize: LIMITE_UPLOAD_FOTO, files: LIMITE_GALERIA },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fotos'],
      properties: { fotos: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @ApiOperation({
    summary: `Adiciona fotos à galeria do estabelecimento do gestor logado (JPG, PNG ou WebP; até 2 MB cada; até ${LIMITE_GALERIA} fotos)`,
  })
  adicionar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFiles() arquivos?: ArquivoGaleria[],
  ) {
    return this.galeriaService.adicionar(id, user.sub, arquivos);
  }

  @Delete(':fotoId')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma foto da galeria do estabelecimento do gestor logado' })
  remover(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.galeriaService.remover(id, user.sub, fotoId);
  }
}
