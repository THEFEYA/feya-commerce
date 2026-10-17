export declare const BACKUP_CONFIRMATION: string;
export declare const ARCHIVE_MIN_PG_MAJOR: number;
export declare function destinationDecision(directory: string, repositoryRoot: string): { ok: boolean; reason: string | null };
export declare function postgresMajor(versionText: string | null | undefined): number | null;
export declare function backupPreflight(args: {
  env: Readonly<Record<string, string | undefined>>;
  directory: string;
  repositoryRoot: string;
  dumpMajor: number | null;
  restoreMajor: number | null;
  confirmation: string;
}): {
  destination: string;
  credentialsPresent: boolean;
  toolsPg17OrNewer: boolean;
  ownerConfirmationPresent: boolean;
  readyForExplicitRun: boolean;
  archiveVerified: false;
  restoreVerified: false;
  storageObjectsBackedUp: false;
};
export declare function utcArchiveName(date: Date): string;
