"""Focused compatibility checks for repository and public-source research."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import catalog


class CatalogSourceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="catalog-source-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "README.md").write_text(
            "# Research\n\n<!-- PROJECT_INDEX:START -->\n<!-- PROJECT_INDEX:END -->\n"
            "\n<!-- PROJECT_GALLERY:START -->\n<!-- PROJECT_GALLERY:END -->\n",
            encoding="utf-8",
        )
        (self.root / "projects.json").write_text(
            '{"version": 1, "projects": []}\n', encoding="utf-8"
        )
        shutil.copytree(catalog.ROOT / "templates/project", self.root / "templates/project")

    def cli(self, *arguments):
        return subprocess.run(
            [sys.executable, "-B", str(catalog.ROOT / "scripts/catalog.py"),
             "--root", str(self.root), *arguments],
            capture_output=True, text=True, encoding="utf-8", check=False,
        )

    def add(self, slug, *source_arguments):
        result = self.cli("add", "--slug", slug, "--name", "研究对象",
                          "--summary", "研究摘要", *source_arguments)
        self.assertEqual(result.returncode, 0, result.stderr)
        return catalog.load_projects(self.root)[-1]

    def write_project(self, project):
        directory = self.root / "projects" / catalog.project_id(project)
        directory.mkdir(parents=True, exist_ok=True)
        for name in ("README.md", "notes.md"):
            (directory / name).write_text("Research\n", encoding="utf-8")
        (self.root / "projects.json").write_text(
            json.dumps({"version": 1, "projects": [project]}), encoding="utf-8"
        )

    def test_existing_repository_record_stays_compatible(self):
        project = self.add("code-project", "--repo", "https://github.com/owner/repo.git/")
        self.assertEqual(set(project), catalog.FIELDS)
        self.assertEqual(project["repository"], "https://github.com/owner/repo")
        self.assertNotIn("source_url", project)
        readme = (self.root / "README.md").read_text(encoding="utf-8")
        self.assertIn("[owner/repo](https://github.com/owner/repo)", readme)
        result = self.cli("check")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_source_project_adds_next_number_and_renders_real_links(self):
        self.add("code-project", "--repo", "https://github.com/owner/repo")
        project = self.add("product-project", "--source", "https://x.com/protopop")
        self.assertEqual(project["number"], 2)
        self.assertEqual(project["repository"], "")
        self.assertEqual(project["source_url"], "https://x.com/protopop")
        readme = (self.root / "README.md").read_text(encoding="utf-8")
        self.assertIn("[x.com/protopop](https://x.com/protopop)", readme)
        page = (self.root / "site/index.html").read_text(encoding="utf-8")
        self.assertIn('href="https://x.com/protopop">x.com/protopop ↗', page)
        for name in ("README.md", "notes.md"):
            content = (self.root / "projects/002-product-project" / name).read_text(encoding="utf-8")
            self.assertIn("[研究来源](https://x.com/protopop)", content)
            self.assertNotIn("{{", content)
            self.assertNotIn("[上游仓库]()", content)
        result = self.cli("check")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_or_invalid_source_does_not_create_project(self):
        registry = (self.root / "projects.json").read_bytes()
        for source in ("javascript:alert(1)", "https://user:password@example.com/product", ""):
            with self.subTest(source=source):
                result = self.cli("add", "--slug", "invalid-project", "--name", "研究对象",
                                  "--summary", "研究摘要", "--source", source)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.root / "projects.json").read_bytes(), registry)
                self.assertFalse((self.root / "projects").exists())

    def test_source_options_are_required_and_mutually_exclusive(self):
        arguments = ("add", "--slug", "product-project", "--name", "研究对象", "--summary", "研究摘要")
        for extra in ((), ("--repo", "https://github.com/owner/repo", "--source", "https://x.com/protopop")):
            with self.subTest(extra=extra):
                result = self.cli(*arguments, *extra)
                self.assertEqual(result.returncode, 2)
                self.assertFalse((self.root / "projects").exists())

    def test_registry_requires_valid_source_for_empty_repository(self):
        project = dict(number=1, slug="product-project", name="Product", summary="Research",
                       repository="", status="研究中", tags=[], cover="", demo_url="")
        self.write_project(project)
        with self.assertRaisesRegex(ValueError, "source_url"):
            catalog.load_projects(self.root)
        for value in (None, "ftp://example.com/product"):
            with self.subTest(value=value):
                project["source_url"] = value
                self.write_project(project)
                with self.assertRaises(ValueError):
                    catalog.load_projects(self.root)
        project["source_url"] = "https://example.com/product"
        self.write_project(project)
        self.assertEqual(catalog.load_projects(self.root), [project])
        project["unexpected"] = "field"
        self.write_project(project)
        with self.assertRaisesRegex(ValueError, "字段"):
            catalog.load_projects(self.root)


if __name__ == "__main__":
    unittest.main()
