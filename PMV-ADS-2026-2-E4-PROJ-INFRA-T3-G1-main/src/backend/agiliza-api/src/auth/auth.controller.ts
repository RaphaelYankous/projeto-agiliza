import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsuarioLoginDto } from '../usuarios/dtos/usuario-login.dto.js';
import { RecuperarSenhaDto } from './dtos/recuperar-senha.dto.js';
import { RedefinirSenhaDto } from './dtos/redefinir-senha.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Public()
  login(@Body() usuario: UsuarioLoginDto) {
    return this.authService.login(usuario.email, usuario.senha);
  }

  @HttpCode(HttpStatus.OK)
  @Post('recuperar-senha')
  @Public()
  recuperarSenha(@Body() dto: RecuperarSenhaDto) {
    return this.authService.solicitarRecuperacaoSenha(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('redefinir-senha')
  @Public()
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.authService.redefinirSenha(dto.token, dto.novaSenha);
  }
}