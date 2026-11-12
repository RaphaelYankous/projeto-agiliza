import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { Repository } from 'typeorm';
import { Agendamento, StatusAgendamento } from '../agendamentos/entities/agendamento.entity.js';
import type { Cliente } from '../clientes/entities/cliente.entity.js';
import { AvaliacoesClienteService } from './avaliacoes-cliente.service.js';
import type { AvaliacaoDocument } from './schemas/avaliacao.schema.js';
import type { AvaliacaoVinculoDocument } from './schemas/avaliacao-vinculo.schema.js';
import { ID, OBJECT_ID } from '../../test/helpers/fixtures.js';

const PROFISSIONAL_ID = '9d5e3c52-1a4f-4b3b-8f0e-6a1f2c3d4e5f';
const OUTRO_CLIENTE_ID = 'f1b2c3d4-0000-4000-8000-000000000001';
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);

const foto = (sobrescrever: Partial<{ buffer: Buffer; mimetype: string; size: number }> = {}) => ({
  buffer: PNG,
  mimetype: 'image/png',
  size: PNG.length,
  ...sobrescrever,
});

function agendamento(dados: Partial<Agendamento> = {}) {
  return Object.assign(new Agendamento(), {
    id: ID,
    clienteId: ID,
    profissionalId: PROFISSIONAL_ID,
    status: StatusAgendamento.CONCLUIDO,
    ...dados,
  });
}

function montar(registro: Agendamento | null = agendamento(), cliente: object | null = { id: ID }) {
  const clientes = { findOne: vi.fn(async () => cliente) };
  const agendamentos = { findOne: vi.fn(async () => registro) };
  const avaliacaoModel = {
    exists: vi.fn(async () => null as object | null),
    create: vi.fn(async (dados: Record<string, unknown>) => ({ _id: OBJECT_ID, ...dados })),
    find: vi.fn(() => ({ exec: vi.fn(async () => [] as object[]) })),
  };
  const vinculoModel = {
    create: vi.fn(async (dados: object) => dados),
    updateOne: vi.fn(async () => ({})),
    deleteOne: vi.fn(async () => ({})),
    find: vi.fn(() => ({ exec: vi.fn(async () => [] as object[]) })),
    findOne: vi.fn(() => ({
      select: vi.fn(() => ({ exec: vi.fn(async () => null as object | null) })),
    })),
  };
  const service = new AvaliacoesClienteService(
    clientes as unknown as Repository<Cliente>,
    agendamentos as unknown as Repository<Agendamento>,
    avaliacaoModel as unknown as Model<AvaliacaoDocument>,
    vinculoModel as unknown as Model<AvaliacaoVinculoDocument>,
  );
  return { service, clientes, agendamentos, avaliacaoModel, vinculoModel };
}

