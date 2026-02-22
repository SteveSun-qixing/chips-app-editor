export function decodeBase64ToBytes(content: string): Uint8Array {
  const normalized = content.trim();
  if (!normalized) {
    return new Uint8Array();
  }

  if (typeof atob === 'function') {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(normalized, 'base64'));
  }

  throw new Error('Base64 decoder is unavailable in current runtime.');
}
