import { Role, Usuario } from '../../src/usuarios/entities/usuario.entity.js';
import { Cliente } from '../../src/clientes/entities/cliente.entity.js';
import { Gestor } from '../../src/gestores/entities/gestor.entity.js';
import { Profissional } from '../../src/profissionais/entities/profissional.entity.js';
import { Estabelecimento } from '../../src/estabelecimentos/entities/estabelecimento.entity.js';

export const ID = '8f47e310-235b-4d52-9862-c9be5f7e6a98';
export const ESTABELECIMENTO_ID = 'e0426438-21f6-497f-a695-026826f82999';
export const OBJECT_ID = '507f1f77bcf86cd799439011';
export const dadosPessoa = {
  nome: 'Ana',
  sobrenome: 'Silva',
  email: 'ana@example.com',
  senha: 'Senha123!',
  cpf: '12345678901',
  telefone: '31999990000',
};
export const dadosEstabelecimento = {
  nome: 'Barbearia Central',
  razaoSocial: 'Barbearia Central LTDA',
  cnpj: '12345678000190',
  email: 'contato@example.com',
  endereco: 'Rua Central, 10',
  latitude: -19.9,
  longitude: -43.9,
  telefone: '31999990000',
  horarioAbertura: '09:00',
  horarioFechamento: '18:00',
  gestorId: ID,
};
export const dadosAvaliacao = {
  clienteId: ID,
  profissionalId: ID,
  agendamentoId: ID,
  nota: 5,
  comentario: 'Ótimo atendimento',
};

export function usuario(perfil = Role.CLIENTE) {
  return Object.assign(new Usuario(), { ...dadosPessoa, id: ID, perfil, senha: 'hash-armazenado' });
}

export function cliente() {
  return Object.assign(new Cliente(), { id: ID, usuarioId: ID, usuario: usuario() });
}

export function gestor() {
  return Object.assign(new Gestor(), { usuarioId: ID, usuario: usuario(Role.GESTOR) });
}

export function profissional() {
  return Object.assign(new Profissional(), {
    id: ID,
    usuarioId: ID,
    estabelecimentoId: ESTABELECIMENTO_ID,
    usuario: usuario(Role.PROFISSIONAL),
  });
}

export function estabelecimento() {
  return Object.assign(new Estabelecimento(), { ...dadosEstabelecimento, id: ESTABELECIMENTO_ID });
}
