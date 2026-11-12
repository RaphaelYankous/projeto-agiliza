import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { UsuariosService } from './usuarios.service.js';
import { Usuario, Role } from './entities/usuario.entity.js';
import { dadosPessoa, usuario } from '../../test/helpers/fixtures.js';
import { repositoryMock } from '../../test/helpers/mocks.js';

vi.mock('bcrypt', () => ({ default: { hash: vi.fn(async () => 'hash-seguro') } }));

function montar() {
  const repository = repositoryMock(usuario());
  const service = new UsuariosService(repository as unknown as Repository<Usuario>);
  return { service, repository };
}

describe('UsuariosService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persiste somente o hash da senha e mantém o perfil informado', async () => {
    const { service, repository } = montar();
    await service.create({ ...dadosPessoa, perfil: Role.CLIENTE });
    expect(bcrypt.hash).toHaveBeenCalledWith(dadosPessoa.senha, 10);
    expect(repository.create).toHaveBeenCalledWith({
      ...dadosPessoa,
      perfil: Role.CLIENTE,
      senha: 'hash-seguro',
    });
  });

  it('converte duplicidade de banco em conflito', async () => {
    const { service, repository } = montar();
    repository.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    await expect(service.create({ ...dadosPessoa, perfil: Role.CLIENTE })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('propaga outros erros de persistência', async () => {
    const { service, repository } = montar();
    const erro = new Error('Banco indisponível');
    repository.save.mockRejectedValueOnce(erro);
    await expect(service.create({ ...dadosPessoa, perfil: Role.CLIENTE })).rejects.toBe(erro);
  });

  it('lista usuários, inclusive quando não há resultados', async () => {
    const { service, repository } = montar();
    await expect(service.findAll()).resolves.toHaveLength(1);
    repository.find.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('busca pelo email e retorna null para usuário inexistente', async () => {
    const { service, repository } = montar();
    await expect(service.findByEmail(dadosPessoa.email)).resolves.toMatchObject({
      email: dadosPessoa.email,
    });
    expect(repository.findOneBy).toHaveBeenCalledWith({ email: dadosPessoa.email });
    repository.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findByEmail('ausente@example.com')).resolves.toBeNull();
  });

  it('devolve a foto do usuário do token como data URL, lendo só a foto', async () => {
    const { service, repository } = montar();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    repository.findOne.mockResolvedValueOnce(Object.assign(usuario(), { fotoPerfil: png }));
    await expect(service.fotoDe('usuario-1')).resolves.toEqual({
      foto: `data:image/png;base64,${png.toString('base64')}`,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      select: { id: true, fotoPerfil: true },
    });
  });

  it.each([
    ['sem foto', Object.assign(usuario(), { fotoPerfil: null })],
    ['inexistente', null],
  ])('devolve foto nula para usuário %s', async (_caso, encontrado) => {
    const { service, repository } = montar();
    repository.findOne.mockResolvedValueOnce(encontrado);
    await expect(service.fotoDe('usuario-1')).resolves.toEqual({ foto: null });
  });
});
