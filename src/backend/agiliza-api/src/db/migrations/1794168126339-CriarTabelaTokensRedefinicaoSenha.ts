import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarTabelaTokensRedefinicaoSenha1794168126339 implements MigrationInterface {
  name = 'CriarTabelaTokensRedefinicaoSenha1794168126339';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tokens_redefinicao_senha\` (
        \`id\` varchar(36) NOT NULL,
        \`usuario_id\` varchar(36) NOT NULL,
        \`token_hash\` varchar(64) NOT NULL,
        \`expira_em\` datetime NOT NULL,
        \`utilizado_em\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_tokens_redefinicao_senha_hash\` (\`token_hash\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tokens_redefinicao_senha\` 
        ADD CONSTRAINT \`FK_tokens_redefinicao_senha_usuario\` 
        FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tokens_redefinicao_senha\` 
        DROP FOREIGN KEY \`FK_tokens_redefinicao_senha_usuario\``,
    );
    await queryRunner.query(`DROP TABLE \`tokens_redefinicao_senha\``);
  }
}