import { readFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const pins = {
  'src/remote/brsp.js':'7f28058297388a128e3acfc146248b627921d4629b8f3a575d80d3f6ff0b6911',
  'src/remote/vdo-ninja-transport.js':'af5a3c627204bd567422f1553d3952aa3659d57a4f45ace8b231d232dc719c14',
  'public/vendor/vdoninja/1.5.5/vdoninja-sdk.min.js':'390ea6c8b1a4e57bf7fa18ff2b394f25cc79e637130f97e4a29ca958a90fac77',
  'public/vendor/vdoninja/1.5.5/vdoninja-sdk.js':'8097d5420d7ed2426623d7ff08f6abd45f03f89e6540a6cc4b86bcdc057d841e',
  'public/vendor/vdoninja/1.5.5/LICENSE-MPL-2.0.txt':'3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04',
  'public/media/jona.mp4':'cc2f0c97487756862aaa21ab8662a1be6cb864a4eb8429c3dd30c43ddf1f53ad'
};
for (const [path,hash] of Object.entries(pins)) {
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,path+' hash mismatch');
}
assert.ok(statSync('public/media/jona.mp4').size<100*1024*1024,'MP4 exceeds GitHub regular-file limit');
assert.deepEqual(readdirSync('public/media').sort(),['jona.mp4'],'Only authorized media may ship');
for(const name of ['pretext-MIT.txt','qrcode-MIT.txt','three-MIT.txt'])assert.ok(statSync('public/licenses/'+name).size>0,'Missing license '+name);
const media=readFileSync('public/media/jona.mp4');
assert.ok(media.indexOf(Buffer.from('moov'))<media.indexOf(Buffer.from('mdat')),'MP4 must support fast-start');
console.log('Verified exact BRSP/VDO source, licenses, authorized Jona bytes, fast-start and file size.');
