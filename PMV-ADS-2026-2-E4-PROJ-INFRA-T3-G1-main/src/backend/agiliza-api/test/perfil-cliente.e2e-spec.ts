import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Cliente } from '../src/clientes/entities/cliente.entity.js';
import { META_RESGATE_PONTOS } from '../src/fidelidade/fidelidade.constants.js';
import { FidelidadeService } from '../src/fidelidade/fidelidade.service.js';
import { PerfilClienteController } from '../src/perfil-cliente/perfil-cliente.controller.js';
import { PerfilClienteService } from '../src/perfil-cliente/perfil-cliente.service.js';
import { Role } from '../src/usuarios/entities/usuario.entity.js';
import { cliente, dadosPessoa, ID } from './helpers/fixtures.js';
import { criarAppTeste, testarRotasProtegidas, type AppTeste } from './helpers/http-app.js';

const rota = '/api/meu-perfil-cliente';

describe('Perfil cliente — HTTP', () => {
  const service = { consultar: vi.fn(), consultarFidelidade: vi.fn() };
  let contexto: AppTeste;
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [PerfilClienteController],
      providers: [{ provide: PerfilClienteService, useValue: service }],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    service.consultar.mockResolvedValue({
      nome: 'Camila',
      sobrenome: 'Ferreira',
      email: 'camila@example.com',
    });
    service.consultarFidelidade.mockResolvedValue({ pontos: 320, meta: 400 });
  });
  afterAll(async () => contexto?.app.close());

  testarRotasProtegidas(() => contexto, [
    { metodo: 'get', caminho: rota },
    { metodo: 'get', caminho: `${rota}/fidelidade` },
  ]);

  it.each([Role.PROFISSIONAL, Role.GESTOR])('nega acesso de %s às duas rotas', async (role) => {
    for (const caminho of [rota, `${rota}/fidelidade`]) {
      await request(contexto.app.getHttpServer())
        .get(caminho)
        .auth(contexto.token(role), { type: 'bearer' })
        .expect(403);
    }
    expect(service.consultar).not.toHaveBeenCalled();
    expect(service.consultarFidelidade).not.toHaveBeenCalled();
  });

  it('consulta o perfil de quem está no token', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({
      nome: 'Camila',
      sobrenome: 'Ferreira',
      email: 'camila@example.com',
    });
    expect(service.consultar).toHaveBeenCalledWith(ID);
  });

  it('usa o usuário do token, e não um id enviado na requisição', async () => {
    await request(contexto.app.getHttpServer())
      .get(rota)
      .query({ usuarioId: 'outro-usuario', clienteId: 'outro-cliente' })
      .auth(contexto.token(Role.CLIENTE, 'usuario-2'), { type: 'bearer' })
      .expect(200);
    await request(contexto.app.getHttpServer())
      .get(`${rota}/fidelidade`)
      .query({ usuarioId: 'outro-usuario', clienteId: 'outro-cliente' })
      .auth(contexto.token(Role.CLIENTE, 'usuario-2'), { type: 'bearer' })
      .expect(200);
    expect(service.consultar).toHaveBeenCalledWith('usuario-2');
    expect(service.consultarFidelidade).toHaveBeenCalledWith('usuario-2');
  });

  it('devolve os pontos de fidelidade de quem está no token', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/fidelidade`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({ pontos: 320, meta: 400 });
    expect(service.consultarFidelidade).toHaveBeenCalledWith(ID);
  });
});

describe('Perfil cliente — resposta HTTP com o service real', () => {
  const clienteRepository = { findOne: vi.fn() };
  const fidelidade = { totalDePontos: vi.fn() };
  let contexto: AppTeste;
  beforeAll(async () => {
    contexto = await criarAppTeste({
      controllers: [PerfilClienteController],
      providers: [
        PerfilClienteService,
        { provide: getRepositoryToken(Cliente), useValue: clienteRepository },
        { provide: FidelidadeService, useValue: fidelidade },
      ],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    clienteRepository.findOne.mockResolvedValue(Object.assign(cliente(), { id: 'cliente-1' }));
    fidelidade.totalDePontos.mockResolvedValue(320);
  });
  afterAll(async () => contexto?.app.close());

  it('devolve só nome, sobrenome e e-mail, sem senha, CPF nem telefone', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(rota)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({
      nome: dadosPessoa.nome,
      sobrenome: dadosPessoa.sobrenome,
      email: dadosPessoa.email,
    });
    expect(clienteRepository.findOne).toHaveBeenCalledWith({ where: { usuarioId: ID } });
  });

  it.each([rota, `${rota}/fidelidade`])(
    'GET %s retorna 404 quando o usuário não tem vínculo de cliente',
    async (caminho) => {
      clienteRepository.findOne.mockResolvedValueOnce(null);
      const resposta = await request(contexto.app.getHttpServer())
        .get(caminho)
        .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
        .expect(404);
      expect(resposta.body).toMatchObject({
        statusCode: 404,
        message: 'Cliente não encontrado.',
      });
      expect(fidelidade.totalDePontos).not.toHaveBeenCalled();
    },
  );

  it('soma os pontos pelo id do cliente e informa a meta', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/fidelidade`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({ pontos: 320, meta: META_RESGATE_PONTOS });
    expect(fidelidade.totalDePontos).toHaveBeenCalledWith('cliente-1');
  });

  it('cliente sem pontos recebe zero e a meta', async () => {
    fidelidade.totalDePontos.mockResolvedValueOnce(0);
    const resposta = await request(contexto.app.getHttpServer())
      .get(`${rota}/fidelidade`)
      .auth(contexto.token(Role.CLIENTE), { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toEqual({ pontos: 0, meta: META_RESGATE_PONTOS });
  });
});