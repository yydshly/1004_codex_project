import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo');
const args = process.argv.slice(2);
const arg = (key, fallback) => { const i=args.indexOf(key); return i<0 ? fallback : args[i+1]; };
const port = Number(arg('--port','8033'));
const host = arg('--host','127.0.0.1');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!relative || relative.endsWith('/')) relative+='index.html';
    const target=path.resolve(root,relative);
    if(target!==root && !target.startsWith(root+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(target)).isFile()) throw new Error('Not a file');
    const bytes=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`Nature prototype: http://${host}:${port}/`));
