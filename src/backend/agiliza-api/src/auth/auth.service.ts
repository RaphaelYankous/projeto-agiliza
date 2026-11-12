import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { EmailService } from '../email/email.service.js';
import { TokenRedefinicaoSenha } from './entities/token-redefinicao-senha.entity.js';
import { JwtPayload } from './types/jwt-payload.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usuarioService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(TokenRedefinicaoSenha)
    private readonly tokenRepository: Repository<TokenRedefinicaoSenha>,
  ) {}

  async login(email: string, senha: string): Promise<{ access_token: string }> {
    const usuario = await this.usuarioService.findByEmail(email);

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, role: usuario.perfil };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async solicitarRecuperacaoSenha(email: string): Promise<{ message: string }> {
    const mensagemPadrao =
      'Se o e-mail informado estiver cadastrado, as instruções para redefinição foram enviadas.';

    const usuario = await this.usuarioService.findByEmail(email);
    if (!usuario) {
      return { message: mensagemPadrao };
    }

    // Gera token aleatório de 64 caracteres hexadecimais
    const tokenClaro = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenClaro).digest('hex');

    // Validade de 30 minutos
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000);

    const novoToken = this.tokenRepository.create({
      usuarioId: usuario.id,
      tokenHash,
      expiraEm,
      utilizadoEm: null,
    });

    await this.tokenRepository.save(novoToken);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const linkRedefinicao = `${frontendUrl}/redefinir-senha?token=${tokenClaro}`;

    this.logger.log(`Link de recuperação gerado para ${usuario.email}: ${linkRedefinicao}`);

    await this.emailService.enviarRecuperacaoSenha({
      destinatarioEmail: usuario.email,
      destinatarioNome: usuario.nome || 'Cliente',
      linkRedefinicao,
    });

    return { message: mensagemPadrao };
  }

  async redefinirSenha(token: string, novaSenha: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const registro = await this.tokenRepository.findOne({
  where: { tokenHash },
  });

    if (!registro || registro.utilizadoEm || registro.expiraEm < new Date()) {
      throw new BadRequestException('Token de recuperação inválido ou expirado.');
    }

    // Hasheia a nova senha com salt 10 (padrão bcrypt)
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    // Atualiza a senha no usuário e invalida o token
    await this.usuarioService.atualizarSenha(registro.usuarioId, senhaHash);

    registro.utilizadoEm = new Date();
    await this.tokenRepository.save(registro);

    return { message: 'Senha redefinida com sucesso.' };
  }
}