export const PASSO_HORARIO_MINUTOS = 30;

export function alinhadoAoPasso(minutosDoDia: number): boolean {
  return minutosDoDia % PASSO_HORARIO_MINUTOS === 0;
}

export function primeiroHorarioAlinhado(minutosDoDia: number): number {
  return Math.ceil(minutosDoDia / PASSO_HORARIO_MINUTOS) * PASSO_HORARIO_MINUTOS;
}

const DIAS_COM_ARTIGO = [
  'no domingo',
  'na segunda-feira',
  'na terça-feira',
  'na quarta-feira',
  'na quinta-feira',
  'na sexta-feira',
  'no sábado',
];

export type HorarioSemanal = { diaSemana: number; horaInicio: string; horaFim: string };
export type Funcionamento = { horarioAbertura: string; horarioFechamento: string };

export function minutosDoDia(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function horaCurta(hora: string): string {
  return hora.slice(0, 5);
}

export function validarHorario(
  novo: HorarioSemanal,
  existentes: HorarioSemanal[],
  funcionamento: Funcionamento,
): string | null {
  const inicio = minutosDoDia(novo.horaInicio);
  const fim = minutosDoDia(novo.horaFim);
  if (fim <= inicio) {
    return 'O horário final precisa ser posterior ao horário inicial.';
  }
  if (
    inicio < minutosDoDia(funcionamento.horarioAbertura) ||
    fim > minutosDoDia(funcionamento.horarioFechamento)
  ) {
    return `O horário precisa estar dentro do funcionamento do estabelecimento (${horaCurta(funcionamento.horarioAbertura)} às ${horaCurta(funcionamento.horarioFechamento)}).`;
  }
  const conflito = existentes.find(
    (outro) =>
      outro.diaSemana === novo.diaSemana &&
      inicio < minutosDoDia(outro.horaFim) &&
      fim > minutosDoDia(outro.horaInicio),
  );
  if (conflito) {
    return `Este horário se sobrepõe a outro já cadastrado ${DIAS_COM_ARTIGO[conflito.diaSemana]} (${horaCurta(conflito.horaInicio)} às ${horaCurta(conflito.horaFim)}).`;
  }
  return null;
}
