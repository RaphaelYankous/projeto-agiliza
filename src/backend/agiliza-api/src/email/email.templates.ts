export interface DadosEmailAgendamento {
  destinatarioEmail: string;
  destinatarioNome: string;
  servicoNome: string;
  profissionalNome: string;
  estabelecimentoNome: string;
  dataHoraInicio: Date;
}

export interface DadosEmailRecuperacaoSenha {
  destinatarioEmail: string;
  destinatarioNome: string;
  linkRedefinicao: string;
}

export interface ConteudoEmail {
  assunto: string;
  texto: string;
  html: string;
}

// Nomes vêm do banco (cadastrados por usuários), então são escapados antes de entrar no HTML.
function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(data);
}

function montarEmail(
  dados: DadosEmailAgendamento,
  assunto: string,
  mensagem: string,
): ConteudoEmail {
  const dataHora = formatarDataHora(dados.dataHoraInicio);

  const linhas = [
    `Olá, ${dados.destinatarioNome}!`,
    '',
    mensagem,
    '',
    `Estabelecimento: ${dados.estabelecimentoNome}`,
    `Serviço: ${dados.servicoNome}`,
    `Profissional: ${dados.profissionalNome}`,
    `Data e horário: ${dataHora}`,
    '',
    'Equipe Agiliza',
  ];

  const html = `<p>Olá, ${escaparHtml(dados.destinatarioNome)}!</p>
<p>${escaparHtml(mensagem)}</p>
<ul>
  <li><strong>Estabelecimento:</strong> ${escaparHtml(dados.estabelecimentoNome)}</li>
  <li><strong>Serviço:</strong> ${escaparHtml(dados.servicoNome)}</li>
  <li><strong>Profissional:</strong> ${escaparHtml(dados.profissionalNome)}</li>
  <li><strong>Data e horário:</strong> ${escaparHtml(dataHora)}</li>
</ul>
<p>Equipe Agiliza</p>`;

  return { assunto, texto: linhas.join('\n'), html };
}

export function montarEmailAgendamentoCriado(dados: DadosEmailAgendamento): ConteudoEmail {
  return montarEmail(
    dados,
    'Agendamento realizado - Agiliza',
    'Seu agendamento foi realizado com sucesso. Confira os detalhes abaixo.',
  );
}

export function montarEmailAgendamentoCancelado(dados: DadosEmailAgendamento): ConteudoEmail {
  return montarEmail(
    dados,
    'Agendamento cancelado - Agiliza',
    'Seu agendamento foi cancelado. O horário abaixo ficou livre novamente.',
  );
}

export function montarEmailRecuperacaoSenha(dados: DadosEmailRecuperacaoSenha): ConteudoEmail {
  const assunto = 'Recuperação de Senha - Agiliza';

  const texto = [
    `Olá, ${dados.destinatarioNome}!`,
    '',
    'Recebemos uma solicitação para redefinir a sua senha no Agiliza.',
    'Acesse o link abaixo para cadastrar uma nova senha (válido por 30 minutos):',
    dados.linkRedefinicao,
    '',
    'Se você não solicitou essa redefinição, desconsidere este e-mail.',
    '',
    'Equipe Agiliza',
  ].join('\n');

  const html = `<div style="font-family: sans-serif; color: #222; max-width: 560px; line-height: 1.6;">
  <p>Olá, <strong>${escaparHtml(dados.destinatarioNome)}</strong>!</p>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Agiliza</strong>.</p>
  <p>Clique no botão abaixo para cadastrar uma nova senha. Por segurança, este link é válido por <strong>30 minutos</strong> e pode ser usado apenas uma vez:</p>
  <p style="margin: 24px 0;">
    <a href="${escaparHtml(dados.linkRedefinicao)}"
       style="background-color: #e75b47; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      Redefinir minha senha
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">
    Se o botão não funcionar, copie e cole o endereço no seu navegador:<br/>
    <a href="${escaparHtml(dados.linkRedefinicao)}" style="color: #e75b47;">${escaparHtml(dados.linkRedefinicao)}</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #888;">
    Se você não solicitou a troca de senha, nenhuma ação é necessária. Sua senha permanece inalterada.
  </p>
  <p>Equipe Agiliza</p>
</div>`;

  return { assunto, texto, html };
}