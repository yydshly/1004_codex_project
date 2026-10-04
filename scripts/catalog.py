#!/usr/bin/env python3
"""Manage the ordered research catalog using only the Python standard library."""

import argparse
import html
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
STATUSES = ("待研究", "研究中", "已复现", "已完成", "已归档")
FIELDS = {"number", "slug", "name", "summary", "repository", "status", "tags", "cover", "demo_url"}
BLOCKS = ("PROJECT_INDEX", "PROJECT_GALLERY")
MANAGED_DIRS = ("site/demos", "site/covers")
FORBIDDEN_NAMES = {"node_modules", "__pycache__", "venv"}


def project_id(project):
    return f"{project['number']:03d}-{project['slug']}"


def inside(root, relative):
    """Refuse escaping paths and linked files, including Windows junctions."""
    path = root / relative
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()) or resolved != path.absolute():
        raise ValueError(f"路径必须位于本目录内且不能使用链接: {relative}")
    return path


def valid_text(value, label, empty=False):
    if not isinstance(value, str) or value != value.strip() or any(ord(c) < 32 for c in value):
        raise ValueError(f"{label} 必须为不含换行、首尾空格的文本")
    if not empty and not value:
        raise ValueError(f"{label} 不能为空")


def valid_url(value, label, repository=False):
    valid_text(value, label)
    parsed = urlsplit(value)
    if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"{label} 必须为 HTTP(S) 地址，不能包含登录凭据")
    if any(c.isspace() or c in '<>"\\' for c in value):
        raise ValueError(f"{label} 包含无效字符")
    if repository and (parsed.scheme != "https" or parsed.netloc != "github.com" or
                       not re.fullmatch(r"/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", parsed.path) or
                       parsed.query or parsed.fragment):
        raise ValueError("repository 必须为 https://github.com/owner/repo 格式")


def load_projects(root):
    data = json.loads(inside(root, "projects.json").read_text(encoding="utf-8"))
    if not isinstance(data, dict) or set(data) != {"version", "projects"} or type(data["version"]) is not int or data["version"] != 1:
        raise ValueError("projects.json 顶层必须包含 version: 1 和 projects 数组")
    if not isinstance(data["projects"], list):
        raise ValueError("projects 必须为数组")
    numbers, slugs = set(), set()
    for project in data["projects"]:
        if not isinstance(project, dict) or set(project) != FIELDS:
            raise ValueError(f"项目字段必须为: {', '.join(sorted(FIELDS))}")
        number, slug = project["number"], project["slug"]
        if type(number) is not int or number < 1 or number in numbers:
            raise ValueError("number 必须为唯一正整数")
        if not isinstance(slug, str) or len(slug) > 64 or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs:
            raise ValueError("slug 必须唯一，由小写字母、数字、单个连字符组成，最长 64 字符")
        numbers.add(number)
        slugs.add(slug)
        for field in ("name", "summary", "status", "repository"):
            valid_text(project[field], field)
        if project["status"] not in STATUSES:
            raise ValueError(f"status 必须为: {', '.join(STATUSES)}")
        valid_url(project["repository"], "repository", repository=True)
        if not isinstance(project["tags"], list):
            raise ValueError("tags 必须为不重复的文本数组")
        for tag in project["tags"]:
            valid_text(tag, "tag")
        if len(set(project["tags"])) != len(project["tags"]):
            raise ValueError("tags 必须为不重复的文本数组")
        valid_text(project["cover"], "cover", empty=True)
        valid_text(project["demo_url"], "demo_url", empty=True)
        if project["demo_url"]:
            valid_url(project["demo_url"], "demo_url")
        base = inside(root, f"projects/{project_id(project)}")
        if not inside(base, "README.md").is_file() or not inside(base, "notes.md").is_file():
            raise ValueError(f"{base.relative_to(root)} 缺少 README.md 或 notes.md")
        if project["cover"]:
            cover = project["cover"]
            if not cover.startswith("assets/") or "\\" in cover or any(p in (".", "..", "") for p in cover.split("/")):
                raise ValueError("cover 必须为 assets/ 下的相对路径")
            if Path(cover).suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"):
                raise ValueError("cover 必须为 PNG/JPEG/WebP/GIF/SVG 图片")
            if not inside(base, cover).is_file():
                raise ValueError(f"截图不存在: {base.relative_to(root)}/{cover}")
    return sorted(data["projects"], key=lambda project: project["number"])


