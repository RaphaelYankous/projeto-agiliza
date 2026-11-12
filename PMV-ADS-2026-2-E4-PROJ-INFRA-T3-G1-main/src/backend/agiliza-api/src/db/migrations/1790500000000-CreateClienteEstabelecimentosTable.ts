import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClienteEstabelecimentosTable1790500000000
  implements MigrationInterface
{
  name = 'CreateClienteEstabelecimentosTable1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `cliente_estabelecimentos` (`cliente_id` varchar(36) NOT NULL, `estabelecimento_id` varchar(36) NOT NULL, `pontos` int NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_cliente_estabelecimento` (`cliente_id`, `estabelecimento_id`), PRIMARY KEY (`cliente_id`, `estabelecimento_id`)) ENGINE=InnoDB',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `UQ_cliente_estabelecimento` ON `cliente_estabelecimentos`',
    );
    await queryRunner.query('DROP TABLE `cliente_estabelecimentos`');
  }
}