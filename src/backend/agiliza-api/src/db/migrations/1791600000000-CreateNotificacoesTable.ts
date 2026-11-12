import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificacoesTable1791600000000 implements MigrationInterface {
  name = 'CreateNotificacoesTable1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notificacoes\` (\`id\` varchar(36) NOT NULL, \`usuario_id\` varchar(36) NOT NULL, \`tipo\` varchar(60) NOT NULL, \`titulo\` varchar(160) NOT NULL, \`mensagem\` text NOT NULL, \`lida\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_notificacoes_usuario_criada\` (\`usuario_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notificacoes\` ADD CONSTRAINT \`FK_notificacoes_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`notificacoes\` DROP FOREIGN KEY \`FK_notificacoes_usuario\``);
    await queryRunner.query(`DROP INDEX \`IDX_notificacoes_usuario_criada\` ON \`notificacoes\``);
    await queryRunner.query(`DROP TABLE \`notificacoes\``);
  }
}
