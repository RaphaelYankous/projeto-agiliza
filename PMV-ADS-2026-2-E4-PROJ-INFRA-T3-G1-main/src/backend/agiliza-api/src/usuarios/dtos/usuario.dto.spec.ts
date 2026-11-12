import 'reflect-metadata';
import { validate } from 'class-validator';
import type { EntityManager } from 'typeorm';
import { UsuarioDto } from './usuario.dto.js';
import { UsuarioCreateDto } from './usuario-create.dto.js';
import { UsuarioLoginDto } from './usuario-login.dto.js';
import { IsUnique } from '../../common/validators/isUnique.validator.js';
import { Role } from '../entities/usuario.entity.js';
import { dadosPessoa } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'UsuarioDto',
  criar: UsuarioDto,
  dados: { ...dadosPessoa, perfil: Role.CLIENTE },
  obrigatorios: [...Object.keys(dadosPessoa), 'perfil'],
  invalidos: [
    ['email', 'invalido'],
    ['senha', ''],
    ['perfil', 'dono'],
    ['nome', ''],
    ['sobrenome', 123],
    ['cpf', '1234567890'],
    ['cpf', '123456789012345'],
    ['telefone', '1234567'],
    ['telefone', '123456789012345'],
  ],
});

testarDto({
  nome: 'UsuarioLoginDto',
  criar: UsuarioLoginDto,
  dados: { email: dadosPessoa.email, senha: dadosPessoa.senha },
  obrigatorios: ['email', 'senha'],
  invalidos: [
    ['email', 'invalido'],
    ['senha', ''],
  ],
});

describe('UsuarioCreateDto — unicidade', () => {
  it.each([false, true])('valida o email consultando sua existência (%s)', async (existe) => {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getExists: vi.fn(async () => existe),
    };
    IsUnique.init({ createQueryBuilder: () => query } as unknown as EntityManager);
    const erros = await validate(
      Object.assign(new UsuarioCreateDto(), dadosPessoa, { perfil: Role.CLIENTE }),
    );
    expect(erros.map((erro) => erro.property)).toEqual(existe ? ['email'] : []);
  });
});
