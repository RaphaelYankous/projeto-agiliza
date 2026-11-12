import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import ts from 'typescript';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    {
      name: 'nestjs-decorator-metadata',
      enforce: 'pre',
      // Nest relies on design:paramtypes both for DI and for HTTP DTO validation.
      // Compile with TypeScript so the test pipeline preserves production metadata.
      transform(code, id) {
        if (!id.endsWith('.ts') || id.includes('/node_modules/')) return null;
        const result = ts.transpileModule(code, {
          fileName: id,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2023,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            sourceMap: true,
            inlineSources: true,
          },
        });
        return { code: result.outputText, map: result.sourceMapText };
      },
    },
  ],
  test: {
    globals: true,
    maxWorkers: 2,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
