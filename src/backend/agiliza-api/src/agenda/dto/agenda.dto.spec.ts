import { CreateDisponibilidadeDto } from './create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './update-disponibilidade.dto.js';
import { CreateBloqueioDto } from './create-bloqueio.dto.js';
import { testarDto } from '../../../test/helpers/validation.js';

testarDto({
  nome: 'DTOs de Disponibilidade',
  criar: CreateDisponibilidadeDto,
  atualizar: UpdateDisponibilidadeDto,
  dados: { diaSemana: 0, horaInicio: '00:00', horaFim: '23:59', ativo: false },
  obrigatorios: ['diaSemana', 'horaInicio', 'horaFim'],
  invalidos: [
    ['diaSemana', -1],
    ['diaSemana', 7],
    ['diaSemana', 1.5],
    ['diaSemana', '1'],
    ['horaInicio', '24:00'],
    ['horaInicio', '9:00'],
    ['horaFim', '12:60'],
    ['horaFim', '12:00:00'],
    ['ativo', 'false'],
  ],
});

testarDto({
  nome: 'CreateBloqueioDto',
  criar: CreateBloqueioDto,
  dados: { data: '2030-10-21' },
  obrigatorios: ['data'],
  invalidos: [
    ['data', 'invalida'],
    ['horaInicio', '24:00'],
    ['horaFim', '12:60'],
    ['motivo', 123],
  ],
});
