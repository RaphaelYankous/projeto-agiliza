import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarLatitudeLongitudeEstabelecimentos1789930001000
  implements MigrationInterface
{
  name = 'AdicionarLatitudeLongitudeEstabelecimentos1789930001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` ADD `latitude` decimal(10,8) NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` ADD `longitude` decimal(11,8) NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` DROP COLUMN `longitude`',
    );
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` DROP COLUMN `latitude`',
    );
  }
}