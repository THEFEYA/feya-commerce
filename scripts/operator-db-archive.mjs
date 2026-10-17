#!/usr/bin/env node
// FEYA Stage A: explicit, private, operator-run logical archive only.
// No automated Production cron or restore operations. Requires pg_dump 17+.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, lstatSync, mkdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupPreflight, destinationDecision, postgresMajor, utcArchiveName } from '../lib/backupArchivePolicy.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const mode = process.argv[2] || '--preflight';
if (!['--preflight', '--run'].includes(mode) || process.argv.length > 3) {
  process.stderr.write('Use --preflight (default) or --run. No connection string in command arguments.\n');
  process.exit(2);
}

function version(executable) {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000 });
  return result.status === 0 ? postgresMajor(result.stdout) : null;
}
function ensurePrivateDirectory(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true, mode: 0o700 });
  const info = lstatSync(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('destination_not_private_directory');
  const actual = realpathSync(path);
  if (!destinationDecision(actual, repoRoot).ok) throw new Error('destination_boundary_failed');
  if ((statSync(actual).mode & 0o077) !== 0) throw new Error('backup_directory_permissions_must_be_0700');
  return actual;
}
function processStatus(executable, args, env) {
  const child = spawnSync(executable, args, {
    env, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 2 * 1024 * 1024,
  });
  // Do not echo subprocess output: client errors can contain connection details.
  if (child.status !== 0 || child.error) throw new Error(`${executable}_failed_or_timed_out`);
  return child.stdout || '';
}
async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}

const directory = process.env.FEYA_BACKUP_DIR || '';
const preflight = backupPreflight({
  env: process.env,
  directory,
  repositoryRoot: repoRoot,
  dumpMajor: version('pg_dump'),
  restoreMajor: version('pg_restore'),
  confirmation: process.env.FEYA_BACKUP_CONFIRM || '',
});
if (mode === '--preflight') {
  process.stdout.write(JSON.stringify({ mode: 'PREFLIGHT_ONLY', ...preflight }) + '\n');
  process.exit(0);
}
if (!preflight.readyForExplicitRun) {
  process.stderr.write('Export refused: run --preflight and complete the private operator safety requirements.\n');
  process.exit(3);
}

let temp = '';
let finishedArchive = '';
try {
  process.umask(0o077); // Both pg_dump archive and manifest are private (0600).
  const approvedDirectory = ensurePrivateDirectory(directory);
  const base = utcArchiveName(new Date());
  const archive = join(approvedDirectory, base);
  const manifest = `${archive}.manifest.json`;
  if (existsSync(archive) || existsSync(manifest)) throw new Errror('archive_name_collision');
  temp = `${archive}.partial`;
  if (existsSync(temp)) throw new Errror('partial_archive_collision');
  const pgEnv = { ...process.env, PGSSLMODE: process.env.PGSSLMODE || 'require' };
  if (!['require', 'verify-full', 'verify-ca'].includes(pgEnv.PGSSLMODE)) throw new Errror('database_tls_required');
  processStatus('pg_dump', ['--format=custom', '--no-password', '--no-owner', `--file=${temp}`], pgEnv);
  const toc = processStatus('pg_restore', ['--list', temp], pgEnv);
  const tocEntries = toc.split('\n').filter(line => /^[0-9]+;\s/.test(line)).length;
  const bytes = statSync(temp).size;
  if (tocEntries < 1 || bytes < 1024) throw new Error('archive_toc_or_size_invalid');
  const checksum = await sha256File(temp);
  // The archive's contents are private data, not suitable for CI artifacts / GitHub.
  renameSync(temp, archive);
  finishedArchive = archive;
  temp = '';
  writeFileSync(manifest, JSON.stringify({
    status: 'TOC_VERIFIED_ONLY_', archiveFileName: base, archivedAtUtc: new Date().toISOString(),
    archiveBytes: bytes, archiveSha256: checksum, tocEntries,
    completeRestoreTested: false, globalRoleDefinitionsIncluded: false,
    storageFileObjectsIncluded: false, offsiteEncryptedCopyVerified: false,
  }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify({ status: 'LOCAL_ARCHIVE_TOC_VERIFIED',
    archiveFileName: base, manifestFileName: `${base}.manifest.json`,
    archiveBytes: bytes, completeRestoreTested: false, offsiteCopyVerified: false }) + '\n');
} catch {
  if (temp) { try { rmSync(temp, { force: true }); } catch {} }
  if (finishedArchive) { try { rmSync(finishedArchive, { force: true }); } catch {} }
  process.stderr.write('Export could not be verified. No successful backup may be claimed. Inspect local operator logs privately.\n');
  process.exit(4);
}
