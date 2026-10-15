import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = process.cwd();
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
function staticModules(entry: string, visited = new Set<string>()): Set<string> {
  const file = path.resolve(root, entry);
  if (visited.has(file) || file.includes('node_modules') || !/\.tsx?$/.test(file)) return visited;
  visited.add(file);
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      if (!clause?.name && clause?.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.every(item => item.isTypeOnly)) continue;
    } else if (statement.isTypeOnly) continue;
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = ts.resolveModuleName(statement.moduleSpecifier.text, file, options, ts.sys).resolvedModule;
    if (resolved) staticModules(resolved.resolvedFileName, visited);
  }
  return visited;
}
it.each(['app/api/today/route.ts', 'app/api/experience/[...path]/route.ts'])(
  '%s statically reaches only read models, not Office/PDF/preparation/generation handlers', entry => {
    const modules = [...staticModules(entry)].map(file => file.replaceAll('\\', '/'));
    expect(modules.length).toBeGreaterThan(10);
    expect(modules.filter(file => /\/(office-extraction|pdfjs-runtime|generation)\.ts$|\/(quiz|activity-maker)\/service\.ts$|\/canvas-reviewer-sources\.ts$/.test(file))).toEqual([]);
  },
);
it('limits the Today asset packaging exception to its DTO-only route', async () => {
  const { default: loadConfig } = await import('../../../next.config');
  const config = await loadConfig('phase-production-server', { defaultConfig: {} });
  // Test the actual matcher used by installed Next, including nested writes.
  const match = createRequire(import.meta.url)('next/dist/compiled/picomatch') as (glob: string, options: { contains: boolean; dot: boolean }) => (route: string) => boolean;
  const keys = Object.keys(config.outputFileTracingIncludes ?? {});
  expect(keys.some(key => match(key, { contains: true, dot: true })('/api/today'))).toBe(false);
  for (const route of ['/api/jobs', '/api/experience/[...path]', '/api/canvas/courses/[courseId]/sources/prepare', '/.well-known/workflow/v1/step']) {
    expect(keys.some(key => match(key, { contains: true, dot: true })(route))).toBe(true);
  }
});