describe('AvaliacoesClienteService — criar', () => {
  it('registra a avaliação usando cliente do token e profissional do agendamento', async () => {
    const { service, clientes, avaliacaoModel, vinculoModel } = montar();

    const resposta = await service.criar('usuario-do-token', ID, { nota: 4, comentario: '  Ótimo  ' });

    expect(clientes.findOne).toHaveBeenCalledWith({
      where: { usuarioId: 'usuario-do-token' },
      loadEagerRelations: false,
    });
    expect(avaliacaoModel.create).toHaveBeenCalledWith({
      clienteId: ID,
      profissionalId: PROFISSIONAL_ID,
      agendamentoId: ID,
      nota: 4,
      comentario: 'Ótimo',
    });
    expect(vinculoModel.updateOne).toHaveBeenCalledWith({ agendamentoId: ID }, { avaliacaoId: OBJECT_ID });
    expect(resposta).toEqual({
      id: OBJECT_ID,
      agendamentoId: ID,
      nota: 4,
      comentario: 'Ótimo',
      temFoto: false,
    });
  });

  it('aceita nota enviada como texto (multipart) e comentário omitido ou em branco', async () => {
    const { service, avaliacaoModel } = montar();
    await service.criar('u', ID, { nota: '5' as unknown as number, comentario: '   ' });
    expect(avaliacaoModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ nota: 5, comentario: undefined }),
    );
  });

  it('guarda a foto no vínculo e informa temFoto', async () => {
    const { service, vinculoModel } = montar();
    const resposta = await service.criar('u', ID, { nota: 5 }, foto());
    expect(vinculoModel.create).toHaveBeenCalledWith({ agendamentoId: ID, clienteId: ID, foto: PNG });
    expect(resposta.temFoto).toBe(true);
  });

  it('retorna 404 sem cliente ou sem agendamento, sem gravar nada', async () => {
    const semCliente = montar(agendamento(), null);
    await expect(semCliente.service.criar('u', ID, { nota: 5 })).rejects.toBeInstanceOf(NotFoundException);
    const semAgendamento = montar(null);
    await expect(semAgendamento.service.criar('u', ID, { nota: 5 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(semAgendamento.vinculoModel.create).not.toHaveBeenCalled();
  });

  it('retorna 403 para agendamento de outro cliente', async () => {
    const { service, vinculoModel } = montar(agendamento({ clienteId: OUTRO_CLIENTE_ID }));
    await expect(service.criar('u', ID, { nota: 5 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(vinculoModel.create).not.toHaveBeenCalled();
  });

  it.each([StatusAgendamento.PENDENTE, StatusAgendamento.CONFIRMADO, StatusAgendamento.CANCELADO])(
    'retorna 409 para agendamento com status %s',
    async (status) => {
      const { service, vinculoModel, avaliacaoModel } = montar(agendamento({ status }));
      await expect(service.criar('u', ID, { nota: 5 })).rejects.toThrow(
        'Só é possível avaliar atendimentos concluídos.',
      );
      expect(vinculoModel.create).not.toHaveBeenCalled();
      expect(avaliacaoModel.create).not.toHaveBeenCalled();
    },
  );

  it('retorna 409 quando já existe avaliação do atendimento (inclusive pela rota antiga)', async () => {
    const { service, avaliacaoModel, vinculoModel } = montar();
    avaliacaoModel.exists.mockResolvedValueOnce({ _id: OBJECT_ID });
    await expect(service.criar('u', ID, { nota: 5 })).rejects.toThrow('Este atendimento já foi avaliado.');
    expect(vinculoModel.create).not.toHaveBeenCalled();
    expect(avaliacaoModel.create).not.toHaveBeenCalled();
  });

  it('retorna 409 quando outro envio simultâneo já gravou o vínculo (E11000)', async () => {
    const { service, vinculoModel, avaliacaoModel } = montar();
    vinculoModel.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    await expect(service.criar('u', ID, { nota: 5 })).rejects.toBeInstanceOf(ConflictException);
    expect(avaliacaoModel.create).not.toHaveBeenCalled();
    expect(vinculoModel.deleteOne).not.toHaveBeenCalled();
  });

  it('propaga outros erros do vínculo sem criar a avaliação', async () => {
    const { service, vinculoModel, avaliacaoModel } = montar();
    const erro = new Error('MongoDB indisponível');
    vinculoModel.create.mockRejectedValueOnce(erro);
    await expect(service.criar('u', ID, { nota: 5 })).rejects.toBe(erro);
    expect(avaliacaoModel.create).not.toHaveBeenCalled();
  });

  it('remove o vínculo se a avaliação falhar, para o cliente poder tentar de novo', async () => {
    const { service, vinculoModel, avaliacaoModel } = montar();
    const erro = new Error('falha ao gravar');
    avaliacaoModel.create.mockRejectedValueOnce(erro);
    await expect(service.criar('u', ID, { nota: 5 })).rejects.toBe(erro);
    expect(vinculoModel.deleteOne).toHaveBeenCalledWith({ agendamentoId: ID });
  });

  it.each([
    ['arquivo vazio', foto({ buffer: Buffer.alloc(0), size: 0 })],
    ['maior que 2 MB', foto({ size: 2 * 1024 * 1024 + 1 })],
    ['texto com mimetype de imagem', foto({ buffer: Buffer.from('não sou imagem') })],
    ['mimetype diferente do conteúdo', foto({ mimetype: 'image/jpeg' })],
  ])('rejeita foto inválida (%s) sem gravar nada', async (_nome, arquivo) => {
    const { service, vinculoModel, avaliacaoModel } = montar();
    await expect(service.criar('u', ID, { nota: 5 }, arquivo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(vinculoModel.create).not.toHaveBeenCalled();
    expect(avaliacaoModel.create).not.toHaveBeenCalled();
  });
});

describe('AvaliacoesClienteService — listarDoCliente', () => {
  it('lista nota, comentário e se tem foto, só do cliente do token', async () => {
    const { service, avaliacaoModel, vinculoModel } = montar();
    avaliacaoModel.find.mockReturnValueOnce({
      exec: vi.fn(async () => [
        { agendamentoId: 'a1', nota: 5, comentario: 'Ótimo', clienteId: ID },
        { agendamentoId: 'a2', nota: 3 },
      ]),
    });
    vinculoModel.find.mockReturnValueOnce({ exec: vi.fn(async () => [{ agendamentoId: 'a1' }]) });
    await expect(service.listarDoCliente('u')).resolves.toEqual([
      { agendamentoId: 'a1', nota: 5, comentario: 'Ótimo', temFoto: true },
      { agendamentoId: 'a2', nota: 3, comentario: '', temFoto: false },
    ]);
    expect(avaliacaoModel.find).toHaveBeenCalledWith(
      { clienteId: ID },
      { agendamentoId: 1, nota: 1, comentario: 1 },
    );
    // Consulta só os vínculos com foto e sem trazer o conteúdo da foto.
    expect(vinculoModel.find).toHaveBeenCalledWith(
      { clienteId: ID, foto: { $type: 'binData' } },
      { agendamentoId: 1 },
    );
  });

  it('retorna 404 sem cliente', async () => {
    const { service } = montar(agendamento(), null);
    await expect(service.listarDoCliente('u')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AvaliacoesClienteService — buscarFoto', () => {
  function comVinculo(vinculo: object | null) {
    const mocks = montar();
    const exec = vi.fn(async () => vinculo);
    const select = vi.fn(() => ({ exec }));
    mocks.vinculoModel.findOne.mockReturnValueOnce({ select });
    return { ...mocks, select };
  }

  it('devolve a foto e o tipo, procurando só pelo cliente do token', async () => {
    const { service, vinculoModel, select } = comVinculo({ foto: PNG });
    await expect(service.buscarFoto('u', ID)).resolves.toEqual({ conteudo: PNG, tipo: 'image/png' });
    expect(vinculoModel.findOne).toHaveBeenCalledWith({ agendamentoId: ID, clienteId: ID });
    expect(select).toHaveBeenCalledWith('+foto');
  });

  it.each([
    ['avaliação de outro cliente ou inexistente', null],
    ['avaliação sem foto', { foto: undefined }],
    ['conteúdo que não é imagem', { foto: Buffer.from('texto') }],
  ])('retorna 404 para %s', async (_nome, vinculo) => {
    const { service } = comVinculo(vinculo);
    await expect(service.buscarFoto('u', ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retorna 404 sem cliente', async () => {
    const { service } = montar(agendamento(), null);
    await expect(service.buscarFoto('u', ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
