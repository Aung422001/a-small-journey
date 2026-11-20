import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/game.js', ['game.js', 'text/javascript']],
  ['/model.js', ['model.js', 'text/javascript']]
]);
const port = Number(process.env.PORT || 3000);
const server = createServer(async (req, res) => {
  const file = files.get(req.url?.split('?')[0]);
  if (!file || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  try {
    const content = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Unable to load the game file. Check the server terminal.');
  }
});
server.on('error', error => { console.error(`Could not start the game: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`A Small Journey is ready at http://localhost:${port}`));
