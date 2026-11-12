import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgenda1791065799937 implements MigrationInterface {
    name = 'CreateAgenda1791065799937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`disponibilidades_profissional\` (\`id\` varchar(36) NOT NULL, \`profissional_id\` varchar(36) NOT NULL, \`dia_semana\` tinyint NOT NULL COMMENT '0=domingo, 1=segunda, ..., 6=sábado', \`hora_inicio\` time NOT NULL, \`hora_fim\` time NOT NULL, \`ativo\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_disponibilidades_profissional_dia\` (\`profissional_id\`, \`dia_semana\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`bloqueios_agenda\` (\`id\` varchar(36) NOT NULL, \`profissional_id\` varchar(36) NOT NULL, \`data\` date NOT NULL, \`hora_inicio\` time NULL, \`hora_fim\` time NULL, \`motivo\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_bloqueios_agenda_profissional_data\` (\`profissional_id\`, \`data\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`disponibilidades_profissional\` ADD CONSTRAINT \`FK_disponibilidades_profissional\` FOREIGN KEY (\`profissional_id\`) REFERENCES \`profissionais\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`bloqueios_agenda\` ADD CONSTRAINT \`FK_bloqueios_agenda_profissional\` FOREIGN KEY (\`profissional_id\`) REFERENCES \`profissionais\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bloqueios_agenda\` DROP FOREIGN KEY \`FK_bloqueios_agenda_profissional\``);
        await queryRunner.query(`ALTER TABLE \`disponibilidades_profissional\` DROP FOREIGN KEY \`FK_disponibilidades_profissional\``);
        await queryRunner.query(`DROP INDEX \`IDX_bloqueios_agenda_profissional_data\` ON \`bloqueios_agenda\``);
        await queryRunner.query(`DROP TABLE \`bloqueios_agenda\``);
        await queryRunner.query(`DROP INDEX \`IDX_disponibilidades_profissional_dia\` ON \`disponibilidades_profissional\``);
        await queryRunner.query(`DROP TABLE \`disponibilidades_profissional\``);
    }
}