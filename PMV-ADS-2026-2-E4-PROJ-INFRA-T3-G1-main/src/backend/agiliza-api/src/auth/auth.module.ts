import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { EmailModule } from '../email/email.module.js';
import { TokenRedefinicaoSenha } from './entities/token-redefinicao-senha.entity.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RoleGuard } from './guards/roles.guard.js';
import { JWT_EXPIRES_IN } from './auth.constants.js';

@Module({
  imports: [
    UsuariosModule,
    EmailModule,
    TypeOrmModule.forFeature([TokenRedefinicaoSenha]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: JWT_EXPIRES_IN },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AuthModule {}