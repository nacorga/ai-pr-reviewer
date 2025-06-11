import { OpenAIService } from './openai.service';
import { BaseComment, BaseCommentSuggestion, BasePatch, BasePullRequestPayload } from '../types/base.types';
import { COMMENT_IGNORE_FILE_PATTERNS, COMMENT_RATE_LIMIT_DELAY, VALID_ACTIONS } from '../constants/config.constants';

export abstract class BaseService<T extends BasePullRequestPayload> {
  protected openaiSrv: OpenAIService;
  protected readonly serviceType: 'GITHUB' | 'BITBUCKET';

  constructor(serviceType: 'GITHUB' | 'BITBUCKET') {
    this.openaiSrv = new OpenAIService();
    this.serviceType = serviceType;
  }

  abstract handlePullRequest(payload: any): Promise<void>;

  protected abstract getPatches(payload: T): Promise<BasePatch[]>;

  protected abstract getReferenceFiles(payload: T): Promise<string>;

  protected abstract postComments(
    payload: T,
    suggestions: BaseCommentSuggestion[],
    patches: BasePatch[],
  ): Promise<void>;

  protected abstract getComments(
    payload: T,
    suggestions: BaseCommentSuggestion[],
    patches: BasePatch[],
  ): Promise<BaseComment[]>;

  protected shouldProcessAction(action: string): boolean {
    return VALID_ACTIONS[this.serviceType].includes(action);
  }

  protected isFileIgnored(filename: string): boolean {
    return COMMENT_IGNORE_FILE_PATTERNS.some((rx) => rx.test(filename));
  }

  protected async delay(ms: number = COMMENT_RATE_LIMIT_DELAY): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async processPullRequest(payload: T): Promise<void> {
    try {
      const { action } = payload;

      if (!this.shouldProcessAction(action)) {
        return;
      }

      console.log(
        `[${this.constructor.name}] Processing PR #${payload.pullRequest.id || payload.pullRequest.number} (${action})`,
      );

      const patches = await this.getPatches(payload);

      if (patches.length === 0) {
        console.log(
          `[${this.constructor.name}] No changes in PR #${payload.pullRequest.id || payload.pullRequest.number}`,
        );
        return;
      }

      console.log(
        `[${this.constructor.name}] Reviewing ${patches.length} changed lines in PR #${payload.pullRequest.id || payload.pullRequest.number}`,
      );

      const referenceContent = await this.getReferenceFiles(payload);

      const suggestions = await this.openaiSrv.reviewPatches(
        patches.map(({ path, line, content }) => ({ path, line, content })),
        referenceContent,
      );

      await this.postComments(payload, suggestions, patches);
    } catch (error) {
      console.error(`[${this.constructor.name}] Error processing pull request:`, error);
      throw error;
    }
  }
}
