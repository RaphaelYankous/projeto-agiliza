import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstabelecimentoForeignKeyProfissionais1791200000000
  implements MigrationInterface
{
  name = 'AddEstabelecimentoForeignKeyProfissionais1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vínculos antigos apontando para estabelecimentos inexistentes não podem
    // existir para que a chave estrangeira seja criada.
    await queryRunner.query(`
      DELETE FROM \`profissionais\`
      WHERE \`estabelecimento_id\` NOT IN (SELECT \`id\` FROM \`estabelecimentos\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`profissionais\`
      ADD CONSTRAINT \`FK_profissionais_estabelecimento\`
      FOREIGN KEY (\`estabelecimento_id\`)
      REFERENCES \`estabelecimentos\`(\`id\`)
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`profissionais\`
      DROP FOREIGN KEY \`FK_profissionais_estabelecimento\`
    `);
  }
}
