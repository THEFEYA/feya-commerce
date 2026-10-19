#!/usr/bin/env python3
"""G2c source ZIP verification/extraction (offline, read-only origin).

This checks ZIP bytes and safe file structure. It does NOT authenticate
the GitHub run, which MUST be separately checked via authenticated GitHub API.
No Supabase token, network, scheduled job, Growth Case or site mutation.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

EXPECTED = frozenset({
    "phase12-production-origin-crawl.json",
    "phase13-production-revision-gate.json",
    "phase13-shop-origin-smoke.json",
    "phase13-public-pdp-copy-postflight.json",
    "phase13-collection-origin-smoke.json",
    "growth-g2c-origin-observation.json",
})
MAX_FILE_BYTES = 150_000
MAX_TOTAL_BYTES = 400_000
MAX_COMPRESSION_RATIO = 100


def verify_and_unpack(zip_path: Path, expected_sha256: str, dest: Path) -> dict:
    if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
        raise ValueError("invalid_expected_sha256")
    raw = zip_path.read_bytes()
    if len(raw) > 1_000_000:
        raise ValueError("archive_zip_size_limit")
    actual = hashlib.sha256(raw).hexdigest()
    if actual != expected_sha256:
        raise ValueError("archive_zip_sha256_mismatch")

    with zipfile.ZipFile(zip_path, "r") as archive:
        entries = archive.infolist()
        if len(entries) != len(EXPECTED) or {e.filename for e in entries} != EXPECTED:
            raise ValueError("unexpected_archive_entry_set")
        if any(e.is_dir() or e.flag_bits & 1 or
               stat.S_IFMT(e.external_attr >> 16) not in (0, stat.S_IFREG)
               for e in entries):
            raise ValueError("archive_dir_encryption_or_symlink")
        total = sum(e.file_size for e in entries)
        if total > MAX_TOTAL_BYTES:
            raise ValueError("archive_uncompressed_size_limit")
        for entry in entries:
            if entry.file_size > MAX_FILE_BYTES:
                raise ValueError("archive_file_size_limit")
            if entry.file_size and (
                entry.compress_size <= 0 or
                entry.file_size / entry.compress_size > MAX_COMPRESSION_RATIO
            ):
                raise ValueError("archive_expansion_ratio_limit")

        verified: dict[str, bytes] = {}
        for entry in entries:
            value = archive.read(entry)
            if len(value) != entry.file_size:
                raise ValueError("archive_file_size_mismatch")
            try:
                obj = json.loads(value.decode("utf-8"))
            except (UnicodeError, ValueError) as error:
                raise ValueError("archive_invalid_json") from error
            if not isinstance(obj, dict):
                raise ValueError("archive_json_object_required")
            verified[entry.filename] = value

    g2c = json.loads(verified["growth-g2c-origin-observation.json"])
    revision = json.loads(verified["phase13-production-revision-gate.json"])
    crawl = json.loads(verified["phase12-production-origin-crawl.json"])
    source = g2c.get("source") or {}
    if not isinstance(source, dict) or g2c.get("schema") != "FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1" or (
        g2c.get("verdict") != "PRODUCTION_HTTP_OBSERVED" or
        g2c.get("evidenceLevel") != "L0_OBSERVATION"
    ):
        raise ValueError("archive_g2c_source_not_observable")
    sha = g2c.get("deploymentCommitSha")
    if not isinstance(sha, str) or not re.fullmatch("[0-9a-f]{40}", sha) or (
        source.get("repository") != "THEFEYA/feya-commerce" or
        source.get("gitEvent") != "push" or
        source.get("gitRef") != "refs/heads/main"
    ):
        raise ValueError("archive_github_identity_invalid")
    if not (revision.get("enforced") is True and revision.get("matched") is True and
            revision.get("expectedSha") == sha and revision.get("lastObservedSha") == sha and
            revision.get("lastStatus") == 200 and crawl.get("origin") == "https://thefeya.com"):
        raise ValueError("archive_deployment_revision_not_verified")
    product = crawl.get("productNoindex") or {}
    coverage = (g2c.get("coverage") or {}).get("productNoindex") or {}
    observations = product.get("observations")
    if not isinstance(observations, list) or not observations or (
        coverage.get("proof") != "PER_PATH_CI_RECEIPT" or
        coverage.get("perPathVerified") != len(observations)
    ):
        raise ValueError("archive_per_path_evidence_missing")

    # Never extract arbitrary ZIP filenames, and never overwrite an old proof.
    dest.mkdir(mode=0o700, parents=True, exist_ok=False)
    for name, content in verified.items():
        with (dest / name).open("xb") as f:
            f.write(content)
    (dest / "ZIP_SOURCE_SHA256.txt").write_text(actual + "\n", encoding="ascii")
    return {
        "sourceZipSha256": actual,
        "sourceCommit": sha,
        "workflowRunId": source.get("workflowRunId"),
        "indexRows": len(crawl.get("indexCandidates", [])),
        "productSampleRows": len(observations),
        "scope": "OFFLINE_SOURCE_ONLY_NOT_DB_OR_QA",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive_zip", type=Path)
    parser.add_argument("expected_sha256")
    parser.add_argument("output_directory", type=Path)
    args = parser.parse_args()
    result = verify_and_unpack(
        args.archive_zip, args.expected_sha256, args.output_directory)
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"G2C_OFFLINE_ARCHIVE_REJECTED:{exc}", file=sys.stderr)
        sys.exit(1)
