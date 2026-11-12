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
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LIMITE_UPLOAD_FOTO, type ArquivoFoto } from '../common/utils/foto-perfil.js';
import { ClientesService } from './clientes.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Cadastra um novo cliente com suas credenciais de usuário e, opcionalmente, a foto',
  })
  create(
    @Body() createClienteDto: CreateClienteDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) foto?: ArquivoFoto,
  ) {
    return this.clientesService.create(createClienteDto, foto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Busca um cliente pelo seu ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.garantirDono(id, user.sub);
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.CLIENTE)
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: LIMITE_UPLOAD_FOTO, files: 1 } }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Atualiza os dados de um cliente e, opcionalmente, a foto' })
  async update(
    @Param('id') id: string,
    @Body() updateClienteDto: UpdateClienteDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false })) foto?: ArquivoFoto,
  ) {
    await this.garantirDono(id, user.sub);
    return this.clientesService.update(id, updateClienteDto, foto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.CLIENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um cliente e seu usuário vinculado' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.garantirDono(id, user.sub);
    return this.clientesService.remove(id);
  }

  private async garantirDono(clienteId: string, usuarioIdLogado: string): Promise<void> {
    const cliente = await this.clientesService.findOne(clienteId);
    if (cliente.usuarioId !== usuarioIdLogado) {
      throw new ForbiddenException('Você só pode acessar os seus próprios dados.');
    }
  }
}