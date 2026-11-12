import { vi } from 'vitest';

export function repositoryMock<T extends object>(registro: T) {
  return {
    create: vi.fn(
      (dados: object) => Object.assign(Object.create(Object.getPrototypeOf(registro)), dados) as T,
    ),
    save: vi.fn(async (dados: T) => Object.assign(registro, dados)),
    update: vi.fn(async (_criterio: unknown, dados: Partial<T>) => {
      Object.assign(registro, dados);
      return { affected: 1 };
    }),
    find: vi.fn(async () => [registro]),
    findOne: vi.fn(async (_opcoes: unknown): Promise<T | null> => registro),
    findOneBy: vi.fn(async (_opcoes: unknown): Promise<T | null> => registro),
    remove: vi.fn(async (dados: T) => dados),
    delete: vi.fn(async () => ({ affected: 1 })),
    existsBy: vi.fn(async (_criterio: unknown) => true),
  };
}

export function queryMock<T>(valor: T) {
  return {
    exec: vi.fn(async () => valor),
    sort: vi.fn().mockReturnThis(),
  };
}

export function modelMock<T extends object>(documento: T) {
  const save = vi.fn(async () => documento);
  const listagem = queryMock<T[]>([documento]);
  const busca = queryMock<T | null>(documento);
  const atualizacao = queryMock<T | null>(documento);
  const exclusao = queryMock<T | null>(documento);
  const model = Object.assign(
    vi.fn(function (_dados: object) {
      return { save };
    }),
    {
      find: vi.fn(() => listagem),
      findById: vi.fn(() => busca),
      findByIdAndUpdate: vi.fn(() => atualizacao),
      findByIdAndDelete: vi.fn(() => exclusao),
    },
  );
  return { model, save, listagem, busca, atualizacao, exclusao };
}
