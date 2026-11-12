import { DataSource } from 'typeorm';
import { Model } from 'mongoose';
import { AvaliacaoDocument } from '../avaliacoes/schemas/avaliacao.schema.js';
import { Estabelecimento } from '../estabelecimentos/entities/estabelecimento.entity.js';
import { Profissional } from '../profissionais/entities/profissional.entity.js';
import { Servico } from '../servicos/entities/servico.entity.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { PerfilProfissionalService } from './perfil-profissional.service.js';

describe('PerfilProfissionalService', () => {
  const manager = { findOne: vi.fn(), find: vi.fn(), update: vi.fn() };
  const exec = vi.fn();
  const modelo = { find: vi.fn(() => ({ sort: () => ({ lean: () => ({ exec }) }) })) };
  const service = new PerfilProfissionalService(
    { manager } as unknown as DataSource, modelo as unknown as Model<AvaliacaoDocument>,
  );
  const profissional = {
    id: 'prof-1', usuarioId: 'usuario-1', estabelecimentoId: 'est-1',
    usuario: { id: 'usuario-1', nome: 'Roberto', sobrenome: 'Silva', senha: 'privado', email: 'privado@example.com' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager.findOne.mockImplementation((entidade) => {
      if (entidade === Profissional) return profissional;
      if (entidade === Estabelecimento) return { nome: 'Barbearia Silva', cnpj: 'privado', horarioAbertura: '08:00:00', horarioFechamento: '19:00:00' };
      if (entidade === Servico) return { id: 'servico-1', nome: 'Corte', preco: 4000, duracao: 30, estabelecimentoId: 'est-1' };
    });
    manager.find.mockImplementation(async (entidade) => entidade === Usuario
      ? [{ id: 'usuario-1', fotoPerfil: null }]
      : [{ id: 'servico-1', nome: 'Corte', preco: 4000, duracao: 30, descricao: 'extra' }]);
    manager.update.mockResolvedValue({ affected: 1 });
    exec.mockResolvedValue([]);
  });

  it('retorna dados do próprio usuário e catálogo do seu estabelecimento sem dados sensíveis', async () => {
    const resultado = await service.consultar('usuario-1');
    expect(manager.findOne).toHaveBeenCalledWith(Profissional, { where: { usuarioId: 'usuario-1' }, relations: { usuario: true } });
    expect(manager.find).toHaveBeenCalledWith(Servico, { where: { estabelecimentoId: 'est-1' }, order: { nome: 'ASC' } });
    expect(manager.findOne).toHaveBeenCalledWith(Estabelecimento, {
      where: { id: 'est-1' }, select: { id: true, nome: true, horarioAbertura: true, horarioFechamento: true },
    });
    expect(resultado).toMatchObject({
      nome: 'Roberto', estabelecimento: 'Barbearia Silva', horarioAbertura: '08:00:00', horarioFechamento: '19:00:00',
      servicos: [{ nome: 'Corte' }],
    });
    expect(JSON.stringify(resultado)).not.toMatch(/senha|email|cnpj|descricao|privado/);
  });

  it('não atualiza o cadastro quando o token não está vinculado a profissional', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.atualizar('outro-usuario', { nome: 'Outro', sobrenome: 'Nome' })).rejects.toMatchObject({ status: 404 });
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('atualiza apenas o nome do usuário vinculado ao token', async () => {
    await service.atualizar('usuario-1', { nome: ' Ana ', sobrenome: ' Silva ' });
    expect(manager.update).toHaveBeenCalledWith(Usuario, { id: 'usuario-1' }, { nome: 'Ana', sobrenome: 'Silva' });
  });

  it('salva somente a foto do profissional autenticado e a devolve pronta para exibir', async () => {
    const imagem = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const resposta = await service.atualizarFoto('usuario-1', {
      buffer: imagem, mimetype: 'image/png', size: imagem.length,
    });
    expect(manager.update).toHaveBeenCalledWith(Usuario, { id: 'usuario-1' }, { fotoPerfil: imagem });
    expect(resposta).toEqual({ foto: `data:image/png;base64,${imagem.toString('base64')}` });
  });

  it.each([
    ['image/jpeg', Buffer.from([255, 216, 255, 224, 1, 2])],
    ['image/webp', Buffer.from('RIFF1234WEBP1234')],
  ])('aceita arquivo %s válido', async (tipo, imagem) => {
    const resposta = await service.atualizarFoto('usuario-1', { buffer: imagem, mimetype: tipo, size: imagem.length });
    expect(resposta.foto).toBe(`data:${tipo};base64,${imagem.toString('base64')}`);
  });

  it('consulta a foto previamente salva sem expor outros dados pessoais', async () => {
    const imagem = Buffer.from([255, 216, 255, 224]);
    manager.find.mockImplementation(async (entidade) => entidade === Usuario
      ? [{ id: 'usuario-1', fotoPerfil: imagem }] : []);
    const perfil = await service.consultar('usuario-1');
    expect(manager.find).toHaveBeenCalledWith(Usuario, expect.objectContaining({
      select: { id: true, fotoPerfil: true },
    }));
    expect(perfil.foto).toBe(`data:image/jpeg;base64,${imagem.toString('base64')}`);
    expect(JSON.stringify(perfil)).not.toMatch(/senha|privado/);
  });

  it('rejeita arquivo ausente, falso tipo de imagem e foto grande antes de tocar no banco', async () => {
    await expect(service.atualizarFoto('usuario-1')).rejects.toMatchObject({ status: 400 });
    await expect(service.atualizarFoto('usuario-1', {
      buffer: Buffer.from('texto'), mimetype: 'image/png', size: 5,
    })).rejects.toMatchObject({ status: 400 });
    await expect(service.atualizarFoto('usuario-1', {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mimetype: 'image/jpeg', size: 8,
    })).rejects.toMatchObject({ status: 400 });
    await expect(service.atualizarFoto('usuario-1', {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mimetype: 'image/png', size: 2 * 1024 * 1024 + 1,
    })).rejects.toMatchObject({ status: 400 });
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('não salva foto se o usuário não tem vínculo profissional', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.atualizarFoto('outro-usuario', {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mimetype: 'image/png', size: 8,
    })).rejects.toMatchObject({ status: 404 });
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('filtra avaliações pelo profissional e calcula nota sem expor identificador do cliente', async () => {
    exec.mockResolvedValue([
      { _id: 'a1', nota: 5, comentario: 'Ótimo', clienteId: 'privado' },
      { _id: 'a2', nota: 4, comentario: 'Bom', clienteId: 'privado' },
    ]);
    const resultado = await service.avaliacoes('usuario-1');
    expect(modelo.find).toHaveBeenCalledWith({ profissionalId: 'prof-1' });
    expect(resultado).toEqual({ quantidade: 2, media: 4.5, avaliacoes: [
      { id: 'a1', nota: 5, comentario: 'Ótimo' }, { id: 'a2', nota: 4, comentario: 'Bom' },
    ] });
  });
});
