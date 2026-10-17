import { isAbsolute, relative, resolve, sep } from 'node:path';

export const BACKUP_CONFIRMATION = 'OWNER_APPROVED_READ_ONLY_EXPORT';
export const ARCHIVE_MIN_PG_MAJOR = 17;

function inside(path, root) {
  const difference = relative(resolve(root), resolve(path));
  return difference === '' || (difference !== '..' && !difference.startsWith(`..${sep}`) && !isAbsolute(difference));
}

export function destinationDecision(directory, repositoryRoot) {
  if (typeof directory !== 'string' || !isAbsolute(directory)) return { ok: false, reason: 'absolute_private_directory_required' };
  const path = resolve(directory);
  if (inside(path, repositoryRoot)) return { ok: false, reason: 'repository_destination_forbidden' };
  if (inside(path, '/tmp') || inside(path, '/var/tmp') || inside(path, '/mnt/data')) {
    return { ok: false, reason: 'temporary_or_conversation_destination_forbidden' };
  }
  if (path === '/') return { ok: false, reason: 'filesystem_root_destination_forbidden' };
  return { ok: true, reason: null };
}

export function postgresMajor(versionText) {
  if (typeof versionText !== 'string') return null;
  const match = versionText.match(/PostgreSQL\)?\s+(\d+)(?:\.\d+)?/i);
  return match ? Number(match[1]) : null;
}

export function backupPreflight({ env, directory, repositoryRoot, dumpMajor, restoreMajor, confirmation }) {
  const destination = destinationDecision(directory, repositoryRoot);
  const credentialsAvailable = ['PGHOST', 'PGDATABASE', 'PGUSER'].every(key => typeof env[key] === 'string' && env[key].trim().length > 0)
    && (Boolean(env.PGPASSWORD) || Boolean(env.PGPASSFILE));
  const majorOk = Number.isInteger(dumpMajor) && Number.isInteger(restoreMajor)
    && dumpMajor >= ARCHIVE_MIN_PG_MAJOR && restoreMajor >= ARCHIVE_MIN_PG_MAJOR;
  const confirmationValid = confirmation === BACKUP_CONFIRMATION;
  return {
    destination: destination.reason || 'private_location_candidate',
    credentialsPresent: credentialsAvailable,
    toolsPg17OrNewer: majorOk,
    ownerConfirmationPresent: confirmationValid,
    readyForExplicitRun: destination.ok && credentialsAvailable && majorOk && confirmationValid,
    // DO NOT echo any PG* connection fields, keys, passwords, or commands containing secrets.
    archiveVerified: false,
    restoreVerified: false,
    storageObjectsBackedUp: false,
  };
}

export function utcArchiveName(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('invalid_clock');
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `thefeya-private-${stamp}.dump`;
}
