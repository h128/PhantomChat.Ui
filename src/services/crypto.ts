import sodium from "libsodium-wrappers";

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = sodium.ready;
  }
  return ready;
}

/**
 * Derives a fixed-length key from the room key string using generic hashing.
 */
function deriveKey(roomKey: string): Uint8Array {
  return sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    sodium.from_string(roomKey),
    null,
  );
}

/**
 * Encrypts data using libsodium secretbox.
 * Returns a single blob with the nonce prepended: [nonce | ciphertext].
 */
export async function encryptFile(
  data: Uint8Array,
  roomKey: string,
): Promise<Uint8Array> {
  await ensureReady();
  const key = deriveKey(roomKey);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);

  // Prepend nonce to ciphertext so it travels as one blob
  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce, 0);
  result.set(ciphertext, nonce.length);
  return result;
}

/**
 * Decrypts a blob that was produced by encryptFile (nonce prepended).
 */
export async function decryptFile(
  encryptedBlob: Uint8Array,
  roomKey: string,
): Promise<Uint8Array> {
  await ensureReady();
  const key = deriveKey(roomKey);
  const nonceLen = sodium.crypto_secretbox_NONCEBYTES;
  const nonce = encryptedBlob.slice(0, nonceLen);
  const ciphertext = encryptedBlob.slice(nonceLen);
  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
}
