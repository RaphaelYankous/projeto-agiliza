import 'reflect-metadata';
import type { DataSource, Repository } from 'typeorm';
import { ClientesService } from './clientes.service.js';
import type { Cliente } from './entities/cliente.entity.js';
import type { Usuario } from '../usuarios/entities/usuario.entity.js';
import { perfisMock } from '../../test/helpers/perfis.js';
import { ID, dadosPessoa } from '../../test/helpers/fixtures.js';

function montar() {
  const mocks = perfisMock('cliente');
  const service = new ClientesService(
    mocks.repository as unknown as Repository<Cliente>,
    mocks.usuarioRepository as unknown as Repository<Usuario>,
    mocks.dataSource as unknown as DataSource,
  );
  return { ...mocks, service };
}

describe('ClientesService — atualização adicional', () => {
  it.each(['email', 'cpf'] as const)(
    'permite manter o próprio %s sem acusar duplicidade',
    async (campo) => {
      const { service, usuarioRepository, registro, runner } = montar();
      usuarioRepository.findOne.mockResolvedValueOnce(registro.usuario);
      await expect(service.update(ID, { [campo]: dadosPessoa[campo] })).resolves.toMatchObject({
        usuarioId: ID,
      });
      expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    },
  );

  it('atualiza sobrenome e telefone preservando os demais dados', async () => {
    const { service } = montar();
    await expect(
      service.update(ID, { sobrenome: 'Souza', telefone: '3133334444' }),
    ).resolves.toMatchObject({
      usuario: {
        nome: dadosPessoa.nome,
        sobrenome: 'Souza',
        telefone: '3133334444',
        email: dadosPessoa.email,
      },
    });
  });

  it('body vazio não grava usuário nem foto e retorna o perfil existente', async () => {
    const { service, manager, runner } = montar();
    await expect(service.update(ID, {})).resolves.toMatchObject({ usuarioId: ID });
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.findOne).not.toHaveBeenCalled();
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('desfaz a transação se a gravação da foto falha depois da atualização do usuário', async () => {
    const { service, manager, registro, runner } = montar();
    const erro = new Error('Falha ao salvar foto');
    manager.save.mockResolvedValueOnce(registro.usuario);
    manager.update.mockRejectedValueOnce(erro);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await expect(
      service.update(ID, { nome: 'Maria' }, { buffer: png, mimetype: 'image/png', size: png.length }),
    ).rejects.toBe(erro);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });
});
