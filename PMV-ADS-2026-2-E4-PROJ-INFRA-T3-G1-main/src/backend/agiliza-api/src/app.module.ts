import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProfissionaisModule } from './profissionais/profissionais.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { AuthModule } from './auth/auth.module.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { IsUnique } from './common/validators/isUnique.validator.js';
import { EntityManager } from 'typeorm';
import { ClientesModule } from './clientes/clientes.module.js';
import { ServicosModule } from './servicos/servicos.module.js';
import { FidelidadeModule } from './fidelidade/fidelidade.module.js';
import { AgendamentosModule } from './agendamentos/agendamentos.module.js';
import { GestoresModule } from './gestores/gestores.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module.js';
import { AgendasModule } from './agenda/agenda.module.js';
import { EstabelecimentosModule } from './estabelecimentos/estabelecimentos.module.js';
import { PerfilProfissionalModule } from './perfil-profissional/perfil-profissional.module.js';
import { PerfilClienteModule } from './perfil-cliente/perfil-cliente.module.js';
import { NotificacoesModule } from './notificacoes/notificacoes.module.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './src/config/development.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.getOrThrow('DB_HOST'),
        port: +configService.getOrThrow('DB_PORT'),
        username: configService.getOrThrow('DB_USERNAME'),
        password: configService.getOrThrow('DB_PASSWORD'),
        database: configService.getOrThrow('DB_DATABASE'),
        autoLoadEntities: true,
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow('MONGODB_URI'),
        serverSelectionTimeoutMS: 5000,
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'pt-BR',
      loaderOptions: {
        path: path.join(dirname, 'i18n'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    UsuariosModule,
    AuthModule,
    ClientesModule,
    ServicosModule,
    FidelidadeModule,
    GestoresModule,
    ProfissionaisModule,
    AgendamentosModule,
    AvaliacoesModule,
    AgendasModule,
    PerfilProfissionalModule,
     EstabelecimentosModule,
     PerfilClienteModule
    ,NotificacoesModule
  ],
  providers: [IsUnique],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private readonly entityManager: EntityManager) {}

  onModuleInit() {
    IsUnique.init(this.entityManager);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({ path: '*splat', method: RequestMethod.ALL });
  }
}
