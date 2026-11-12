import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { I18nModule } from 'nestjs-i18n';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { configurarApp } from '../../src/app.setup.js';
import { JWT_EXPIRES_IN } from '../../src/auth/auth.constants.js';
import { AuthGuard } from '../../src/auth/guards/auth.guard.js';
import { RoleGuard } from '../../src/auth/guards/roles.guard.js';
import { Role } from '../../src/usuarios/entities/usuario.entity.js';
import { ID } from './fixtures.js';

export async function criarAppTeste(metadata: ModuleMetadata) {
  const module = await Test.createTestingModule({
    ...metadata,
    imports: [
      JwtModule.register({
        secret: 'segredo-exclusivo-dos-testes-http',
        signOptions: { expiresIn: JWT_EXPIRES_IN },
      }),
      I18nModule.forRoot({
        fallbackLanguage: 'pt-BR',
        loaderOptions: {
          path: fileURLToPath(new URL('../../src/i18n/', import.meta.url)),
          watch: false,
        },
      }),
      ...(metadata.imports ?? []),
    ],
    providers: [
      ...(metadata.providers ?? []),
      { provide: APP_GUARD, useClass: AuthGuard },
      { provide: APP_GUARD, useClass: RoleGuard },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configurarApp(app);
  await app.init();
  const jwt = module.get(JwtService);
  const token = (role = Role.GESTOR, sub = ID) =>
    jwt.sign({ sub, email: 'teste@example.com', role });
  return { app, jwt, token };
}

export type AppTeste = Awaited<ReturnType<typeof criarAppTeste>>;
export type RotaTeste = { metodo: 'get' | 'post' | 'patch' | 'delete'; caminho: string };

export function testarRotasProtegidas(
  contexto: () => { app: INestApplication; jwt: JwtService },
  rotas: RotaTeste[],
) {
  describe.each(rotas)('$metodo $caminho — autenticação', ({ metodo, caminho }) => {
    it.each(['ausente', 'inválido', 'expirado', 'Basic'])(
      'retorna 401 com token %s',
      async (cenario) => {
        const { app, jwt } = contexto();
        const requisicao = request(app.getHttpServer())[metodo](caminho).send({});
        if (cenario === 'inválido') requisicao.auth('token-invalido', { type: 'bearer' });
        if (cenario === 'expirado')
          requisicao.auth(jwt.sign({ sub: ID }, { expiresIn: -1 }), { type: 'bearer' });
        if (cenario === 'Basic') requisicao.set('Authorization', 'Basic token');
        const resposta = await requisicao.expect(401);
        expect(resposta.body).toMatchObject({ statusCode: 401 });
      },
    );
  });
}
