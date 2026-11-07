import { createReadStream } from 'node:fs';
import { copyFile, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const source = process.env.JONA_SOURCE_MEDIA;
if (source) {
  const { sourceQuality, ...provenance } = JSON.parse(await readFile('public/media-provenance.json', 'utf8'));
  assert.equal((await stat(source)).size, sourceQuality.sizeBytes, 'Unexpected Jona source-quality size');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(source)) hash.update(chunk);
  assert.equal(hash.digest('hex'), sourceQuality.sha256, 'Unexpected Jona source-quality SHA-256');

  await copyFile(source, 'dist/media/jona.mp4');
  await writeFile('dist/media-provenance.json', JSON.stringify({ ...provenance, ...sourceQuality }, null, 2) + '\n');
  console.log('Staged original-resolution Jona.');
}
