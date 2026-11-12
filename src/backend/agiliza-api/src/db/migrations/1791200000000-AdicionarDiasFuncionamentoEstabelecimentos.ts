import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarDiasFuncionamentoEstabelecimentos1791200000000
  implements MigrationInterface
{
  name = 'AdicionarDiasFuncionamentoEstabelecimentos1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` ADD `dias_funcionamento` json NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` DROP COLUMN `dias_funcionamento`',
    );
  }
}