import { CreateProfissionalDto } from './create-profissional.dto.js';
import { UpdateProfissionalDto } from './update-profissional.dto.js';
import { dadosPessoa } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

const SERVICO_ID = 'c1d2e3f4-0000-4000-8000-000000000000';
const dadosProfissional = { ...dadosPessoa, servicoIds: [SERVICO_ID] };

testarDto({
  nome: 'DTO de cadastro de Profissional',
  criar: CreateProfissionalDto,
  dados: dadosProfissional,
  obrigatorios: Object.keys(dadosProfissional),
  invalidos: [
    ['nome', ''],
    ['sobrenome', 123],
    ['email', 'invalido'],
    ['senha', ''],
    ['senha', '12345'],
    ['cpf', '1234567890'],
    ['cpf', '123456789012345'],
    ['telefone', '1234567'],
    ['telefone', '123456789012345'],
    ['servicoIds', []],
    ['servicoIds', 'nao-e-lista'],
    ['servicoIds', ['nao-e-uuid']],
    ['servicoIds', [SERVICO_ID, SERVICO_ID]],
  ],
});

testarDto({
  nome: 'DTO de atualização de Profissional',
  criar: UpdateProfissionalDto,
  dados: {
    nome: dadosPessoa.nome,
    sobrenome: dadosPessoa.sobrenome,
    email: dadosPessoa.email,
    telefone: dadosPessoa.telefone,
    servicoIds: [SERVICO_ID],
  },
  obrigatorios: [],
  invalidos: [
    ['nome', ''],
    ['email', 'invalido'],
    ['telefone', '1234567'],
    ['servicoIds', []],
    ['servicoIds', ['nao-e-uuid']],
  ],
});
