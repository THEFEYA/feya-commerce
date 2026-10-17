import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { BACKUP_CONFIRMATION, backupPreflight, destinationDecision, postgresMajor, utcArchiveName } from '../../lib/backupArchivePolicy.mjs';

const repo = resolve(process.cwd());
const privateDir = '/home/operator/.feya-private-backups';

test('explicit destination and credentials gates refuse insecure execution', () => {
  for (const path of [repo, join(repo, 'backups'), '/tmp/feya', '/mnt/data/backup', './backup']) {
    assert.equal(destinationDecision(path, repo).ok, false);
  }
  const env = { PGHOST: 'test.invalid', PGUSER: 'test', PGDATABASE: 'test', PGPASSWORD: 'DO_NOT_PRINT' };
  const args = { env, directory: privateDir, repositoryRoot: repo, dumpMajor: 17, restoreMajor: 17, confirmation: '' };
  assert.equal(backupPreflight(args).readyForExplicitRun, false);
  assert.equal(backupPreflight({ ...args, confirmation: BACKUP_CONFIRMATION }).readyForExplicitRun, true);
  assert.equal(backupPreflight({ ...args, confirmation: BACKUP_CONFIRMATION, restoreMajor: 16 }).readyForExplicitRun, false);
  assert.equal(backupPreflight({ ...args, confirmation: BACKUP_CONFIRMATION, env: { ...env, PGPASSWORD: '' } }).readyForExplicitRun, false);
  assert.equal(JSON.stringify(backupPreflight(args)).includes('DO_NOT_PRINT'), false);
});

test('operator defaults to no-op and never prints source password', () => {
  assert.equal(postgresMajor('pg_dump (PostgreSQL) 17.6'), 17);
  assert.equal(postgresMajor('pg_restore (PostgreSQL) 18.1'), 18);
  assert.equal(utcArchiveName(new Date('2026-10-17T14:00:00Z')), 'thefeya-private-20261017T140000Z.dump');
  const env = { ...process.env, FEYA_BACKUP_DIR: privateDir, FEYA_BACKUP_CONFIRM: '', PGPASSWORD: 'DO_NOT_PRINT' };
  const cmd = resolve('scripts/operator-db-archive.mjs');
  const preview = execFileSync(process.execPath, [cmd, '--preflight'], { env, encoding: 'utf8' });
  assert.equal(JSON.parse(preview).mode, 'PREFLIGHT_ONLY');
  const run = spawnSync(process.execPath, [cmd, '--run'], { env, encoding: 'utf8' });
  assert.equal(run.status, 3);
  assert.equal((preview + run.stderr).includes('DO_NOT_PRINT'), false);
});

test('fake database tools prove private TOC-only archive, not a restored project', () => {
  const root = mkdtempSync(join(homedir(), '.feya-backup-test-'));
  try {
    const bin = join(root, 'bin'), out = join(root, 'private');
    mkdirSync(bin, { mode: 0o700 });
    writeFileSync(join(bin, 'pg_dump'), "#!/usr/bin/env node\nconst f=require('fs');if(process.argv.includes('--version')){console.log('pg_dump (PostgreSQL) 17.6');process.exit(0)}const a=process.argv.find(s=>s.startsWith('--file='));if(!a)process.exit(2);f.writeFileSync(a.slice(7),Buffer.alloc(3072,65));", { mode: 0o700 });
    writeFileSync(join(bin, 'pg_restore'), "#!/usr/bin/env node\nif(process.argv.includes('--version')){console.log('pg_restore (PostgreSQL) 17.6');process.exit(0)}if(process.argv.includes('--list')){console.log('1234; 0 0 TABLE DATA public synthetic postgres');process.exit(0)}process.exit(2);", { mode: 0o700 });
    const env = { ...process.env, PATH: bin + ':' + process.env.PATH, FEYA_BACKUP_DIR: out, FEYA_BACKUP_CONFIRM: BACKUP_CONFIRMATION,
      PGHOST: 'synthetic.invalid', PGUSER: 'fake', PGDATABASE: 'fake', PGPASSWORD: 'DO_NOT_PRINT', PGPASSFILE: '', PGSSLMODE: 'require' };
    const execution = spawnSync(process.execPath, [resolve('scripts/operator-db-archive.mjs'), '--run'], { env, encoding: 'utf8' });
    assert.equal(execution.status, 0, execution.stderr);
    const result = JSON.parse(execution.stdout);
    assert.equal(result.status, 'LOCAL_ARCHIVE_TOC_VERIFIED');
    assert.equal(result.completeRestoreTested, false);
    assert.equal(readdirSync(out).length, 2);
    const archive = join(out, result.archiveFileName);
    const manifest = JSON.parse(readFileSync(archive + '.manifest.json', 'utf8'));
    assert.equal(manifest.archiveSha256, createHash('sha256').update(readFileSync(archive)).digest('hex'));
    assert.equal(manifest.completeRestoreTested, false);
    assert.equal(manifest.storageFileObjectsIncluded, false);
    for (const file of [out, archive, archive + '.manifest.json']) assert.equal(statSync(file).mode & 0o077, 0);
    assert.equal(execution.stdout.includes('DO_NOT_PRINT'), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
