import OpenAI from 'openai';

export class OpenAIService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

  async reviewPatches(
    patches: Array<{ path: string; line: number; content: string }>,
  ): Promise<Array<{ path: string; line: number; message: string }>> {
    const prompt = `You are a senior software engineer with extensive experience in code review and security analysis. Your task is to review code changes and provide detailed feedback.

System Instructions:
- Return a JSON object with a single key "reviews" containing an array of review objects
- Each review object must have exactly these keys:
  * "path" (string): The file path being reviewed
  * "line" (number): The line number where the issue was found
  * "message" (string): Clear, actionable feedback about the issue

Example Output Format:
{
  "reviews": [
    {
      "path": "src/components/Button.tsx",
      "line": 15,
      "message": "Missing type annotation for onClick prop. Add React.MouseEventHandler type."
    },
    {
      "path": "src/utils/auth.ts",
      "line": 42,
      "message": "Security risk: API key is exposed in error message. Remove sensitive data from error logging."
    }
  ]
}

Review Guidelines:
1. Focus on code quality, security risks, and potential bugs
2. Be specific and actionable in your feedback
3. Include line numbers for each issue
4. Prioritize critical issues over style suggestions

Code changes to review:
${JSON.stringify(patches, null, 2)}`;

    const resp = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    try {
      const content = resp.choices[0].message.content;

      if (!content) return [];

      const parsed = JSON.parse(content);

      return parsed.reviews || [];
    } catch (error: any) {
      console.error('[OpenAI] Failed to parse review response:', error.message);
      return [];
    }
  }
}
