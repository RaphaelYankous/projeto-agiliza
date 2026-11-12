import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEstabelecimentosTable1789930000000 implements MigrationInterface {
    name = 'CreateEstabelecimentosTable1789930000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`estabelecimentos\` (
            \`id\` varchar(36) NOT NULL,
            \`nome\` varchar(150) NOT NULL,
            \`razao_social\` varchar(150) NOT NULL,
            \`cnpj\` varchar(14) NOT NULL,
            \`email\` varchar(255) NOT NULL,
            \`endereco\` text NOT NULL,
            \`telefone\` varchar(20) NOT NULL,
            \`descricao\` text NULL,
            \`foto_perfil\` blob NULL,
            \`fotos\` json NULL,
            \`fidelidade\` tinyint NOT NULL DEFAULT 0,
            \`rede_social\` json NULL,
            \`horario_abertura\` time NOT NULL,
            \`horario_fechamento\` time NOT NULL,
            \`admin_id\` varchar(36) NOT NULL,
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_estabelecimentos_cnpj\` (\`cnpj\`),
            UNIQUE INDEX \`IDX_estabelecimentos_email\` (\`email\`)
        ) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`estabelecimentos\``);
    }
}
