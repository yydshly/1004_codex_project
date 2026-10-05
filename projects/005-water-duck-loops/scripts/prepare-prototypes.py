"""Package the preserved in-chat prototypes as self-contained static web pages."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_CSS = """
:root{color-scheme:light;--background:#fff;--foreground:#183a4b;--blue:#238ee9;--green:#168647;--yellow:#ffda55;--orange:#e98424;--red:#d33847;--border:#d6e4eb;--muted-foreground:#566c79;--primary:#087c9e;--primary-foreground:#fff;--accent:#e1f1f6}
*{box-sizing:border-box}html,body{margin:0}body{padding:10px;background:var(--background);color:var(--foreground);font:16px/1.6 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default;opacity:.45}.viz-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px 14px}.viz-controls{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.viz-controls>.form-label{flex:1 1 220px;min-width:0}.form-label{display:block;font-size:14px}.form-select{display:block;width:100%;background:#fff;color:var(--foreground);border:1px solid var(--border);border-radius:5px;padding:8px;margin-top:6px}.form-range{display:block;width:100%;margin:12px 0;accent-color:var(--primary)}.btn{border:1px solid var(--border);border-radius:5px;background:#fff;color:var(--foreground);padding:7px 12px;line-height:1.5;min-height:38px;font-size:14px}.btn-primary,.btn[aria-pressed=true]{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.btn-ghost{background:transparent;border-color:transparent}.btn:hover:not(:disabled){background:var(--accent);color:var(--foreground)}.btn-primary:hover:not(:disabled),.btn[aria-pressed=true]:hover{background:#076886;color:#fff}.btn:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d48c00;outline-offset:3px}.text-small{font-size:13px}.text-muted{color:var(--muted-foreground)}.tabular-nums{font-variant-numeric:tabular-nums}.viz-badge{font-size:13px;background:var(--accent);color:var(--primary);border-radius:4px;padding:3px 8px}.cursor-interaction{cursor:crosshair}#duck-water-loop>.viz-row:first-child{font-size:14px}#duck-water-loop,#water-duck-playground{gap:10px}@media(pointer:coarse){.btn{min-height:44px}}@media(max-width:400px){body{padding:4px}.viz-row{gap:7px 10px}.btn{padding:7px 9px}#duck-water-loop>.viz-row:first-child{font-size:13px;gap:6px 10px}}
"""


def build(name: str, title: str, source: str, source_directory: str = "prototype-sources") -> None:
    fragment = (ROOT / source_directory / source).read_text(encoding="utf-8")
    # The static export owns a fixed light palette; host theme observation is unnecessary.
    fragment = fragment.replace(
        "  const observer=new MutationObserver(()=>{colors();draw();});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});\n",
        "",
    )
    fragment = fragment.replace(
        "  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{colors();draw();});\n",
        "",
    )
    if name in {"loop", "readable"}:
        pause_hook = """
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='water-research-visibility'&&!event.data.visible&&phase==='running'){phase='paused';sync();save();draw();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='running'){phase='paused';sync();save();draw();}});
"""
        fragment = fragment.replace("  window.addEventListener('openai:set_globals'", pause_hook + "  window.addEventListener('openai:set_globals'")
    # Only these two host APIs are used; provide device-local state in a normal browser.
    adapter = """
<script>
(() => {
  const key='water-duck-research-NAME-v1';
  let saved=null;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
  window.openai={widgetState:saved,setWidgetState(snapshot){this.widgetState=snapshot;try{localStorage.setItem(key,JSON.stringify(snapshot));}catch{}return Promise.resolve();}};
})();
</script>
""".replace("NAME", name)
    resize = """
<script>
(() => {
  let last=0;
  const resize=()=>{const height=Math.ceil(document.body.getBoundingClientRect().height);if(height!==last){last=height;parent.postMessage({type:'water-research-height',height},location.origin);}};
  new ResizeObserver(resize).observe(document.body);window.addEventListener('load',resize);resize();
})();
</script>
"""
    document = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><link rel="icon" href="../../assets/favicon.svg"><style>{BASE_CSS}</style></head><body>{adapter}{fragment}{resize}</body></html>
"""
    destination = ROOT / "demo" / "prototypes" / name / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(document, encoding="utf-8", newline="\n")
    if name == "reservoir":
        (destination.parent / "core.js").write_text(
            (ROOT / "experiments" / "reservoir-core.js").read_text(encoding="utf-8"),
            encoding="utf-8", newline="\n",
        )
    print(destination.relative_to(ROOT))


if __name__ == "__main__":
    build("loop", "循环挑战 · 水与鸭子研究", "loop.fragment.html")
    build("lab", "自由玩水 · 水与鸭子研究", "lab.fragment.html")
    build("readable", "可读水流 V3 · 水与鸭子研究", "loop-readable.fragment.html", "experiments")
    build("reservoir", "蓄水救援 V4 · 水与鸭子研究", "reservoir-rescue.fragment.html", "experiments")