def markdown(value):
    return re.sub(r"([\\`*_{}\[\]<>|])", r"\\\1", value)


def url(value):
    return quote(value, safe="/:#?&=%+-._~@")


def relative_url(value):
    return quote(value, safe="/-._~")


def demo_files(root, project):
    directory = inside(root, f"projects/{project_id(project)}/demo")
    if not directory.exists():
        return {}
    files = {}
    for entry in sorted(directory.rglob("*")):
        relative = entry.relative_to(directory)
        inside(directory, relative)
        if entry.name == ".gitkeep":
            continue
        if any(p.casefold() in FORBIDDEN_NAMES or p.startswith(".") or p.casefold().endswith((".pem", ".key")) for p in relative.parts):
            raise ValueError(f"demo 包含不能发布的文件: {entry.relative_to(root)}")
        if entry.is_file():
            files[relative.as_posix()] = entry.read_bytes()
    if files and "index.html" not in files:
        raise ValueError(f"{directory.relative_to(root)} 有文件但缺少 index.html；请放入静态构建产物")
    return files


def render(root, projects):
    outputs, rows, gallery, cards = {}, [], [], []
    for project in projects:
        identifier = project_id(project)
        project_path = f"projects/{identifier}"
        static_files = demo_files(root, project)
        for name, content in static_files.items():
            outputs[f"site/demos/{identifier}/{name}"] = content
        demo = project["demo_url"] or (f"demos/{identifier}/" if static_files else "")
        readme_demo = project["demo_url"] or (f"site/demos/{identifier}/index.html" if static_files else "")
        # Repository Markdown links to the checked-in demo source; Pages serves the live demo.
        demo_label = "Demo" if project["demo_url"] else "静态文件"
        readme_demo_href = url(readme_demo) if project["demo_url"] else relative_url(readme_demo)
        demo_link = f"[{demo_label}]({readme_demo_href})" if readme_demo else "—"
        tags = "、".join(project["tags"]) or "—"
        rows.append(f"| {project['number']:03d} | [{markdown(project['name'])}]({project_path}/README.md) | {markdown(project['summary'])} | {markdown(project['status'])} | {markdown(tags)} | [GitHub]({url(project['repository'])}) | {demo_link} |")
        gallery.append(f"### {project['number']:03d} · {markdown(project['name'])}\n\n{markdown(project['summary'])}\n\n[研究记录]({project_path}/README.md) · [原仓库]({url(project['repository'])})")
        cover_html = "<div class=\"cover empty\">截图待补充</div>"
        if project["cover"]:
            cover = project["cover"]
            gallery[-1] += f"\n\n![{markdown(project['name'])} 项目截图]({relative_url(project_path + '/' + cover)})"
            destination = f"covers/{identifier}/{Path(cover).name}"
            outputs[f"site/{destination}"] = inside(inside(root, project_path), cover).read_bytes()
            cover_html = f'<img class="cover" src="{html.escape(relative_url(destination), quote=True)}" alt="{html.escape(project["name"], quote=True)} 项目截图" loading="lazy">'
        else:
            gallery[-1] += "\n\n截图：待补充。"
        research_url = f"https://github.com/yydshly/1004_codex_project/blob/main/{project_path}/README.md"
        demo_href = url(demo) if project["demo_url"] else relative_url(demo)
        demo_html = f'<a href="{html.escape(demo_href, quote=True)}">打开 Demo ↗</a>' if demo else '<span class="muted">Demo 待补充</span>'
        cards.append(f'<article>{cover_html}<div class="content"><div class="meta">{project["number"]:03d} · {html.escape(project["status"])}</div><h2>{html.escape(project["name"])}</h2><p>{html.escape(project["summary"])}</p><p class="tags">{html.escape(tags)}</p><nav><a href="{research_url}">研究记录</a><a href="{html.escape(url(project["repository"]), quote=True)}">原仓库 ↗</a>{demo_html}</nav></div></article>')
    index = ("| 编号 | 子项目 | 摘要 | 状态 | 标签 | 原仓库 | Demo |\n"
             "| --- | --- | --- | --- | --- | --- | --- |\n" + "\n".join(rows)) if rows else "目前尚未录入研究项目。首个项目将从 **001** 开始，按编号升序展示。"
    gallery_text = "\n\n".join(gallery) if gallery else "录入子项目并添加真实截图后，这里会按编号展示项目摘要与图片。"
    readme = inside(root, "README.md").read_text(encoding="utf-8")
    for block, content in zip(BLOCKS, (index, gallery_text)):
        start, end = f"<!-- {block}:START -->", f"<!-- {block}:END -->"
        if readme.count(start) != 1 or readme.count(end) != 1 or readme.index(start) >= readme.index(end):
            raise ValueError(f"README.md 缺少或重复生成标记 {block}")
        begin = readme.index(start) + len(start)
        finish = readme.index(end)
        readme = readme[:begin] + "\n\n" + content + "\n\n" + readme[finish:]
    outputs["README.md"] = readme.replace("\r\n", "\n").encode("utf-8")
    body = "\n".join(cards) or '<div class="empty-state"><h2>从 001 开始记录</h2><p>研究目录已就绪。录入首个项目后，这里会展示摘要、截图与 Demo。</p></div>'
    page = f'''<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="优秀 GitHub 项目的研究记录、复现过程与 Web Demo 索引"><title>GitHub 项目研究目录</title>
<style>
:root{{color-scheme:light;--ink:#172a3a;--muted:#607080;--line:#dce4eb;--accent:#075c65}}*{{box-sizing:border-box}}body{{margin:0;background:#f4f7fa;color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}}main{{max-width:1120px;margin:auto;padding:64px 24px}}a{{color:var(--accent);text-underline-offset:4px}}a:focus-visible{{outline:3px solid #de8c34;outline-offset:4px}}header{{margin-bottom:36px}}.eyebrow,.meta{{font-size:13px;letter-spacing:.08em;color:var(--accent)}}h1{{font-size:clamp(30px,5vw,46px);line-height:1.2;margin:16px 0}}header p{{max-width:680px;color:var(--muted)}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}}article{{border:1px solid var(--line);border-radius:16px;background:white;overflow:hidden}}.cover{{display:block;width:100%;height:190px;object-fit:contain;background:#e8eef3}}.empty{{display:grid;place-items:center;color:var(--muted);font-size:14px}}.content{{padding:24px}}h2{{font-size:22px;margin:8px 0}}.content p{{margin:12px 0}}.tags,.muted{{color:var(--muted);font-size:13px}}nav{{display:flex;flex-wrap:wrap;gap:16px;font-size:14px;margin-top:24px}}.empty-state{{padding:48px 28px;background:white;border:1px dashed var(--line);border-radius:16px}}.empty-state p,footer{{color:var(--muted)}}footer{{margin-top:40px;font-size:13px}}@media(max-width:600px){{main{{padding:36px 18px}}}}
</style></head>
<body><main><header><div class="eyebrow">GITHUB RESEARCH / 有序记录 · 持续复现</div><h1>优秀项目，逐个研究。</h1><p>记录值得学习的 GitHub 项目，从源码阅读到本地复现，沉淀截图、结论与可体验的 Web Demo。</p><a href="https://github.com/yydshly/1004_codex_project">查看研究总仓库 ↗</a></header><section class="grid" aria-label="按编号升序排列的研究项目">{body}</section><footer>共 {len(projects)} 个研究项目 · 编号固定，按升序展示。</footer></main></body></html>
'''
    outputs["site/index.html"] = page.encode("utf-8")
    outputs["site/.nojekyll"] = b""
    return outputs


