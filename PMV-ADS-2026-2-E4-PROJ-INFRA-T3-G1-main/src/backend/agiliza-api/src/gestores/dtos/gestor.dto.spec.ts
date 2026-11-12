import { GestorCreateDto } from './gestor-create.dto.js';
import { GestorUpdateDto } from './gestor-update.dto.js';
import { dadosPessoa } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'DTOs de Gestor',
  criar: GestorCreateDto,
  atualizar: GestorUpdateDto,
  dados: dadosPessoa,
  obrigatorios: Object.keys(dadosPessoa),
  invalidos: [
    ['nome', ''],
    ['sobrenome', 123],
    ['email', 'invalido'],
    ['senha', ''],
    ['cpf', '1234567890'],
    ['cpf', '123456789012345'],
    ['telefone', '1234567'],
    ['telefone', '123456789012345'],
  ],
});
