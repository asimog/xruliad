export async function hash(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashHex(input: string): Promise<string> {
  return toHex(await hash(input));
}

export async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) {
    return hashHex("");
  }

  let level = await Promise.all(leaves.map((leaf) => hashHex(leaf)));

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(await hashHex(left + right));
    }
    level = next;
  }

  return level[0];
}
