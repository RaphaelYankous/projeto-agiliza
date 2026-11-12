import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Header,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { LIMITE_UPLOAD_FOTO, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { EstabelecimentosService } from './estabelecimentos.service.js';
import { BuscarEstabelecimentosDto } from './dto/buscar-estabelecimentos.dto.js';
import { CreateEstabelecimentoDto } from './dto/create-estabelecimento.dto.js';
import { UpdateEstabelecimentoDto } from './dto/update-estabelecimento.dto.js';

@ApiTags('Estabelecimentos')
@ApiBearerAuth()
@Controller('estabelecimentos')
export class EstabelecimentosController {
  constructor(private readonly estabelecimentosService: EstabelecimentosService) {}

  @Post()
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Cadastra um novo estabelecimento para o gestor logado' })
  create(@CurrentUser() user: JwtPayload, @Body() createDto: CreateEstabelecimentoDto) {
    return this.estabelecimentosService.create({ ...createDto, gestorId: user.sub });
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os estabelecimentos' })
  findAll() {
    return this.estabelecimentosService.findAll();
  }

  @Get('meus')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Lista os estabelecimentos do gestor logado' })
  findMeus(@CurrentUser() user: JwtPayload) {
    return this.estabelecimentosService.findByGestorId(user.sub);
  }

  @Get('busca')
  @ApiOperation({
    summary: 'Busca estabelecimentos pelo nome e ordena por distância, preço ou avaliação',
  })
  buscar(@Query() filtros: BuscarEstabelecimentosDto) {
    return this.estabelecimentosService.buscar(filtros);
  }

  @Get(':id/foto')
  @Public()
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Obtém a foto principal do estabelecimento (imagem pública)' })
  async foto(@Param('id') id: string): Promise<StreamableFile> {
    const { conteudo, tipo } = await this.estabelecimentosService.foto(id);
    return new StreamableFile(conteudo, {
      type: tipo,
      length: conteudo.length,
    });
  }

  @Patch(':id/foto')
  @Roles(Role.GESTOR)
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['foto'], properties: { foto: { type: 'string', format: 'binary' } } } })
  @ApiOperation({
    summary: 'Envia ou troca a foto principal de um estabelecimento do gestor logado (JPG, PNG ou WebP; até 2 MB)',
  })
  atualizarFoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) arquivo?: ArquivoFoto,
  ) {
    return this.estabelecimentosService.atualizarFoto(id, user.sub, arquivo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recupera os detalhes de um estabelecimento por ID' })
  findOne(@Param('id') id: string) {
    return this.estabelecimentosService.findOne(id);
  }

  @Get('gestor/:gestorId')
  @ApiOperation({ summary: 'Lista estabelecimentos de um gestor' })
  findByGestorId(@Param('gestorId') gestorId: string) {
    return this.estabelecimentosService.findByGestorId(gestorId);
  }

  @Patch(':id')
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: 'Atualiza dados de um estabelecimento do gestor logado' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdateEstabelecimentoDto,
  ) {
    return this.estabelecimentosService.update(id, user.sub, updateDto);
  }

  @Delete(':id')
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um estabelecimento do gestor logado' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.estabelecimentosService.remove(id, user.sub);
  }
}
