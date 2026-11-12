import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service.js';
import type { DadosEmailAgendamento } from './email.templates.js';

const CHAVE = 'SG.chave-secreta-de-teste';

const dados: DadosEmailAgendamento = {
  destinatarioEmail: 'ana@exemplo.com',
  destinatarioNome: 'Ana',
  servicoNome: 'Corte Degradê',
  profissionalNome: 'Carlos',
  estabelecimentoNome: 'Barbearia Central',
  dataHoraInicio: new Date('2030-10-21T13:00:00Z'),
};

function montarServico(config: Record<string, string | undefined>) {
  const configService = { get: (chave: string) => config[chave] } as unknown as ConfigService;
  return new EmailService(configService);
}

const configCompleta = { SENDGRID_API_KEY: CHAVE, SENDGRID_FROM: 'no-reply@agiliza.com' };

describe('EmailService', () => {
  const fetchSimulado = vi.fn();
  let avisos: ReturnType<typeof vi.spyOn>;
  let erros: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSimulado.mockReset();
    fetchSimulado.mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal('fetch', fetchSimulado);
    avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('não envia e só registra aviso quando o SendGrid não está configurado', async () => {
    const service = montarServico({});

    await expect(service.enviarAgendamentoCriado(dados)).resolves.toBe(false);

    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(avisos).toHaveBeenCalled();
  });

  it('não envia quando falta o remetente', async () => {
    const service = montarServico({ SENDGRID_API_KEY: CHAVE });

    await expect(service.enviarAgendamentoCriado(dados)).resolves.toBe(false);

    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('envia o e-mail de criado para o SendGrid com chave, remetente e destinatário', async () => {
    const service = montarServico(configCompleta);

    await expect(service.enviarAgendamentoCriado(dados)).resolves.toBe(true);

    const [url, opcoes] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(opcoes.method).toBe('POST');
    expect((opcoes.headers as Record<string, string>).Authorization).toBe(`Bearer ${CHAVE}`);

    const corpo = JSON.parse(opcoes.body as string);
    expect(corpo.personalizations[0].to[0]).toEqual({ email: 'ana@exemplo.com', name: 'Ana' });
    expect(corpo.from.email).toBe('no-reply@agiliza.com');
    expect(corpo.subject).toBe('Agendamento realizado - Agiliza');
    expect(corpo.content.map((c: { type: string }) => c.type)).toEqual(['text/plain', 'text/html']);
  });

  it('envia o e-mail de cancelado com o assunto de cancelamento', async () => {
    const service = montarServico(configCompleta);

    await expect(service.enviarAgendamentoCancelado(dados)).resolves.toBe(true);

    const [, opcoes] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opcoes.body as string).subject).toBe('Agendamento cancelado - Agiliza');
  });

  it('usa SENDGRID_API_URL quando informada', async () => {
    const service = montarServico({
      ...configCompleta,
      SENDGRID_API_URL: 'http://localhost:9999/x',
    });

    await service.enviarAgendamentoCriado(dados);

    expect(fetchSimulado.mock.calls[0][0]).toBe('http://localhost:9999/x');
  });

  it.each([401, 500])(
    'devolve false sem lançar erro quando o SendGrid responde %i',
    async (status) => {
      fetchSimulado.mockResolvedValue({ ok: false, status });
      const service = montarServico(configCompleta);

      await expect(service.enviarAgendamentoCriado(dados)).resolves.toBe(false);

      expect(erros).toHaveBeenCalledWith(expect.stringContaining(`HTTP ${status}`));
    },
  );

  it('devolve false sem lançar erro quando a rede falha ou estoura o tempo', async () => {
    fetchSimulado.mockRejectedValue(new Error('timeout'));
    const service = montarServico(configCompleta);

    await expect(service.enviarAgendamentoCancelado(dados)).resolves.toBe(false);

    expect(erros).toHaveBeenCalledWith(expect.stringContaining('timeout'));
  });

  it('nunca escreve a chave da API no log', async () => {
    fetchSimulado.mockRejectedValue(new Error('falhou'));
    const service = montarServico(configCompleta);

    await service.enviarAgendamentoCriado(dados);
    fetchSimulado.mockResolvedValue({ ok: false, status: 401 });
    await service.enviarAgendamentoCriado(dados);

    const registros = [...avisos.mock.calls, ...erros.mock.calls].flat().join(' ');
    expect(registros).not.toContain(CHAVE);
  });
});
