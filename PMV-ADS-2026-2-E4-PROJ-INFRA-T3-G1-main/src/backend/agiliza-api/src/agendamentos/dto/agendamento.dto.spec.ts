import { CreateAgendamentoDto } from './create-agendamento.dto.js';
import { ID } from '../../../test/helpers/fixtures.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'CreateAgendamentoDto',
  criar: CreateAgendamentoDto,
  dados: { profissionalId: ID, servicoId: ID, dataHoraInicio: '2030-10-21T10:00:00-03:00' },
  obrigatorios: ['profissionalId', 'servicoId', 'dataHoraInicio'],
  invalidos: [
    ['profissionalId', ''],
    ['servicoId', 123],
    ['dataHoraInicio', 'invalida'],
  ],
});
