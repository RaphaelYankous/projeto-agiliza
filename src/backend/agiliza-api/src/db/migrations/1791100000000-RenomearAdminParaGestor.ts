import { MigrationInterface, QueryRunner } from 'typeorm';

// O perfil "admin" representa o dono/gerente do estabelecimento, nao um superusuario.
// Renomeia o perfil, a tabela e a coluna para "gestor", preservando os dados existentes.
export class RenomearAdminParaGestor1791100000000 implements MigrationInterface {
  name = 'RenomearAdminParaGestor1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // usuarios.perfil: aceita os dois valores, migra as linhas e remove 'admin'
    await queryRunner.query(
      "ALTER TABLE `usuarios` MODIFY `perfil` enum ('admin', 'gestor', 'profissional', 'cliente') NOT NULL",
    );
    await queryRunner.query("UPDATE `usuarios` SET `perfil` = 'gestor' WHERE `perfil` = 'admin'");
    await queryRunner.query(
      "ALTER TABLE `usuarios` MODIFY `perfil` enum ('gestor', 'profissional', 'cliente') NOT NULL",
    );

    // admins -> gestores
    await queryRunner.query('ALTER TABLE `admins` DROP FOREIGN KEY `FK_admins_usuario`');
    await queryRunner.query('RENAME TABLE `admins` TO `gestores`');
    await queryRunner.query(
      'ALTER TABLE `gestores` ADD CONSTRAINT `FK_gestores_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );

    // estabelecimentos.admin_id -> gestor_id
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` RENAME COLUMN `admin_id` TO `gestor_id`',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `estabelecimentos` RENAME COLUMN `gestor_id` TO `admin_id`',
    );

    await queryRunner.query('ALTER TABLE `gestores` DROP FOREIGN KEY `FK_gestores_usuario`');
    await queryRunner.query('RENAME TABLE `gestores` TO `admins`');
    await queryRunner.query(
      'ALTER TABLE `admins` ADD CONSTRAINT `FK_admins_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );

    await queryRunner.query(
      "ALTER TABLE `usuarios` MODIFY `perfil` enum ('admin', 'gestor', 'profissional', 'cliente') NOT NULL",
    );
    await queryRunner.query("UPDATE `usuarios` SET `perfil` = 'admin' WHERE `perfil` = 'gestor'");
    await queryRunner.query(
      "ALTER TABLE `usuarios` MODIFY `perfil` enum ('admin', 'profissional', 'cliente') NOT NULL",
    );
  }
}
