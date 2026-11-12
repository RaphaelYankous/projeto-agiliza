import 'reflect-metadata';
import { ServicosController } from './servicos.controller.js';
import type { ServicosService } from './servicos.service.js';
import type { CreateServicoDto } from './dto/create-servico.dto.js';
import type { UpdateServicoDto } from './dto/update-servico.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

const ESTABELECIMENTO_ID = 'a1b2c3d4-0000-0000-0000-000000000000';
const GESTOR_ID = 'gestor-1';

const dtoBase: CreateServicoDto = {
  nome: 'Corte Degradê Navalhado',
  preco: 4500,
  descricao: 'Corte moderno com acabamento navalhado e toalha quente.',
  duracao: 40,
  pontoFidelidade: 10,
} as CreateServicoDto;

const usuarioLogado: JwtPayload = {
  sub: GESTOR_ID,
  email: 'gestor@exemplo.com',
  role: 'gestor',
};

function montarController() {
  const servicoSalvo = { id: 'serv-1', ...dtoBase, estabelecimentoId: ESTABELECIMENTO_ID };

  const servicosService = {
    create: vi.fn(
      async (_estabelecimentoId, _gestorId, dto) =>
        ({ id: 'serv-1', ...dto, estabelecimentoId: ESTABELECIMENTO_ID }),
    ),
    findAllByEstabelecimento: vi.fn(async () => [servicoSalvo]),
    findAllPublicos: vi.fn(async () => [servicoSalvo]),
    findOne: vi.fn(async () => servicoSalvo),
    update: vi.fn(async (_e, _g, _i, dto) => ({ id: 'serv-1', ...dto })),
    remove: vi.fn(async () => undefined),
  };

  const controller = new ServicosController(servicosService as unknown as ServicosService);

  return { controller, servicosService };
}

describe('ServicosController.create', () => {
  it('vincula o estabelecimento da rota ao DTO antes de salvar', async () => {
    const { controller, servicosService } = montarController();

    // cópia porque o controller preenche estabelecimentoId no próprio DTO
    await controller.create(
      ESTABELECIMENTO_ID,
      usuarioLogado,
      { ...dtoBase },
    );

    expect(servicosService.create).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
      expect.objectContaining({
        ...dtoBase,
        estabelecimentoId: ESTABELECIMENTO_ID,
      }),
    );
  });

  it('sobrescreve um estabelecimentoId enviado indevidamente no corpo', async () => {
    const { controller, servicosService } = montarController();
    const dto = { ...dtoBase, estabelecimentoId: 'outro-estabelecimento' } as CreateServicoDto;

    await controller.create(ESTABELECIMENTO_ID, usuarioLogado, dto);

    expect(servicosService.create).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
      expect.objectContaining({ estabelecimentoId: ESTABELECIMENTO_ID }),
    );
  });
});

describe('ServicosController.findAll', () => {
  it('lista os serviços do estabelecimento da rota', async () => {
    const { controller, servicosService } = montarController();

    const resultado = await controller.findAll(ESTABELECIMENTO_ID, usuarioLogado);

    expect(servicosService.findAllByEstabelecimento).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
    );
    expect(resultado).toHaveLength(1);
  });
});

describe('ServicosController.findAllPublicos', () => {
  it('lista os serviços do estabelecimento da rota sem depender do usuário logado', async () => {
    const { controller, servicosService } = montarController();

    const resultado = await controller.findAllPublicos(ESTABELECIMENTO_ID);

    expect(servicosService.findAllPublicos).toHaveBeenCalledWith(ESTABELECIMENTO_ID);
    expect(servicosService.findAllByEstabelecimento).not.toHaveBeenCalled();
    expect(resultado).toHaveLength(1);
  });
});

describe('ServicosController.findOne', () => {
  it('recupera o serviço pelo id', async () => {
    const { controller, servicosService } = montarController();

    const resultado = await controller.findOne(
      ESTABELECIMENTO_ID,
      'serv-1',
      usuarioLogado,
    );

    expect(servicosService.findOne).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
      'serv-1',
    );
    expect(resultado).toEqual(expect.objectContaining({ id: 'serv-1' }));
  });
});

describe('ServicosController.update', () => {
  it('atualiza o serviço repassando id e dados do DTO', async () => {
    const { controller, servicosService } = montarController();
    const dto: UpdateServicoDto = { nome: 'Barba Terapia', preco: 3000 };

    const resultado = await controller.update(
      ESTABELECIMENTO_ID,
      'serv-1',
      usuarioLogado,
      dto,
    );

    expect(servicosService.update).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
      'serv-1',
      dto,
    );
    expect(resultado).toEqual(expect.objectContaining({ id: 'serv-1', nome: 'Barba Terapia' }));
  });
});

describe('ServicosController.remove', () => {
  it('remove o serviço pelo id', async () => {
    const { controller, servicosService } = montarController();

    await expect(
      controller.remove(ESTABELECIMENTO_ID, 'serv-1', usuarioLogado),
    ).resolves.toBeUndefined();
    expect(servicosService.remove).toHaveBeenCalledWith(
      ESTABELECIMENTO_ID,
      GESTOR_ID,
      'serv-1',
    );
  });
});
