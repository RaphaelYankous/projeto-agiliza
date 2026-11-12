import 'reflect-metadata';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';
import { RoleGuard } from './roles.guard.js';
import { UnauthorizedException } from '../../common/exceptions/unauthorized.exception.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../usuarios/entities/usuario.entity.js';

function montar(authorization?: string) {
  const handler = () => undefined;
  class Controller {}
  const request: { headers: { authorization?: string }; user?: { sub: string; role: Role } } = {
    headers: { authorization },
  };
  const context = {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const jwt = { verifyAsync: vi.fn(async () => ({ sub: 'usuario-1', role: Role.CLIENTE })) };
  return {
    handler,
    request,
    context,
    jwt,
    auth: new AuthGuard(jwt as unknown as JwtService, new Reflector()),
    roles: new RoleGuard(new Reflector()),
  };
}

describe('AuthGuard', () => {
  it('dispensa JWT em rota pública', async () => {
    const { handler, context, auth, jwt } = montar();
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    await expect(auth.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('valida Bearer e anexa a identidade à requisição', async () => {
    const { auth, context, jwt, request } = montar('Bearer token');
    await expect(auth.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('token');
    expect(request.user).toEqual({ sub: 'usuario-1', role: Role.CLIENTE });
  });

  it.each([undefined, '', 'Basic token', 'Bearer', 'bearer token'])(
    'rejeita header %j antes da validação JWT',
    async (header) => {
      const { auth, context, jwt } = montar(header);
      await expect(auth.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
    },
  );

  it('converte falha de verificação em 401', async () => {
    const { auth, context, jwt } = montar('Bearer adulterado');
    jwt.verifyAsync.mockRejectedValueOnce(new Error('Assinatura inválida'));
    await expect(auth.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('RoleGuard', () => {
  it('não restringe perfis se a rota só exige autenticação', () => {
    const { roles, context } = montar();
    expect(roles.canActivate(context)).toBe(true);
  });

  it('aceita um perfil declarado na política', () => {
    const { roles, context, handler, request } = montar();
    Reflect.defineMetadata(ROLES_KEY, [Role.CLIENTE], handler);
    request.user = { sub: 'usuario-1', role: Role.CLIENTE };
    expect(roles.canActivate(context)).toBe(true);
  });

  it.each([undefined, Role.PROFISSIONAL, Role.GESTOR])(
    'rejeita identidade ou perfil %j fora da política',
    (role) => {
      const { roles, context, handler, request } = montar();
      Reflect.defineMetadata(ROLES_KEY, [Role.CLIENTE], handler);
      request.user = role ? { sub: 'usuario-1', role } : undefined;
      expect(() => roles.canActivate(context)).toThrow(ForbiddenException);
    },
  );
});
