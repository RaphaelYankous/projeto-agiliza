import { CreateClienteDto } from './create-cliente.dto.js';
import { UpdateClienteDto } from './update-cliente.dto.js';
import { dadosPessoa } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'DTOs de Cliente',
  criar: CreateClienteDto,
  atualizar: UpdateClienteDto,
  dados: dadosPessoa,
  obrigatorios: Object.keys(dadosPessoa),
  invalidos: [
    ['nome', ''],
    ['sobrenome', 123],
    ['email', 'invalido'],
    ['senha', '12345'],
    ['cpf', ''],
    ['telefone', 123],
  ],
});
