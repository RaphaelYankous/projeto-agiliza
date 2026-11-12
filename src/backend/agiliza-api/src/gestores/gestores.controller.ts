import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LIMITE_UPLOAD_FOTO, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { GestorCreateDto } from './dtos/gestor-create.dto.js';
import { GestorUpdateDto } from './dtos/gestor-update.dto.js';
import { GestoresService, type PerfilGestorResposta } from './gestores.service.js';
import { Gestor } from './entities/gestor.entity.js';

@ApiTags('Gestores')
@ApiBearerAuth()
@Roles(Role.GESTOR)
@Controller('gestores')
export class GestoresController {
  constructor(private readonly gestoresService: GestoresService) {}

  @Post()
  @Public()
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Cadastra um gestor e, opcionalmente, a foto (JPG, PNG ou WebP; até 2 MB)' })
  create(
    @Body() dto: GestorCreateDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) foto?: ArquivoFoto,
  ): Promise<Gestor> {
    return this.gestoresService.create(dto, foto);
  }

  @Get('perfil')
  @ApiOperation({ summary: 'Obtém os dados do perfil do gestor logado' })
  consultarPerfil(@CurrentUser() user: JwtPayload): Promise<PerfilGestorResposta> {
    return this.gestoresService.consultarPerfil(user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os gestores' })
  findAll(): Promise<Gestor[]> {
    return this.gestoresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um gestor por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<Gestor> {
    this.garantirDono(id, user.sub);
    return this.gestoresService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Atualiza os dados de um gestor e, opcionalmente, a foto' })
  async update(
    @Param('id') id: string,
    @Body() dto: GestorUpdateDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) foto?: ArquivoFoto,
  ): Promise<Gestor> {
    this.garantirDono(id, user.sub);
    return this.gestoresService.update(id, dto, foto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um gestor' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    this.garantirDono(id, user.sub);
    return this.gestoresService.remove(id);
  }

  private garantirDono(gestorId: string, usuarioIdLogado: string): void {
    if (gestorId !== usuarioIdLogado) {
      throw new ForbiddenException('Você só pode acessar os seus próprios dados.');
    }
  }
}