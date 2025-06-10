import OpenAI from 'openai';
import { PR_REVIEW_PROMPT } from '../constants/prompt.constants';

const MAX_PATCH_CHARS = 10000;

export class OpenAIService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

  async reviewPatches(
    patches: Array<{ path: string; line: number; content: string }>,
  ): Promise<Array<{ path: string; line: number; message: string }>> {
    const chunks: Array<Array<{ path: string; line: number; content: string }>> = [];

    let current: Array<{ path: string; line: number; content: string }> = [];
    let length = 0;

    for (const p of patches) {
      const str = JSON.stringify(p);

      if (length + str.length > MAX_PATCH_CHARS && current.length) {
        chunks.push(current);
        current = [p];
        length = str.length;
      } else {
        current.push(p);
        length += str.length;
      }
    }

    if (current.length) chunks.push(current);

    const allReviews: Array<{ path: string; line: number; message: string }> = [];

    for (const chunk of chunks) {
      const prompt = PR_REVIEW_PROMPT(patches);

      const resp = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      try {
        const content = resp.choices[0].message.content;

        if (!content) continue;

        const parsed = JSON.parse(content);

        allReviews.push(...(parsed.reviews || []));
      } catch (error: any) {
        console.error('[OpenAI] Failed to parse review response:', error.message);

        continue;
      }
    }

    return allReviews;
  }
}
