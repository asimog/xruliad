import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createFilebasePresignedUpload: vi.fn(),
}));

vi.mock('@/lib/filebase', () => ({
  createFilebasePresignedUpload: mocks.createFilebasePresignedUpload,
}));

const { POST } = await import('../src/app/api/filebase/upload-url/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/filebase/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/filebase/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a presigned upload URL and public banner URL', async () => {
    mocks.createFilebasePresignedUpload.mockResolvedValue({
      uploadUrl: 'https://s3.filebase.com/bucket/key?signature=1',
      publicUrl: 'https://bucket.s3.filebase.com/key',
      key: 'key',
      contentType: 'image/png',
      expiresIn: 300,
    });

    const response = await POST(
      jsonRequest({
        fileName: 'banner.png',
        contentType: 'image/png',
        fileSize: 1024,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createFilebasePresignedUpload).toHaveBeenCalledWith({
      fileName: 'banner.png',
      contentType: 'image/png',
      fileSize: 1024,
    });
    expect(json).toMatchObject({
      uploadUrl: 'https://s3.filebase.com/bucket/key?signature=1',
      publicUrl: 'https://bucket.s3.filebase.com/key',
    });
  });

  it('rejects malformed upload requests before signing', async () => {
    const response = await POST(
      jsonRequest({
        fileName: '',
        contentType: 'image/png',
        fileSize: 1024,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createFilebasePresignedUpload).not.toHaveBeenCalled();
  });
});
