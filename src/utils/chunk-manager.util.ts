export class ChunkManagerUtil {
  static splitIntoChunks<T>(items: T[], maxSize: number, stringify: (item: T) => string): T[][] {
    const chunks: T[][] = [];

    let current: T[] = [];
    let length = 0;

    for (const item of items) {
      const str = stringify(item);

      if (length + str.length > maxSize && current.length) {
        chunks.push(current);
        current = [item];
        length = str.length;
      } else {
        current.push(item);
        length += str.length;
      }
    }

    if (current.length) {
      chunks.push(current);
    }

    return chunks;
  }

  static splitReferenceContent(content: string, maxSize: number): string[] {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    if (maxSize <= 0) {
      throw new Error('Max size must be greater than 0');
    }

    if (content.length <= maxSize) {
      return [content];
    }

    const chunks: string[] = [];

    let currentChunk = '';

    const lines = content.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxSize) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}
