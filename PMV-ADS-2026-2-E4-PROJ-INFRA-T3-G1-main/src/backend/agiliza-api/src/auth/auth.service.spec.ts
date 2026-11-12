import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import type { UsuariosService } from '../usuarios/usuarios.service.js';
import { Role } from '../usuarios/entities/usuario.entity.js';
import { dadosPessoa, usuario, ID } from '../../test/helpers/fixtures.js';

const { compararSenha } = vi.hoisted(() => ({ compararSenha: vi.fn(async () => true) }));
vi.mock('bcrypt', () => ({ default: { compare: compararSenha } }));

function montar() {
  const usuarios = {
    findByEmail: vi.fn(async (): Promise<ReturnType<typeof usuario> | null> => usuario()),
  };
  const jwt = { signAsync: vi.fn(async () => 'jwt-assinado') };
  const service = new AuthService(
    usuarios as unknown as UsuariosService,
    jwt as unknown as JwtService,
  );
  return { service, usuarios, jwt };
}

describe('AuthService', () => {
  beforeEach(() => compararSenha.mockReset().mockResolvedValue(true));

  it('gera apenas access_token com identidade e perfil do usuário encontrado', async () => {
    const { service, usuarios, jwt } = montar();
    await expect(service.login(dadosPessoa.email, dadosPessoa.senha)).resolves.toEqual({
      access_token: 'jwt-assinado',
    });
    expect(usuarios.findByEmail).toHaveBeenCalledWith(dadosPessoa.email);
    expect(bcrypt.compare).toHaveBeenCalledWith(dadosPessoa.senha, 'hash-armazenado');
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: ID,
      email: dadosPessoa.email,
      role: Role.CLIENTE,
    });
  });

  it('não compara senha nem gera token quando o email não existe', async () => {
    const { service, usuarios, jwt } = montar();
    usuarios.findByEmail.mockResolvedValueOnce(null);
    await expect(service.login('ausente@example.com', 'senha')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('não gera token para senha incorreta', async () => {
    const { service, jwt } = montar();
    compararSenha.mockResolvedValueOnce(false);
    await expect(service.login(dadosPessoa.email, 'incorreta')).rejects.toThrow(
      'Email ou senha inválidos.',
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('propaga falha ao assinar o token', async () => {
    const { service, jwt } = montar();
    const erro = new Error('Falha no JWT');
    jwt.signAsync.mockRejectedValueOnce(erro);
    await expect(service.login(dadosPessoa.email, dadosPessoa.senha)).rejects.toBe(erro);
  });
});
