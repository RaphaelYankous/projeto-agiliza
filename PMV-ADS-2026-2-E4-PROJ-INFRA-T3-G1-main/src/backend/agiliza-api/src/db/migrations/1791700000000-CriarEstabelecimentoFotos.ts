import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarEstabelecimentoFotos1791700000000 implements MigrationInterface {
  name = 'CriarEstabelecimentoFotos1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`estabelecimento_fotos\` (
        \`id\` varchar(36) NOT NULL,
        \`estabelecimento_id\` varchar(36) NOT NULL,
        \`conteudo\` mediumblob NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_estabelecimento_fotos_estabelecimento_created\` (\`estabelecimento_id\`, \`created_at\`),
        CONSTRAINT \`FK_estabelecimento_fotos_estabelecimento\` FOREIGN KEY (\`estabelecimento_id\`)
          REFERENCES \`estabelecimentos\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query('ALTER TABLE `estabelecimentos` DROP COLUMN `fotos`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `estabelecimentos` ADD `fotos` json NULL');
    await queryRunner.query('DROP TABLE `estabelecimento_fotos`');
  }
}
