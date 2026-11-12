import 'reflect-metadata';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ServicosService } from './servicos.service.js';
import { Servico } from './entities/servico.entity.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Agendamento } from '../agendamentos/entities/agendamento.entity.js';
import type { CreateServicoDto } from './dto/create-servico.dto.js';

const dtoBase: CreateServicoDto = {
  nome: 'Corte',
  preco: 4500,
  descricao: 'Corte com acabamento',
  duracao: 40,
  pontoFidelidade: 0,
  estabelecimentoId: 'estabelecimento-1',
};

function montarServico() {
  const servico = Object.assign(new Servico(), { id: 'servico-1', ...dtoBase });
  const repository = {
    create: vi.fn().mockReturnValue(servico),
    save: vi.fn().mockResolvedValue(servico),
    find: vi.fn().mockResolvedValue([servico]),
    findOne: vi.fn().mockResolvedValue(servico),
    remove: vi.fn().mockResolvedValue(servico),
  };
  const estabelecimentoRepository = {
    existsBy: vi.fn().mockResolvedValue(true),
    findOneBy: vi.fn().mockResolvedValue({
      id: 'estabelecimento-1',
      gestorId: 'gestor-1',
    }),
  };
  const agendamentoRepository = {
    existsBy: vi.fn().mockResolvedValue(false),
  };
  const service = new ServicosService(
    repository as unknown as Repository<Servico>,
    estabelecimentoRepository as unknown as Repository<Estabelecimento>,
    agendamentoRepository as unknown as Repository<Agendamento>,
  );
  return { service, repository, servico, estabelecimentoRepository, agendamentoRepository };
}

