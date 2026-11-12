import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoverFotoPerfilParaUsuarios1791500000000 implements MigrationInterface {
  name = 'MoverFotoPerfilParaUsuarios1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `usuarios` ADD `foto_perfil` longblob NULL');
    await queryRunner.query('ALTER TABLE `clientes` DROP COLUMN `foto_perfil`');
    await queryRunner.query('ALTER TABLE `profissionais` DROP COLUMN `foto_perfil`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `profissionais` ADD `foto_perfil` longblob NULL');
    await queryRunner.query('ALTER TABLE `clientes` ADD `foto_perfil` longblob NULL');
    await queryRunner.query('ALTER TABLE `usuarios` DROP COLUMN `foto_perfil`');
  }
}
