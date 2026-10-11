/** Applies migrations and the base seed to the e2e database. */
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { applyTestEnv, testDatabaseUrl } from './test-env';

applyTestEnv();
const cwd = join(__dirname, '..');
const env = { ...process.env, DATABASE_URL: testDatabaseUrl(), SEED_DEMO_DATA: 'false' };

console.log(`▸ Preparing e2e database: ${testDatabaseUrl().replace(/:[^:@]*@/, ':***@')}`);
execSync('npx prisma migrate deploy', { cwd, env, stdio: 'inherit' });
execSync('npx tsx prisma/seed.ts', { cwd, env, stdio: 'inherit' });