describe('ServicosService', () => {
  describe('create', () => {
    it('persiste o serviço e retorna o resultado do banco com seu identificador', async () => {
      const { service, repository, servico } = montarServico();

      await expect(
        service.create('estabelecimento-1', 'gestor-1', { ...dtoBase }),
      ).resolves.toBe(servico);

      expect(repository.create).toHaveBeenCalledWith(dtoBase);
      expect(repository.save).toHaveBeenCalledWith(servico);
    });

    it('propaga a falha de persistência', async () => {
      const { service, repository } = montarServico();
      const erro = new Error('Falha ao persistir');
      repository.save.mockRejectedValue(erro);

      await expect(
        service.create('estabelecimento-1', 'gestor-1', { ...dtoBase }),
      ).rejects.toBe(erro);
    });
  });

  describe('findAllByEstabelecimento', () => {
    it('consulta apenas os serviços do estabelecimento solicitado', async () => {
      const { service, repository, servico } = montarServico();

      await expect(
        service.findAllByEstabelecimento('estabelecimento-1', 'gestor-1'),
      ).resolves.toEqual([servico]);

      expect(repository.find).toHaveBeenCalledWith({
        where: { estabelecimentoId: 'estabelecimento-1' },
      });
    });

    it('retorna lista vazia quando não há serviços', async () => {
      const { service, repository } = montarServico();
      repository.find.mockResolvedValue([]);

      await expect(
        service.findAllByEstabelecimento('estabelecimento-1', 'gestor-1'),
      ).resolves.toEqual([]);
    });

    it('propaga falhas de consulta', async () => {
      const { service, repository } = montarServico();
      const erro = new Error('Banco indisponível');
      repository.find.mockRejectedValue(erro);

      await expect(
        service.findAllByEstabelecimento('estabelecimento-1', 'gestor-1'),
      ).rejects.toBe(erro);
    });

    it('recusa serviço de estabelecimento de outro gestor', async () => {
      const { service, estabelecimentoRepository } = montarServico();
      estabelecimentoRepository.findOneBy.mockResolvedValue({
        id: 'estabelecimento-1',
        gestorId: 'outro-gestor',
      });

      await expect(
        service.create('estabelecimento-1', 'gestor-1', { ...dtoBase }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('retorna o serviço encontrado pelo identificador', async () => {
      const { service, repository, servico } = montarServico();

      await expect(
        service.findOne('estabelecimento-1', 'gestor-1', servico.id),
      ).resolves.toBe(servico);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: servico.id },
      });
    });

    it('lança uma exceção 404 com o identificador do serviço ausente', async () => {
      const { service, repository } = montarServico();
      repository.findOne.mockResolvedValue(null);

      const resultado = service.findOne(
        'estabelecimento-1',
        'gestor-1',
        'inexistente',
      );
      await expect(resultado).rejects.toBeInstanceOf(NotFoundException);
      await expect(resultado).rejects.toMatchObject({
        status: 404,
        message: 'Serviço com ID inexistente não encontrado.',
      });
    });

    it('propaga falhas da busca sem convertê-las em recurso inexistente', async () => {
      const { service, repository } = montarServico();
      const erro = new Error('Banco indisponível');
      repository.findOne.mockRejectedValue(erro);

      await expect(
        service.findOne('estabelecimento-1', 'gestor-1', 'servico-1'),
      ).rejects.toBe(erro);
    });
  });

  describe('update', () => {
    it('altera os campos enviados e preserva os campos omitidos', async () => {
      const { service, repository } = montarServico();

      const resultado = await service.update(
        'estabelecimento-1',
        'gestor-1',
        'servico-1',
        { preco: 5000, pontoFidelidade: 10 },
      );

      expect(resultado).toMatchObject({
        id: 'servico-1',
        ...dtoBase,
        preco: 5000,
        pontoFidelidade: 10,
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'servico-1', estabelecimentoId: 'estabelecimento-1' },
      });
      expect(repository.save).toHaveBeenCalledWith(resultado);
    });

    it('permite zerar os pontos de fidelidade', async () => {
      const { service, servico } = montarServico();
      servico.pontoFidelidade = 10;

      await expect(
        service.update(
          'estabelecimento-1',
          'gestor-1',
          servico.id,
          { pontoFidelidade: 0 },
        ),
      ).resolves.toMatchObject({
        pontoFidelidade: 0,
      });
    });

    it('preserva os dados quando o body é vazio', async () => {
      const { service } = montarServico();

      await expect(
        service.update('estabelecimento-1', 'gestor-1', 'servico-1', {}),
      ).resolves.toMatchObject({
        id: 'servico-1',
        ...dtoBase,
      });
    });

    it('não salva quando o serviço não existe', async () => {
      const { service, repository } = montarServico();
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('estabelecimento-1', 'gestor-1', 'inexistente', {
          preco: 5000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('propaga falhas ao salvar a atualização', async () => {
      const { service, repository } = montarServico();
      const erro = new Error('Falha ao atualizar');
      repository.save.mockRejectedValue(erro);

      await expect(
        service.update(
          'estabelecimento-1',
          'gestor-1',
          'servico-1',
          { preco: 5000 },
        ),
      ).rejects.toBe(erro);
    });
  });

  describe('remove', () => {
    it('remove o serviço encontrado e retorna void', async () => {
      const { service, repository, servico } = montarServico();

      await expect(
        service.remove('estabelecimento-1', 'gestor-1', servico.id),
      ).resolves.toBeUndefined();

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: servico.id, estabelecimentoId: 'estabelecimento-1' },
      });
      expect(repository.remove).toHaveBeenCalledWith(servico);
    });

    it('não remove quando o serviço não existe', async () => {
      const { service, repository } = montarServico();
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('estabelecimento-1', 'gestor-1', 'inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('propaga falhas de exclusão, como restrições do banco', async () => {
      const { service, repository } = montarServico();
      const erro = new Error('Serviço possui agendamentos');
      repository.remove.mockRejectedValue(erro);

      await expect(
        service.remove('estabelecimento-1', 'gestor-1', 'servico-1'),
      ).rejects.toBe(erro);
    });
  });
});
