import 'reflect-metadata';
import { AvaliacoesController } from './avaliacoes.controller.js';
import type { AvaliacoesService } from './avaliacoes.service.js';
import { dadosAvaliacao, OBJECT_ID } from '../../test/helpers/fixtures.js';

describe('AvaliacoesController', () => {
  it('encaminha os dados e identificadores ao service em todas as operações', async () => {
    const service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    const controller = new AvaliacoesController(service as unknown as AvaliacoesService);
    await controller.create(dadosAvaliacao);
    await controller.findAll();
    await controller.findOne(OBJECT_ID);
    await controller.update(OBJECT_ID, { nota: 4 });
    await controller.remove(OBJECT_ID);
    expect(service.create).toHaveBeenCalledWith(dadosAvaliacao);
    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith(OBJECT_ID);
    expect(service.update).toHaveBeenCalledWith(OBJECT_ID, { nota: 4 });
    expect(service.remove).toHaveBeenCalledWith(OBJECT_ID);
  });
});
