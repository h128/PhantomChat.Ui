import sodium from "libsodium-wrappers";

export function isEncryptionEnabled(): boolean {
  return import.meta.env.VITE_ENCRYPT_FILES === "true";
}

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = sodium.ready;
  }
  return ready;
}

interface SodiumKeyPair {
  keyType?: "curve25519" | "ed25519" | "x25519" | string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

let boxKeyPair: SodiumKeyPair | null = null;

/**
 * Returns the client's public key as a 64-char hex string (32 bytes).
 * Generates a crypto_box keypair on first call; reuses it afterwards.
 */
export async function getPublicKeyHex(): Promise<string> {
  await ensureReady();
  if (!boxKeyPair) {
    boxKeyPair = sodium.crypto_box_keypair();
  }
  return sodium.to_hex(boxKeyPair.publicKey);
}

/**
 * Decrypts an encrypted room key from the server.
 * The server encrypts with crypto_box_easy(room_key, zero_nonce, client_pk, server_sk).
 */
export async function decryptRoomKey(
  encryptedHex: string,
  serverPublicKeyHex?: string,
): Promise<string> {
  await ensureReady();
  if (!boxKeyPair) {
    throw new Error("KeyPair not initialized – call getPublicKeyHex() first");
  }

  const ciphertext = sodium.from_hex(encryptedHex);
  const nonce = new Uint8Array(sodium.crypto_box_NONCEBYTES); // Zeroed nonce as requested by backend

  const serverPubKey = serverPublicKeyHex
    ? sodium.from_hex(serverPublicKeyHex)
    : boxKeyPair.publicKey;
  const decrypted = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    serverPubKey,
    boxKeyPair.privateKey,
  );

  return sodium.to_string(decrypted);
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
