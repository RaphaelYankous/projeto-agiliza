import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import type { Model } from 'mongoose';
import { AvaliacoesService } from './avaliacoes.service.js';
import type { AvaliacaoDocument } from './schemas/avaliacao.schema.js';
import { dadosAvaliacao, OBJECT_ID } from '../../test/helpers/fixtures.js';
import { modelMock } from '../../test/helpers/mocks.js';

function montar() {
  const documento = { ...dadosAvaliacao, _id: OBJECT_ID };
  const mocks = modelMock(documento);
  const service = new AvaliacoesService(mocks.model as unknown as Model<AvaliacaoDocument>);
  return { service, documento, ...mocks };
}

describe('AvaliacoesService', () => {
  it('salva a avaliação com os dados recebidos', async () => {
    const { service, model, save, documento } = montar();
    await expect(service.create(dadosAvaliacao)).resolves.toBe(documento);
    expect(model).toHaveBeenCalledWith(dadosAvaliacao);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('lista por criação decrescente e aceita lista vazia', async () => {
    const { service, listagem, documento } = montar();
    await expect(service.findAll()).resolves.toEqual([documento]);
    expect(listagem.sort).toHaveBeenCalledWith({ createdAt: -1 });
    listagem.exec.mockResolvedValueOnce([]);
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('busca pelo identificador', async () => {
    const { service, model, documento } = montar();
    await expect(service.findOne(OBJECT_ID)).resolves.toBe(documento);
    expect(model.findById).toHaveBeenCalledWith(OBJECT_ID);
  });

  it('solicita o documento atualizado na alteração parcial', async () => {
    const { service, model, atualizacao } = montar();
    atualizacao.exec.mockResolvedValueOnce({ ...dadosAvaliacao, _id: OBJECT_ID, nota: 4 });
    await expect(service.update(OBJECT_ID, { nota: 4 })).resolves.toMatchObject({ nota: 4 });
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(OBJECT_ID, { nota: 4 }, { new: true });
  });

  it('retorna confirmação de exclusão', async () => {
    const { service, model } = montar();
    await expect(service.remove(OBJECT_ID)).resolves.toEqual({ deleted: true });
    expect(model.findByIdAndDelete).toHaveBeenCalledWith(OBJECT_ID);
  });

  it.each(['findOne', 'update', 'remove'] as const)(
    '%s rejeita documento ausente',
    async (metodo) => {
      const { service, busca, atualizacao, exclusao } = montar();
      busca.exec.mockResolvedValue(null);
      atualizacao.exec.mockResolvedValue(null);
      exclusao.exec.mockResolvedValue(null);
      await expect(service[metodo](OBJECT_ID, {})).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('propaga falhas de gravação do MongoDB', async () => {
    const { service, save } = montar();
    const erro = new Error('MongoDB indisponível');
    save.mockRejectedValueOnce(erro);
    await expect(service.create(dadosAvaliacao)).rejects.toBe(erro);
  });
});
