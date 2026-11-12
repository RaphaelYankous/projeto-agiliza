import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClientesTable1790256300000 implements MigrationInterface {
  name = 'CreateClientesTable1790256300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clientes',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'foto_perfil',
            type: 'longblob',
            isNullable: true,
          },
          {
            name: 'usuario_id',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['usuario_id'],
            referencedTableName: 'usuarios',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clientes', true, true, true);
  }
}