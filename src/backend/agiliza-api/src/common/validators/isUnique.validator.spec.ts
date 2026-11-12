import type { ValidationArguments } from 'class-validator';
import type { EntityManager } from 'typeorm';
import { IsUnique } from './isUnique.validator.js';

describe('IsUnique', () => {
  it.each([false, true])(
    'retorna a negação da existência (%s) com valor parametrizado',
    async (existe) => {
      const query = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getExists: vi.fn(async () => existe),
      };
      IsUnique.init({ createQueryBuilder: () => query } as unknown as EntityManager);
      const args = { constraints: ['usuarios', 'email'] } as ValidationArguments;
      await expect(new IsUnique().validate('ana@example.com', args)).resolves.toBe(!existe);
      expect(query.from).toHaveBeenCalledWith('usuarios', 'usuarios');
      expect(query.where).toHaveBeenCalledWith('usuarios.email = :value', {
        value: 'ana@example.com',
      });
    },
  );

  it('usa a chave de tradução na mensagem de erro', () => {
    expect(new IsUnique().defaultMessage()).toBe('validation.IS_UNIQUE');
  });
});
