import fs from 'node:fs';
import path from 'node:path';
import yazl from 'yazl';

const out = path.resolve('tests/fixtures/mockups');
fs.mkdirSync(out, { recursive: true });

function build(name: string, files: { name: string; content: string | Buffer }[]) {
  const z = new yazl.ZipFile();
  for (const f of files) {
    const buf = typeof f.content === 'string' ? Buffer.from(f.content) : f.content;
    z.addBuffer(buf, f.name);
  }
  z.end();
  return new Promise<void>((res) => {
    const stream = fs.createWriteStream(path.join(out, name));
    z.outputStream.pipe(stream).on('close', () => res());
  });
}

await build('valid-simple.zip', [
  { name: 'index.html', content: '<html><body>hi</body></html>' },
  { name: 'app.js', content: 'console.log("hi");' },
]);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
await build('with-thumbnail.zip', [
  { name: 'index.html', content: '<html></html>' },
  { name: 'thumbnail.png', content: PNG_MAGIC },
]);

console.log('fixtures built');
