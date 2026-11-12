import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  montarEmailAgendamentoCancelado,
  montarEmailAgendamentoCriado,
  montarEmailRecuperacaoSenha,
  type ConteudoEmail,
  type DadosEmailAgendamento,
  type DadosEmailRecuperacaoSenha,
} from './email.templates.js';

const SENDGRID_URL_PADRAO = 'https://api.sendgrid.com/v3/mail/send';
const TIMEOUT_MS = 5000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  enviarAgendamentoCriado(dados: DadosEmailAgendamento): Promise<boolean> {
    return this.enviar(dados.destinatarioEmail, dados.destinatarioNome, montarEmailAgendamentoCriado(dados));
  }

  enviarAgendamentoCancelado(dados: DadosEmailAgendamento): Promise<boolean> {
    return this.enviar(dados.destinatarioEmail, dados.destinatarioNome, montarEmailAgendamentoCancelado(dados));
  }

  enviarRecuperacaoSenha(dados: DadosEmailRecuperacaoSenha): Promise<boolean> {
    return this.enviar(dados.destinatarioEmail, dados.destinatarioNome, montarEmailRecuperacaoSenha(dados));
  }

  private async enviar(
    destinatarioEmail: string,
    destinatarioNome: string,
    conteudo: ConteudoEmail,
  ): Promise<boolean> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const remetente = this.configService.get<string>('SENDGRID_FROM');

    if (!apiKey || !remetente) {
      this.logger.warn(
        `E-mail "${conteudo.assunto}" não enviado: SendGrid não configurado (SENDGRID_API_KEY e SENDGRID_FROM).`,
      );
      return false;
    }

    const url = this.configService.get<string>('SENDGRID_API_URL') || SENDGRID_URL_PADRAO;

    try {
      const resposta = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            { to: [{ email: destinatarioEmail, name: destinatarioNome }] },
          ],
          from: { email: remetente.trim(), name: 'Agiliza' },
          subject: conteudo.assunto,
          content: [
            { type: 'text/plain', value: conteudo.texto },
            { type: 'text/html', value: conteudo.html },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!resposta.ok) {
        const corpoResposta = await resposta.text();
        this.logger.error(
          `SendGrid recusou o e-mail "${conteudo.assunto}": HTTP ${resposta.status}. Detalhes: ${corpoResposta}`,
        );
        return false;
      }

      return true;
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(`Falha ao enviar o e-mail "${conteudo.assunto}": ${motivo}`);
      return false;
    }
  }
}