def stale_outputs(root, outputs):
    stale = []
    directory = inside(root, "site")
    if not directory.exists():
        return stale
    if not directory.is_dir():
        raise ValueError("site 必须为生成目录")
    for entry in directory.rglob("*"):
        relative = entry.relative_to(root).as_posix()
        inside(root, relative)
        if not entry.is_file() or relative in outputs:
            continue
        if not any(relative.startswith(managed + "/") for managed in MANAGED_DIRS):
            raise ValueError(f"site 只能保存工具生成的文件，请移走额外文件: {relative}")
        stale.append(entry)
    return stale


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".catalog-", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
        temporary.replace(path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def sync(root, check=False):
    projects = load_projects(root)
    outputs = render(root, projects)
    stale = stale_outputs(root, outputs)
    changed = [name for name, content in outputs.items()
               if not inside(root, name).is_file() or inside(root, name).read_bytes() != content]
    if check:
        if changed or stale:
            paths = changed + [entry.relative_to(root).as_posix() for entry in stale]
            raise ValueError("生成内容未同步，请运行 python scripts/catalog.py sync: " + ", ".join(paths))
        print(f"校验通过：{len(projects)} 个项目，编号、链接、图片与生成内容一致。")
        return
    backups, touched = {}, []
    for name in changed:
        path = inside(root, name)
        if path.exists() and not path.is_file():
            raise ValueError(f"生成目标不是文件: {name}")
        for parent in path.parents:
            if parent == root:
                break
            if parent.exists() and not parent.is_dir():
                raise ValueError(f"生成目标的父路径不是目录: {parent.relative_to(root)}")
        backups[name] = path.read_bytes() if path.exists() else None
    for path in stale:
        backups[path.relative_to(root).as_posix()] = path.read_bytes()
    try:
        for name in changed:
            atomic_write(inside(root, name), outputs[name])
            touched.append(name)
        for path in stale:
            path.unlink()
            touched.append(path.relative_to(root).as_posix())
    except OSError:
        for name in reversed(touched):
            path = inside(root, name)
            if backups[name] is None:
                path.unlink()
            else:
                atomic_write(path, backups[name])
        raise
    print(f"已同步 {len(projects)} 个项目；更新 {len(changed)} 个文件，清理 {len(stale)} 个过期生成文件。")


def add(root, args):
    projects = load_projects(root)
    # Validate the current catalog before mutating anything.
    render(root, projects)
    project = dict(number=max((p["number"] for p in projects), default=0) + 1,
                   slug=args.slug, name=args.name, summary=args.summary,
                   repository=args.repo.rstrip("/").removesuffix(".git"),
                   status=args.status, tags=args.tag, cover="", demo_url="")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug) or len(args.slug) > 64:
        raise ValueError("slug 必须由小写字母、数字、单个连字符组成，最长 64 字符")
    if any(p["slug"] == args.slug for p in projects):
        raise ValueError(f"slug 已存在: {args.slug}")
    for field in ("name", "summary"):
        valid_text(project[field], field)
    valid_url(project["repository"], "repository", repository=True)
    for tag in project["tags"]:
        valid_text(tag, "tag")
    if len(set(project["tags"])) != len(project["tags"]):
        raise ValueError("tag 不能重复")
    destination = inside(root, f"projects/{project_id(project)}")
    if destination.exists():
        raise ValueError(f"目录已存在: {destination.relative_to(root)}")
    replacements = {"NUMBER": f"{project['number']:03d}", "SLUG": project["slug"], "NAME": markdown(project["name"]),
                    "SUMMARY": markdown(project["summary"]), "REPOSITORY": url(project["repository"]), "PROJECT_ID": project_id(project)}
    templates = {}
    for filename in ("README.md", "notes.md"):
        content = inside(root, f"templates/project/{filename}").read_text(encoding="utf-8")
        for key, value in replacements.items():
            content = content.replace("{{" + key + "}}", value)
        if re.search(r"\{\{[A-Z_]+\}\}", content):
            raise ValueError(f"模板含未知变量: {filename}")
        templates[filename] = content
    registry_path = inside(root, "projects.json")
    original_registry = registry_path.read_bytes()
    try:
        destination.mkdir(parents=True)
        for filename, content in templates.items():
            (destination / filename).write_text(content, encoding="utf-8", newline="\n")
        for directory_name in ("assets", "demo"):
            (destination / directory_name).mkdir()
            (destination / directory_name / ".gitkeep").touch()
        data = {"version": 1, "projects": projects + [project]}
        atomic_write(registry_path, (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        sync(root)
    except Exception:
        try:
            if registry_path.read_bytes() != original_registry:
                atomic_write(registry_path, original_registry)
        finally:
            if destination.exists():
                shutil.rmtree(inside(root, destination.relative_to(root)))
        raise
    print(f"已创建 {destination.relative_to(root).as_posix()}；下一步填写研究记录并添加截图。")


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="创建子项目、同步有序索引及校验研究总库")
    parser.add_argument("--root", type=Path, default=ROOT, help=argparse.SUPPRESS)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("add", help="分配下一个编号并创建研究目录")
    create.add_argument("--slug", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--repo", required=True)
    create.add_argument("--summary", required=True)
    create.add_argument("--status", choices=STATUSES, default="待研究")
    create.add_argument("--tag", action="append", default=[])
    commands.add_parser("sync", help="生成 README 索引、图片卡片与静态站点")
    commands.add_parser("check", help="只读校验登记数据和生成内容")
    args = parser.parse_args()
    try:
        if args.command == "add":
            add(args.root.resolve(), args)
        else:
            sync(args.root.resolve(), check=args.command == "check")
    except (ValueError, OSError, TypeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
