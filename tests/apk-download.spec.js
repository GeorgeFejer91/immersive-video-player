import { test,expect } from '@playwright/test';
import { createHash } from 'node:crypto';

test('optional launcher APK remains available by direct URL with its reviewed bytes',async({request})=>{
  const response=await request.get('./downloads/ImmersiveVideoPlayer-Quest.apk');
  expect(response.ok()).toBe(true);
  const bytes=await response.body();expect(bytes.length).toBe(12768);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('af07861c7de91b344496e166bde18bd010fa863f620963fc1851d1819a2a7843');
});
