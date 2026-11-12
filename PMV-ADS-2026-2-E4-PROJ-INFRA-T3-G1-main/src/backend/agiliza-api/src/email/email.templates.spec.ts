import {
  montarEmailAgendamentoCancelado,
  montarEmailAgendamentoCriado,
  type DadosEmailAgendamento,
} from './email.templates.js';

// 13:00 UTC = 10:00 em Brasília, qualquer que seja o fuso da máquina.
const dados: DadosEmailAgendamento = {
  destinatarioEmail: 'ana@exemplo.com',
  destinatarioNome: 'Ana',
  servicoNome: 'Corte Degradê',
  profissionalNome: 'Carlos',
  estabelecimentoNome: 'Barbearia Central',
  dataHoraInicio: new Date('2030-10-21T13:00:00Z'),
};

describe('email.templates', () => {
  it('monta o e-mail de agendamento criado com os dados do atendimento', () => {
    const email = montarEmailAgendamentoCriado(dados);

    expect(email.assunto).toBe('Agendamento realizado - Agiliza');
    expect(email.texto).toContain('Olá, Ana!');
    expect(email.texto).toContain('Barbearia Central');
    expect(email.texto).toContain('Corte Degradê');
    expect(email.texto).toContain('Carlos');
    expect(email.texto).toContain('10:00');
    expect(email.texto).toContain('realizado com sucesso');
    expect(email.html).toContain('<strong>Serviço:</strong> Corte Degradê');
  });

  it('monta o e-mail de agendamento cancelado com texto diferente do de criado', () => {
    const criado = montarEmailAgendamentoCriado(dados);
    const cancelado = montarEmailAgendamentoCancelado(dados);

    expect(cancelado.assunto).toBe('Agendamento cancelado - Agiliza');
    expect(cancelado.texto).toContain('foi cancelado');
    expect(cancelado.texto).not.toBe(criado.texto);
    expect(cancelado.texto).toContain('Barbearia Central');
  });

  it('escapa HTML nos nomes para não injetar marcação no e-mail', () => {
    const email = montarEmailAgendamentoCriado({
      ...dados,
      destinatarioNome: '<script>alert(1)</script>',
      estabelecimentoNome: 'Salão "A&B"',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Salão &quot;A&amp;B&quot;');
  });
});
