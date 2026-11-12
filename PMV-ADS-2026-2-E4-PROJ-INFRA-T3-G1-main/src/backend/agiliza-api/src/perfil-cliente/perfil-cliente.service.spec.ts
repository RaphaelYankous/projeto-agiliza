import type { Repository } from 'typeorm';
import type { Cliente } from '../clientes/entities/cliente.entity.js';
import { META_RESGATE_PONTOS } from '../fidelidade/fidelidade.constants.js';
import type { FidelidadeService } from '../fidelidade/fidelidade.service.js';
import { PerfilClienteService } from './perfil-cliente.service.js';

describe('PerfilClienteService', () => {
  const clienteRepository = { findOne: vi.fn() };
  const fidelidade = { totalDePontos: vi.fn() };
  const service = new PerfilClienteService(
    clienteRepository as unknown as Repository<Cliente>,
    fidelidade as unknown as FidelidadeService,
  );
  const cliente = {
    id: 'cliente-1',
    usuarioId: 'usuario-1',
    usuario: {
      nome: 'Camila',
      sobrenome: 'Ferreira',
      email: 'camila@example.com',
      senha: 'privado',
      cpf: 'privado',
      telefone: 'privado',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clienteRepository.findOne.mockResolvedValue(cliente);
    fidelidade.totalDePontos.mockResolvedValue(320);
  });

  it('busca o cliente pelo usuário do token e devolve id, nome, sobrenome e e-mail', async () => {
    const resultado = await service.consultar('usuario-1');
    expect(clienteRepository.findOne).toHaveBeenCalledWith({ where: { usuarioId: 'usuario-1' } });
    expect(resultado).toEqual({
      id: 'cliente-1',
      nome: 'Camila',
      sobrenome: 'Ferreira',
      email: 'camila@example.com',
    });
    expect(JSON.stringify(resultado)).not.toMatch(/senha|cpf|telefone|privado/);
  });

  it('retorna 404 quando o token não está vinculado a um cliente', async () => {
    clienteRepository.findOne.mockResolvedValue(null);
    await expect(service.consultar('outro-usuario')).rejects.toMatchObject({ status: 404 });
  });

  it('soma os pontos pelo id do cliente, e não pelo id do usuário', async () => {
    const resultado = await service.consultarFidelidade('usuario-1');
    expect(fidelidade.totalDePontos).toHaveBeenCalledWith('cliente-1');
    expect(resultado).toEqual({ pontos: 320, meta: META_RESGATE_PONTOS });
  });

  it('devolve zero pontos quando o cliente ainda não pontuou', async () => {
    fidelidade.totalDePontos.mockResolvedValue(0);
    await expect(service.consultarFidelidade('usuario-1')).resolves.toEqual({
      pontos: 0,
      meta: META_RESGATE_PONTOS,
    });
  });

  it('não consulta pontos quando o token não está vinculado a um cliente', async () => {
    clienteRepository.findOne.mockResolvedValue(null);
    await expect(service.consultarFidelidade('outro-usuario')).rejects.toMatchObject({
      status: 404,
    });
    expect(fidelidade.totalDePontos).not.toHaveBeenCalled();
  });

  it('usa uma meta inteira e positiva (a tela divide os pontos por ela)', () => {
    expect(Number.isInteger(META_RESGATE_PONTOS)).toBe(true);
    expect(META_RESGATE_PONTOS).toBeGreaterThan(0);
  });
});