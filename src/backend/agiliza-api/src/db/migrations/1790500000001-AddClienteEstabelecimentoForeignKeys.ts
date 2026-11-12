import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClienteEstabelecimentoForeignKeys1790500000001
  implements MigrationInterface
{
  name = 'AddClienteEstabelecimentoForeignKeys1790500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `cliente_estabelecimentos` ADD CONSTRAINT `FK_cliente_estabelecimentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `cliente_estabelecimentos` ADD CONSTRAINT `FK_cliente_estabelecimentos_estabelecimento` FOREIGN KEY (`estabelecimento_id`) REFERENCES `estabelecimentos`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `cliente_estabelecimentos` DROP FOREIGN KEY `FK_cliente_estabelecimentos_estabelecimento`',
    );
    await queryRunner.query(
      'ALTER TABLE `cliente_estabelecimentos` DROP FOREIGN KEY `FK_cliente_estabelecimentos_cliente`',
    );
  }
}