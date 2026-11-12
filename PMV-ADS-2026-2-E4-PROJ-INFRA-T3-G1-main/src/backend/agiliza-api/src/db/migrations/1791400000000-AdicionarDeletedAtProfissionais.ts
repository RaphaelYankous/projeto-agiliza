import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarDeletedAtProfissionais1791400000000
  implements MigrationInterface
{
  name = 'AdicionarDeletedAtProfissionais1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `profissionais` ADD `deleted_at` datetime(6) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `profissionais` DROP COLUMN `deleted_at`',
    );
  }
}
