import { OmitType } from '@nestjs/swagger';
import { UsuarioDto } from '../../usuarios/dtos/usuario.dto.js';

export class GestorCreateDto extends OmitType(UsuarioDto, ['perfil'] as const) {}