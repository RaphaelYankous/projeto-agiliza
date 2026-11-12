import { BadRequestException, Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MENSAGEM_ENVIO_ACIMA_DO_LIMITE } from './estabelecimento-galeria.service.js';

@Catch(BadRequestException)
export class LimiteArquivosGaleriaFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const resposta = host.switchToHttp().getResponse<Response>();
    const corpo =
      exception.message === 'Too many files'
        ? { statusCode: 400, message: MENSAGEM_ENVIO_ACIMA_DO_LIMITE, error: 'Bad Request' }
        : exception.getResponse();
    resposta.status(exception.getStatus()).json(corpo);
  }
}
