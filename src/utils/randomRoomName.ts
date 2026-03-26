const DEFAULT_SEGMENT_LENGTHS = [3, 4, 3];
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function generateRandomSegment(length: number): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * LETTERS.length);
    result += LETTERS[randomIndex];
  }

  return result;
}

export function generateRandomRoomName(
  segmentLengths: number[] = DEFAULT_SEGMENT_LENGTHS,
): string {
  return segmentLengths.map(generateRandomSegment).join("-");
}
