import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgendamentosTable1790400000000 implements MigrationInterface {
  name = 'CreateAgendamentosTable1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`agendamentos\` (\`id\` varchar(36) NOT NULL, \`cliente_id\` varchar(36) NOT NULL, \`profissional_id\` varchar(36) NOT NULL, \`servico_id\` varchar(36) NOT NULL, \`status\` int NOT NULL DEFAULT '0' COMMENT '0=pendente, 1=confirmado, 2=concluido, 3=cancelado', \`data_hora_inicio\` datetime NOT NULL, \`data_hora_fim\` datetime NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_agendamentos_profissional_data_hora\` (\`profissional_id\`, \`data_hora_inicio\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` ADD CONSTRAINT \`FK_agendamentos_cliente\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`clientes\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` ADD CONSTRAINT \`FK_agendamentos_profissional\` FOREIGN KEY (\`profissional_id\`) REFERENCES \`profissionais\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` ADD CONSTRAINT \`FK_agendamentos_servico\` FOREIGN KEY (\`servico_id\`) REFERENCES \`servicos\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` DROP FOREIGN KEY \`FK_agendamentos_servico\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` DROP FOREIGN KEY \`FK_agendamentos_profissional\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agendamentos\` DROP FOREIGN KEY \`FK_agendamentos_cliente\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_agendamentos_profissional_data_hora\` ON \`agendamentos\``,
    );
    await queryRunner.query(`DROP TABLE \`agendamentos\``);
  }
}
