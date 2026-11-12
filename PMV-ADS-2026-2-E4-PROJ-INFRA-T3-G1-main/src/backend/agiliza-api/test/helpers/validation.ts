import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

export function testarDto(opcoes: {
  nome: string;
  criar: new () => object;
  atualizar?: new () => object;
  dados: object;
  obrigatorios: string[];
  invalidos: [string, unknown][];
}) {
  describe(opcoes.nome, () => {
    it('aceita os dados válidos', async () => {
      await expect(validate(Object.assign(new opcoes.criar(), opcoes.dados))).resolves.toEqual([]);
    });

    it.each(opcoes.obrigatorios)('exige %s no cadastro', async (campo) => {
      const dados: Record<string, unknown> = { ...opcoes.dados };
      delete dados[campo];
      const erros = await validate(Object.assign(new opcoes.criar(), dados));
      expect(erros.map((erro) => erro.property)).toEqual([campo]);
    });

    it.each(opcoes.invalidos)('rejeita %s igual a %j no cadastro', async (campo, valor) => {
      const erros = await validate(
        Object.assign(new opcoes.criar(), opcoes.dados, { [campo]: valor }),
      );
      expect(erros.map((erro) => erro.property)).toEqual([campo]);
    });

    const Atualizar = opcoes.atualizar;
    if (Atualizar) {
      it('aceita atualização vazia', async () => {
        await expect(validate(new Atualizar())).resolves.toEqual([]);
      });

      it.each(Object.entries(opcoes.dados))(
        'aceita atualização isolada de %s',
        async (campo, valor) => {
          await expect(
            validate(Object.assign(new Atualizar(), { [campo]: valor })),
          ).resolves.toEqual([]);
        },
      );

      it.each(opcoes.invalidos.filter(([, valor]) => valor !== null))(
        'mantém a validação de %s igual a %j no PATCH',
        async (campo, valor) => {
          const erros = await validate(Object.assign(new Atualizar(), { [campo]: valor }));
          expect(erros.map((erro) => erro.property)).toEqual([campo]);
        },
      );
    }
  });
}
