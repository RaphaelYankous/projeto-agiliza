import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfissionaisTable1790100000000
  implements MigrationInterface
{
  name = 'CreateProfissionaisTable1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`profissionais\` (
        \`id\` varchar(36) NOT NULL,
        \`usuario_id\` int NOT NULL,
        \`estabelecimento_id\` varchar(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`profissionais\``);
  }
}
