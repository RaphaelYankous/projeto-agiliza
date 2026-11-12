import { vi } from 'vitest';
import { Usuario } from '../../src/usuarios/entities/usuario.entity.js';
import { Cliente } from '../../src/clientes/entities/cliente.entity.js';
import { gestor, cliente, ID } from './fixtures.js';
import { repositoryMock } from './mocks.js';

export function perfisMock(tipo: 'cliente' | 'gestor') {
  const registro = tipo === 'cliente' ? cliente() : gestor();
  const usuario = registro.usuario;
  const repository = repositoryMock(registro);
  const usuarioRepository = repositoryMock(usuario);
  usuarioRepository.findOne.mockResolvedValue(null);
  const manager = {
    create: vi.fn((entidade: { prototype: object }, dados: object) =>
      Object.assign(Object.create(entidade.prototype), dados),
    ),
    save: vi.fn(async (alvo: object | Function, dados?: object) => {
      const instancia = dados ?? alvo;
      if (instancia instanceof Usuario) return Object.assign(usuario, instancia, { id: ID });
      return Object.assign(registro, instancia, instancia instanceof Cliente ? { id: ID } : {});
    }),
    update: vi.fn(async () => ({ affected: 1 })),
    findOne: vi.fn(async (): Promise<Usuario | null> => usuario),
    findOneByOrFail: vi.fn(async () => usuario),
    findOneOrFail: vi.fn(async () => registro),
  };
  const runner = {
    manager,
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };
  const dataSource = {
    createQueryRunner: vi.fn(() => runner),
    transaction: vi.fn(async (callback: (manager: typeof runner.manager) => Promise<unknown>) =>
      callback(manager),
    ),
  };
  return { registro, repository, usuarioRepository, manager, runner, dataSource };
}
