import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarFotoAtualizadaEmEstabelecimentos1791600000000
  implements MigrationInterface
{
  name = 'AdicionarFotoAtualizadaEmEstabelecimentos1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` ADD `foto_atualizada_em` datetime NULL',
    );
    await queryRunner.query(
      'UPDATE `estabelecimentos` SET `foto_atualizada_em` = NOW() WHERE `foto_perfil` IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` DROP COLUMN `foto_atualizada_em`',
    );
  }
}
