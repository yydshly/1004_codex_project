"""Catalog compatibility, readable index, and publication regression checks."""

import base64
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

import catalog


class CatalogHTMLParser(HTMLParser):
    """Read rendered cells and links without relying on whitespace or CSS."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = 0
        self.rows = []
        self.links = []
        self.tags = []
        self.row = None
        self.cell = None
        self.link = None
        self.strong = None

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        if tag == "table":
            self.tables += 1
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.cell = {"tag": tag, "parts": [], "links": [], "strong": []}
        elif tag == "br" and self.cell is not None:
            self.cell["parts"].append("\n")
        elif tag == "a":
            self.link = {"href": dict(attrs).get("href"), "parts": []}
            self.links.append(self.link)
            if self.cell is not None:
                self.cell["links"].append(self.link)
        elif tag == "strong" and self.cell is not None:
            self.strong = []

    def handle_endtag(self, tag):
        if tag == "a" and self.link is not None:
            self.link["text"] = "".join(self.link.pop("parts"))
            self.link = None
        elif tag == "strong" and self.strong is not None:
            self.cell["strong"].append("".join(self.strong))
            self.strong = None
        elif tag in ("td", "th") and self.cell is not None:
            self.cell["text"] = "".join(self.cell.pop("parts"))
            self.row.append(self.cell)
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell["parts"].append(data)
        if self.link is not None:
            self.link["parts"].append(data)
        if self.strong is not None:
            self.strong.append(data)


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

    def write_projects(self, *projects):
        for project in projects:
            directory = self.root / "projects" / catalog.project_id(project)
            directory.mkdir(parents=True, exist_ok=True)
            for name in ("README.md", "notes.md"):
                (directory / name).write_text("Research\n", encoding="utf-8")
        (self.root / "projects.json").write_text(
            json.dumps({"version": 1, "projects": list(projects)}), encoding="utf-8"
        )

    def write_project(self, project):
        self.write_projects(project)

    def project(self, **overrides):
        project = dict(number=1, slug="code-project", name="研究对象", summary="完整研究摘要",
                       repository="https://github.com/owner/repo", status="研究中",
                       tags=["源码研究"], cover="", demo_url="")
        project.update(overrides)
        return project

    def write_demo(self, project, files=None):
        directory = self.root / "projects" / catalog.project_id(project) / "demo"
        files = files or {"index.html": b"<!doctype html><html><body>Demo</body></html>"}
        for name, content in files.items():
            path = directory / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)

    def block(self, readme, name):
        start, end = f"<!-- {name}:START -->", f"<!-- {name}:END -->"
        self.assertEqual(readme.count(start), 1)
        self.assertEqual(readme.count(end), 1)
        return readme.split(start, 1)[1].split(end, 1)[0]

    def index(self, readme=None):
        if readme is None:
            readme = (self.root / "README.md").read_text(encoding="utf-8")
        parser = CatalogHTMLParser()
        parser.feed(self.block(readme, "PROJECT_INDEX"))
        parser.close()
        return parser

    def sync(self):
        result = self.cli("sync")
        self.assertEqual(result.returncode, 0, result.stderr)
        return (self.root / "README.md").read_text(encoding="utf-8")

    def snapshot(self):
        return {path.relative_to(self.root).as_posix(): path.read_bytes()
                for path in self.root.rglob("*") if path.is_file()}

    def test_existing_repository_record_stays_compatible(self):
        project = self.add("code-project", "--repo", "https://github.com/owner/repo.git/")
        self.assertEqual(set(project), catalog.FIELDS)
        self.assertEqual(project["repository"], "https://github.com/owner/repo")
        self.assertNotIn("source_url", project)
        readme = (self.root / "README.md").read_text(encoding="utf-8")
        self.assertIn("[owner/repo](https://github.com/owner/repo)", readme)
        self.assertIn({"href": "https://github.com/owner/repo", "text": "上游仓库"},
                      self.index(readme).rows[1][2]["links"])
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
        self.assertIn({"href": "https://x.com/protopop", "text": "研究来源"},
                      self.index(readme).rows[2][2]["links"])
        page = (self.root / "site/index.html").read_text(encoding="utf-8")
        self.assertIn('href="https://x.com/protopop">研究来源 ↗', page)
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

    def test_index_has_three_columns_in_number_order_with_short_links(self):
        last = self.project(number=8, slug="last-project", name="最后一个项目")
        first = self.project(number=1, slug="first-project", name="第一个项目")
        source = self.project(number=3, slug="public-source", repository="",
                              source_url="https://example.org/research/very-long-source-path")
        self.write_projects(last, source, first)
        parser = self.index(self.sync())
        self.assertEqual(parser.tables, 1)
        self.assertEqual(len(parser.rows), 4)
        self.assertEqual([cell["tag"] for cell in parser.rows[0]], ["th"] * 3)
        headings = [cell["text"] for cell in parser.rows[0]]
        self.assertEqual(headings[0], "项目")
        self.assertIn(headings[1], ("摘要", "完整摘要"))
        self.assertEqual(headings[2], "入口")
        for row in parser.rows[1:]:
            self.assertEqual(len(row), 3)
            self.assertEqual([cell["tag"] for cell in row], ["td"] * 3)
        self.assertEqual([row[0]["text"][:3] for row in parser.rows[1:]],
                         ["001", "003", "008"])
        for project, row in zip((first, source, last), parser.rows[1:]):
            path = f"projects/{catalog.project_id(project)}/README.md"
            self.assertEqual(row[0]["links"], [{"href": path, "text": project["name"]}])
            self.assertEqual(row[2]["links"][0], {"href": path, "text": "研究记录"})
            self.assertNotIn("https://", row[2]["text"])
            self.assertIn("网页待准备", row[2]["text"])
        self.assertEqual(parser.rows[2][2]["links"][1],
                         {"href": source["source_url"], "text": "研究来源"})

    def test_structured_summary_keeps_order_and_escapes_all_text_and_hrefs(self):
        labels = ("能力", "原理", "使用场景", "价值", "边界")
        texts = (
            '输入 <DEM> & </td><script>alert("x")</script> | 完整*正文',
            '机制 "太阳" & 点云 > 地形',
            "用于 [导览] 与 `地图`，保留全部说明。",
            "可复用_资产_与 {记录}，不截断长文本。",
            "未测量；<img src='x'> 是文字，不是图片。",
        )
        source = "https://example.org/research?lang=zh&version=2"
        webpage = "https://example.net/view?theme=light&item=1"
        project = self.project(name='项目 <b>名称</b> & "引号"',
                               tags=["<tag> & 标签", "3DGS | 重建"], repository="",
                               source_url=source, demo_url=webpage,
                               summary_sections=dict(reversed(list(zip(labels, texts)))))
        self.write_project(project)
        readme = self.sync()
        parser = self.index(readme)
        self.assertEqual(len(parser.rows), 2)
        self.assertEqual(len(parser.rows[1]), 3)
        summary = parser.rows[1][1]
        self.assertEqual(summary["strong"], [label + "：" for label in labels])
        self.assertEqual(summary["text"], "\n".join(
            label + "：" + text for label, text in zip(labels, texts)))
        self.assertEqual(parser.rows[1][0]["links"][0]["text"], project["name"])
        for tag in project["tags"]:
            self.assertIn(tag, parser.rows[1][0]["text"])
        self.assertNotIn("script", parser.tags)
        self.assertNotIn("img", parser.tags)
        self.assertNotIn("b", parser.tags)
        self.assertIn({"href": webpage, "text": "研究网页"}, parser.rows[1][2]["links"])
        self.assertIn({"href": source, "text": "研究来源"}, parser.rows[1][2]["links"])
        index = self.block(readme, "PROJECT_INDEX")
        self.assertIn('href="https://example.net/view?theme=light&amp;item=1"', index)
        self.assertIn('href="https://example.org/research?lang=zh&amp;version=2"', index)
        self.assertIn("&lt;/td&gt;&lt;script&gt;", index)
        gallery = self.block(readme, "PROJECT_GALLERY")
        self.assertEqual([gallery.index(f"**{label}：**") for label in labels],
                         sorted(gallery.index(f"**{label}：**") for label in labels))
        self.assertIn('输入 \\<DEM\\> & \\</td\\>\\<script\\>alert("x")\\</script\\> \\| 完整\\*正文', gallery)
        self.assertIn("未测量；\\<img src='x'\\> 是文字，不是图片。", gallery)

    def test_legacy_summary_remains_complete_without_structured_fields(self):
        summary = '原始全文 <DEM> & "quotes" | **保留**，继续保留尾部事实。'
        project = self.project(summary=summary)
        self.write_project(project)
        readme = self.sync()
        self.assertNotIn("summary_sections", catalog.load_projects(self.root)[0])
        cell = self.index(readme).rows[1][1]
        self.assertEqual(cell["text"], summary)
        self.assertEqual(cell["strong"], [])
        gallery = self.block(readme, "PROJECT_GALLERY")
        self.assertIn('原始全文 \\<DEM\\> & "quotes" \\| \\*\\*保留\\*\\*，继续保留尾部事实。', gallery)
        page = (self.root / "site/index.html").read_text(encoding="utf-8")
        self.assertIn('原始全文 &lt;DEM&gt; &amp; &quot;quotes&quot; | **保留**，继续保留尾部事实。', page)
        result = self.cli("check")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_static_demo_uses_real_pages_url_in_readme_gallery_and_site(self):
        project = self.project()
        self.write_project(project)
        self.write_demo(project)
        readme = self.sync()
        expected = "https://yydshly.github.io/1004_codex_project/demos/001-code-project/"
        self.assertIn({"href": expected, "text": "研究网页"},
                      self.index(readme).rows[1][2]["links"])
        self.assertIn(f"[研究网页]({expected})", self.block(readme, "PROJECT_GALLERY"))
        page = (self.root / "site/index.html").read_text(encoding="utf-8")
        self.assertIn(f'href="{expected}">研究网页 ↗', page)
        self.assertNotIn('href="site/demos/', self.block(readme, "PROJECT_INDEX"))
        self.assertEqual(catalog.load_projects(self.root)[0]["demo_url"], "")

    def test_explicit_external_webpage_takes_priority_over_local_demo(self):
        project = self.project(demo_url="https://example.net/external?view=map&lang=zh")
        self.write_project(project)
        self.write_demo(project)
        parser = self.index(self.sync())
        self.assertIn({"href": project["demo_url"], "text": "研究网页"},
                      parser.rows[1][2]["links"])
        self.assertFalse(any(link["href"].startswith(catalog.PAGES_URL)
                             for link in parser.rows[1][2]["links"]))
        self.assertTrue((self.root / "site/demos/001-code-project/index.html").is_file())

    def test_same_site_nested_entry_and_query_are_preserved(self):
        href = "https://yydshly.github.io/1004_codex_project/demos/001-code-project/guide/index.html?view=map&lang=zh"
        project = self.project(demo_url=href)
        self.write_project(project)
        self.write_demo(project, {"index.html": b"root", "guide/index.html": b"guide"})
        readme = self.sync()
        self.assertIn({"href": href, "text": "研究网页"},
                      self.index(readme).rows[1][2]["links"])
        self.assertEqual((self.root / "site/demos/001-code-project/guide/index.html").read_bytes(), b"guide")

    def test_wrong_project_and_missing_same_site_entry_refuse_publication(self):
        project = self.project()
        self.write_project(project)
        self.write_demo(project)
        prefix = "https://yydshly.github.io/1004_codex_project/demos/"
        cases = ((prefix + "002-other-project/", "本项目"),
                 (prefix + "001-code-project/missing.html", "入口缺少静态文件"))
        for href, message in cases:
            with self.subTest(href=href):
                project["demo_url"] = href
                self.write_project(project)
                before = self.snapshot()
                result = self.cli("sync")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)
                self.assertEqual(self.snapshot(), before)

    def test_same_site_webpage_without_static_files_is_rejected(self):
        project = self.project(demo_url="https://yydshly.github.io/1004_codex_project/demos/001-code-project/")
        self.write_project(project)
        before = self.snapshot()
        result = self.cli("sync")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("入口缺少静态文件: index.html", result.stderr)
        self.assertEqual(self.snapshot(), before)

    def test_structured_summary_schema_rejects_missing_extra_and_invalid_values(self):
        valid = {label: f"{label}正文" for label in ("能力", "原理", "使用场景", "价值", "边界")}
        cases = [None, [], {}, {key: value for key, value in valid.items() if key != "边界"},
                 dict(valid, 额外="不允许")]
        cases.extend(dict(valid, 能力=value) for value in (None, 42, "", " 首尾空格 ", "换\n行"))
        for sections in cases:
            with self.subTest(sections=sections):
                project = self.project(summary_sections=sections)
                self.write_project(project)
                before = self.snapshot()
                with self.assertRaisesRegex(ValueError, "summary_sections"):
                    catalog.load_projects(self.root)
                result = self.cli("sync")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("summary_sections", result.stderr)
                self.assertEqual(self.snapshot(), before)

    def test_sync_is_idempotent_and_keeps_gallery_source_and_static_resources(self):
        project = self.project(cover="assets/tiny.png", summary="完整旧摘要，包含必须保留的最后一句。")
        self.write_project(project)
        base = self.root / "projects/001-code-project"
        cover = base / "assets/tiny.png"
        cover.parent.mkdir()
        png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7xkAAAAASUVORK5CYII=")
        cover.write_bytes(png)
        demo = {"index.html": b'<img src="images/tiny.png"><script src="app.js"></script>',
                "images/tiny.png": png, "app.js": b"document.title = 'tiny demo';"}
        self.write_demo(project, demo)
        root_readme = self.root / "README.md"
        root_readme.write_text(root_readme.read_text(encoding="utf-8") + "\n手写说明必须保留。\n",
                               encoding="utf-8")
        sources = {path: path.read_bytes() for path in (base / "README.md", base / "notes.md", cover)}
        registry = (self.root / "projects.json").read_bytes()
        readme = self.sync()
        self.assertIn("手写说明必须保留。", readme)
        gallery = self.block(readme, "PROJECT_GALLERY")
        self.assertIn(project["summary"], gallery)
        self.assertIn("projects/001-code-project/assets/tiny.png", gallery)
        self.assertEqual((self.root / "site/covers/001-code-project/tiny.png").read_bytes(), png)
        for name, data in demo.items():
            self.assertEqual((self.root / "site/demos/001-code-project" / name).read_bytes(), data)
        self.assertEqual((self.root / "projects.json").read_bytes(), registry)
        for path, data in sources.items():
            self.assertEqual(path.read_bytes(), data)
        generated = self.snapshot()
        result = self.cli("check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.snapshot(), generated)
        self.sync()
        self.assertEqual(self.snapshot(), generated)


if __name__ == "__main__":
    unittest.main()
