import OpenAI from 'openai';
import { config } from '../config';

export class OpenAIService {
  private client = new OpenAI({ apiKey: config.openaiApiKey });

  async reviewPatches(patches: string):
    Promise<Array<{ path: string; line: number; message: string }>> {

    const prompt = `You are a senior engineer. Review these git patches and identify issues, style or security risks. ` +
      `Return a JSON array of objects with keys: path (file path), line (line number), and message (feedback). Patches:\n${patches}`;

    const resp = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    try {
      const content = resp.choices[0].message.content;

      if (!content) return [];

      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI JSON:', resp.choices[0].message.content);

      return [];
    }
  }
}