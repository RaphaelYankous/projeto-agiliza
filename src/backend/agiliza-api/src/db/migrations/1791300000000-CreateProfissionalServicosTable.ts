import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfissionalServicosTable1791300000000 implements MigrationInterface {
  name = 'CreateProfissionalServicosTable1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`profissional_servicos\` (
        \`profissional_id\` varchar(36) NOT NULL,
        \`servico_id\` varchar(36) NOT NULL,
        INDEX \`IDX_profissional_servicos_servico\` (\`servico_id\`),
        PRIMARY KEY (\`profissional_id\`, \`servico_id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE \`profissional_servicos\`
      ADD CONSTRAINT \`FK_profissional_servicos_profissional\`
      FOREIGN KEY (\`profissional_id\`) REFERENCES \`profissionais\`(\`id\`)
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE \`profissional_servicos\`
      ADD CONSTRAINT \`FK_profissional_servicos_servico\`
      FOREIGN KEY (\`servico_id\`) REFERENCES \`servicos\`(\`id\`)
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profissional_servicos\` DROP FOREIGN KEY \`FK_profissional_servicos_servico\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`profissional_servicos\` DROP FOREIGN KEY \`FK_profissional_servicos_profissional\``,
    );
    await queryRunner.query(`DROP TABLE \`profissional_servicos\``);
  }
}
