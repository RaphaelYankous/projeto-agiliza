import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminsTable1790300000000 implements MigrationInterface {
  name = 'CreateAdminsTable1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `admins` (`usuario_id` varchar(36) NOT NULL, PRIMARY KEY (`usuario_id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'ALTER TABLE `admins` ADD CONSTRAINT `FK_admins_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `admins` DROP FOREIGN KEY `FK_admins_usuario`',
    );
    await queryRunner.query('DROP TABLE `admins`');
  }
}