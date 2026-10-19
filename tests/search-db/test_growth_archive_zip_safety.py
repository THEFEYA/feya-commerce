import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
import zipfile

HERE = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "growth_zip_safety", HERE / "scripts" / "verify_growth_archive_zip.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

SHA = "533bc8e40f2fd1a9464495134459afde9308bd7d"


def minimal_payloads():
    return {
        "phase12-production-origin-crawl.json": {
            "origin": "https://thefeya.com",
            "indexCandidates": [{"path": "/", "status": 200}],
            "productNoindex": {"observations": [{"path": "/shop/a", "status": 200}]},
        },
        "phase13-production-revision-gate.json": {
            "enforced": True, "matched": True, "expectedSha": SHA,
            "lastObservedSha": SHA, "lastStatus": 200,
        },
        "phase13-shop-origin-smoke.json": {"checked": 1},
        "phase13-public-pdp-copy-postflight.json": {"checked": 1},
        "phase13-collection-origin-smoke.json": {"checked": 1},
        "growth-g2c-origin-observation.json": {
            "schema": "FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1",
            "verdict": "PRODUCTION_HTTP_OBSERVED", "evidenceLevel": "L0_OBSERVATION",
            "deploymentCommitSha": SHA,
            "source": {"repository": "THEFEYA/feya-commerce",
                       "gitEvent": "push", "gitRef": "refs/heads/main",
                       "workflowRunId": "39180879535"},
            "coverage": {"productNoindex": {"proof": "PER_PATH_CI_RECEIPT",
                                            "perPathVerified": 1}},
        },
    }


def make_zip(contents, names=None, bad_symlink=False):
    raw = io.BytesIO()
    with zipfile.ZipFile(raw, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for i, (name, data) in enumerate(contents.items()):
            source_name = name if names is None else names.get(name, name)
            z = zipfile.ZipInfo(source_name)
            z.compress_type = zipfile.ZIP_DEFLATED
            if bad_symlink and i == 0:
                z.create_system = 3
                z.external_attr = (stat.S_IFLNK | 0o777) << 16
            else:
                z.create_system = 3
                z.external_attr = (stat.S_IFREG | 0o600) << 16
            body = data if isinstance(data, bytes) else json.dumps(data).encode()
            archive.writestr(z, body)
    return raw.getvalue()


class TestG2cZipSafety(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.payloads = minimal_payloads()

    def tearDown(self):
        self.tmp.cleanup()

    def attempt(self, blob, correct_digest=True):
        source = self.root / "source.zip"
        source.write_bytes(blob)
        digest = hashlib.sha256(blob).hexdigest()
        return MODULE.verify_and_unpack(
            source, digest if correct_digest else "f" * 64, self.root / "out")

    def test_valid_source_has_exact_provenance_and_exclusive_extraction(self):
        raw = make_zip(self.payloads)
        result = self.attempt(raw)
        self.assertEqual(result["sourceCommit"], SHA)
        self.assertEqual(result["indexRows"], 1)
        self.assertEqual(result["productSampleRows"], 1)
        self.assertEqual(result["scope"], "OFFLINE_SOURCE_ONLY_NOT_DB_OR_QA")
        self.assertEqual(set(self.root.joinpath("out").iterdir()).__len__(), 7)
        with self.assertRaises(FileExistsError):
            self.attempt(raw)

    def test_wrong_digest_fails_before_creating_dir(self):
        with self.assertRaisesRegex(ValueError, "sha256_mismatch"):
            self.attempt(make_zip(self.payloads), correct_digest=False)
        self.assertFalse((self.root / "out").exists())

    def test_extra_path_traversal_is_rejected(self):
        data = {**self.payloads, "../escape.txt": b"malicious"}
        with self.assertRaisesRegex(ValueError, "unexpected_archive_entry_set"):
            self.attempt(make_zip(data))
        self.assertFalse((self.root / "out").exists())

    def test_missing_required_json_fails(self):
        data = dict(self.payloads)
        data.pop("growth-g2c-origin-observation.json")
        with self.assertRaisesRegex(ValueError, "unexpected_archive_entry_set"):
            self.attempt(make_zip(data))

    def test_zip_symlink_entry_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "archive_dir_encryption_or_symlink"):
            self.attempt(make_zip(self.payloads, bad_symlink=True))

    def test_invalid_json_file_is_rejected(self):
        data = dict(self.payloads)
        data["phase13-shop-origin-smoke.json"] = b"{BAD"
        with self.assertRaisesRegex(ValueError, "archive_invalid_json"):
            self.attempt(make_zip(data))

    def test_forged_github_ref_is_rejected(self):
        data = minimal_payloads()
        data["growth-g2c-origin-observation.json"]["source"]["gitRef"] = "refs/pull/186/merge"
        with self.assertRaisesRegex(ValueError, "archive_github_identity_invalid"):
            self.attempt(make_zip(data))

    def test_forged_production_sha_is_rejected(self):
        data = minimal_payloads()
        data["phase13-production-revision-gate.json"]["lastObservedSha"] = "f" * 40
        with self.assertRaisesRegex(ValueError, "archive_deployment_revision_not_verified"):
            self.attempt(make_zip(data))

    def test_missing_per_path_product_observation_fails(self):
        data = minimal_payloads()
        data["phase12-production-origin-crawl.json"]["productNoindex"]["observations"] = []
        with self.assertRaisesRegex(ValueError, "archive_per_path_evidence_missing"):
            self.attempt(make_zip(data))

    def test_excessive_expansion_ratio_is_rejected(self):
        data = minimal_payloads()
        data["phase13-shop-origin-smoke.json"] = {"padding": "x" * 120_000}
        with self.assertRaisesRegex(ValueError, "archive_expansion_ratio_limit"):
            self.attempt(make_zip(data))

    def test_unknown_run_does_not_self_authenticate_source(self):
        raw = make_zip(self.payloads)
        result = self.attempt(raw)
        self.assertNotIn("independentHumanQaConfirmed", result)
        self.assertNotIn("businessOutcomeMeasured", result)


if __name__ == "__main__":
    unittest.main()
