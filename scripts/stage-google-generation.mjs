import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';

const root = process.cwd();
const target = resolve(root, '.local', `google-build-${Date.now()}`);
mkdirSync(target, { recursive: true });
const paths = execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n');
for (const path of new Set(paths)) {
  if (!path || !existsSync(path)) continue;
  if (!['package.json', 'package-lock.json', 'tsconfig.base.json'].includes(path) &&
      !path.startsWith('packages/') && !path.startsWith('apps/api/') &&
      path !== 'apps/mobile/package.json' && !path.startsWith('infra/google-generation/')) continue;
  if (/(^|\/)(\.env[^/]*|\.local|\.vercel|node_modules|dist|\.next|supabase\/\.temp)(\/|$)/.test(path)) continue;
  const destination = resolve(target, path);
  if (relative(target, destination).startsWith(`..${sep}`)) throw new Error('invalid staging path');
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(path, destination);
}
console.log(target);
