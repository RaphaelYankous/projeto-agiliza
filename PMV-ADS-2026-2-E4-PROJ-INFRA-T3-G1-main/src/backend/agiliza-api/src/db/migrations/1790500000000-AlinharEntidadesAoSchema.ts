import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlinharEntidadesAoSchema1790500000000 implements MigrationInterface {
  name = 'AlinharEntidadesAoSchema1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // profissionais: usuario_id passa a ser uuid (string) e ganha FK para usuarios
    await queryRunner.query(
      `ALTER TABLE \`profissionais\` MODIFY \`usuario_id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`profissionais\` ADD \`foto_perfil\` longblob NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_5c1b5722ccecd36dcb83fbcc35\` ON \`profissionais\` (\`usuario_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`profissionais\` ADD CONSTRAINT \`FK_5c1b5722ccecd36dcb83fbcc352\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // clientes: troca o indice unico UQ_ pelo REL_ gerado pela relacao OneToOne
    await queryRunner.query(
      `ALTER TABLE \`clientes\` DROP FOREIGN KEY \`FK_edcf87e2f9017c3bd010d54b2d1\``,
    );
    await queryRunner.query(`DROP INDEX \`UQ_edcf87e2f9017c3bd010d54b2d1\` ON \`clientes\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_edcf87e2f9017c3bd010d54b2d\` ON \`clientes\` (\`usuario_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clientes\` ADD CONSTRAINT \`FK_edcf87e2f9017c3bd010d54b2d1\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // estabelecimentos: mediumblob suporta fotos de ate 16MB
    await queryRunner.query(
      `ALTER TABLE \`estabelecimentos\` MODIFY \`foto_perfil\` mediumblob NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`estabelecimentos\` MODIFY \`foto_perfil\` blob NULL`);

    await queryRunner.query(
      `ALTER TABLE \`clientes\` DROP FOREIGN KEY \`FK_edcf87e2f9017c3bd010d54b2d1\``,
    );
    await queryRunner.query(`DROP INDEX \`REL_edcf87e2f9017c3bd010d54b2d\` ON \`clientes\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_edcf87e2f9017c3bd010d54b2d1\` ON \`clientes\` (\`usuario_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clientes\` ADD CONSTRAINT \`FK_edcf87e2f9017c3bd010d54b2d1\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`profissionais\` DROP FOREIGN KEY \`FK_5c1b5722ccecd36dcb83fbcc352\``,
    );
    await queryRunner.query(`DROP INDEX \`REL_5c1b5722ccecd36dcb83fbcc35\` ON \`profissionais\``);
    await queryRunner.query(`ALTER TABLE \`profissionais\` DROP COLUMN \`foto_perfil\``);
    await queryRunner.query(`ALTER TABLE \`profissionais\` MODIFY \`usuario_id\` int NOT NULL`);
  }
}
