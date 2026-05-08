import { describe, expect, it } from 'vitest';
import { assertValidFilebaseUpload, getFilebasePublicUrl } from '../src/lib/filebase-shared';

describe('filebase helpers', () => {
  it('accepts supported banner image uploads', () => {
    expect(
      assertValidFilebaseUpload({
        fileName: 'banner.png',
        contentType: 'image/png',
        fileSize: 1024,
      }),
    ).toMatch(/\.png$/);
    expect(
      assertValidFilebaseUpload({
        fileName: 'banner.gif',
        contentType: 'image/gif',
        fileSize: 1024,
      }),
    ).toMatch(/\.gif$/);
  });

  it('rejects non-image and oversized uploads', () => {
    expect(() =>
      assertValidFilebaseUpload({
        fileName: 'banner.svg',
        contentType: 'image/svg+xml',
        fileSize: 1024,
      }),
    ).toThrow('PNG, JPEG, GIF, or WebP');

    expect(() =>
      assertValidFilebaseUpload({
        fileName: 'banner.png',
        contentType: 'image/png',
        fileSize: 2 * 1024 * 1024,
      }),
    ).toThrow('1MB or smaller');
  });

  it('builds public Filebase URLs with safe path encoding', () => {
    expect(
      getFilebasePublicUrl({
        bucket: 'my-bucket',
        key: 'banners/2026-04-24/test file.png',
      }),
    ).toBe('https://my-bucket.s3.filebase.com/banners/2026-04-24/test%20file.png');
  });
});
