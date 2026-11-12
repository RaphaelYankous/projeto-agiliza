import type { EstabelecimentoGestor } from '../services/gestorService'

export function estabelecimentoGestor(dados: Partial<EstabelecimentoGestor> = {}): EstabelecimentoGestor {
  return {
    id: 'est-1',
    nome: 'Barbearia do Pedro',
    razaoSocial: 'Pedro Dias Barbearia LTDA',
    cnpj: '11222333000181',
    email: 'contato@barbearia.com',
    endereco: 'Av. Afonso Pena, 1500',
    latitude: -19.92,
    longitude: -43.94,
    telefone: '31988881001',
    descricao: 'Cortes clássicos.',
    horarioAbertura: '09:00:00',
    horarioFechamento: '19:00:00',
    diasFuncionamento: ['segunda', 'terca'],
    fidelidade: true,
    fotoAtualizadaEm: null,
    ...dados,
  }
}

export const arquivoPng = (nome = 'foto.png') => new File(['png'], nome, { type: 'image/png' })
