const BASE_URL =
  import.meta.env.VITE_HTTP_URL || "http://89.167.104.26:8080";

const THUMBNAIL_MAX_WIDTH = 200;

/**
 * Generates a unique filename for upload.
 * For images, includes "poster" in the name for the original version.
 */
export function generateFileName(
  userId: string,
  extension: string,
  isPoster: boolean,
): string {
  const random = Math.random().toString(36).substring(2, 8);
  const posterTag = isPoster ? "_poster" : "";
  return `${random}_${userId}${posterTag}.${extension}`;
}

/**
 * Extracts file extension from a filename.
 */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "bin" : filename.substring(dot + 1).toLowerCase();
}

/**
 * Uploads an encrypted file blob to the server.
 */
export async function uploadFile(
  data: Uint8Array,
  filename: string,
  roomName: string,
  userUuid: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/upload-document/${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: {
        "Content-Length": String(data.byteLength),
        "x-room-name": roomName,
        "x-user-uuid": userUuid,
      },
      body: data,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

/**
 * Downloads a file from the server, returns raw bytes.
 */
export async function downloadFile(
  roomName: string,
  filename: string,
): Promise<Uint8Array> {
  const res = await fetch(
    `${BASE_URL}/download-document/${encodeURIComponent(roomName)}/${encodeURIComponent(filename)}`,
  );
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Returns true if the MIME type is an image we can thumbnail.
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Creates a thumbnail from an image file using canvas.
 * Returns the thumbnail as a Uint8Array (JPEG).
 */
export async function createThumbnail(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const scale = THUMBNAIL_MAX_WIDTH / bitmap.width;
  const width = THUMBNAIL_MAX_WIDTH;
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
