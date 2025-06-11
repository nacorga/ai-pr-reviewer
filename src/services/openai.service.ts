import OpenAI from 'openai';
import { PR_REVIEW_PROMPT } from '../constants/prompt.constants';
import { OPENAI_CONFIG } from '../constants/openai.constants';
import { OpenAIPatch, OpenAIReview, OpenAIReviewResponse } from '../types/openai.types';
import { ChunkManagerUtil } from '../utils/chunk-manager.util';
import { tryParseJson } from '../utils/json.util';

class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async reviewPatches(patches: OpenAIPatch[], referenceContent: string = ''): Promise<OpenAIReview[]> {
    const patchChunks = ChunkManagerUtil.splitIntoChunks(patches, OPENAI_CONFIG.maxPatchChars, JSON.stringify);
    const referenceChunks = ChunkManagerUtil.splitReferenceContent(referenceContent, OPENAI_CONFIG.maxReferenceChars);
    const allReviews: OpenAIReview[] = [];
    const mergedReferences = referenceChunks.join('\n');

    for (let i = 0; i < patchChunks.length; i++) {
      try {
        const reference = referenceChunks.length === patchChunks.length ? referenceChunks[i] : mergedReferences;
        const reviews = await this.reviewChunk(patchChunks[i], reference || '');

        allReviews.push(...reviews);
      } catch (error) {
        console.error('[OpenAI] Error reviewing chunk:', error);
      }
    }

    return allReviews;
  }

  private async reviewChunk(chunk: OpenAIPatch[], referenceContent: string): Promise<OpenAIReview[]> {
    try {
      return await this.makeReviewRequest(chunk, referenceContent);
    } catch (error: any) {
      if (error.message?.includes('maximum context length')) {
        console.warn('[OpenAI] Prompt too long, retrying without references...');

        return await this.makeReviewRequest(chunk);
      }

      throw new OpenAIError('Failed to review chunk', error);
    }
  }

  private async makeReviewRequest(chunk: OpenAIPatch[], referenceContent?: string): Promise<OpenAIReview[]> {
    const prompt = PR_REVIEW_PROMPT(chunk, referenceContent || '');

    const response = await this.client.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: OPENAI_CONFIG.temperature,
      response_format: { type: 'json_object' },
      max_tokens: OPENAI_CONFIG.maxTokens,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new OpenAIError('Invalid OpenAI response: no choices returned');
    }

    const content = response.choices[0].message.content;

    if (!content) {
      return [];
    }

    const parsed = tryParseJson<OpenAIReviewResponse>(content);

    if (!parsed) {
      throw new OpenAIError('Failed to parse review response');
    }

    return parsed.reviews || [];
  }
}
