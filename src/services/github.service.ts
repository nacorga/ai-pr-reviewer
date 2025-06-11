import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';
import { CommentSuggestion, Patch, PullRequestPayload } from '../types/github.types';
import { GITHUB_COMMENT_IGNORE_FILE_PATTERNS, GITHUB_COMMENT_RATE_LIMIT_DELAY } from '../constants/config.constants';

export class GitHubService {
  private octokit: Octokit;
  private openaiSrv: OpenAIService;

  constructor() {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new Octokit({ auth: token });
    this.openaiSrv = new OpenAIService();
  }

  async handlePullRequest(payload: PullRequestPayload): Promise<void> {
    try {
      const { action, pull_request: pr, repository: repo } = payload;

      if (!['opened', 'reopened', 'synchronize'].includes(action)) {
        return;
      }

      console.log(`[GitHub] Processing PR #${pr.number} (${action})`);

      try {
        await this.octokit.rest.repos.getCollaboratorPermissionLevel({
          owner: repo.owner.login,
          repo: repo.name,
          username: repo.owner.login,
        });
      } catch (error) {
        console.error('[GitHub] Error checking permissions:', error);

        throw new Error('Insufficient permissions to review pull requests');
      }

      const patches = await this.collectPatches(repo.owner.login, repo.name, pr.number);

      if (patches.length === 0) {
        console.log(`[GitHub] No changes in PR #${pr.number}`);

        return;
      }

      console.log(`[GitHub] Reviewing ${patches.length} changed lines in PR #${pr.number}`);

      const suggestions = await this.openaiSrv.reviewPatches(
        patches.map(({ path, line, content }) => ({ path, line, content })),
      );

      await this.postComments(repo.owner.login, repo.name, pr.number, suggestions, patches, pr.head.sha);
    } catch (error) {
      console.error('[GitHub] Error processing pull request:', error);

      throw error;
    }
  }

  private async collectPatches(owner: string, repo: string, pull_number: number): Promise<Patch[]> {
    try {
      const patches: Patch[] = [];

      for await (const { data: files } of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number,
      })) {
        for (const file of files) {
          if (!file.patch || GITHUB_COMMENT_IGNORE_FILE_PATTERNS.some((rx) => rx.test(file.filename))) {
            continue;
          }

          const lines = file.patch.split('\n');

          let currentLine = 0;
          let position = 0;
          let diffHunk = '';

          for (const l of lines) {
            if (l.startsWith('@@')) {
              const m = /@@ -\d+,?\d* \+(\d+),?\d* @@/.exec(l);
              if (m) {
                currentLine = parseInt(m[1], 10);
              }
              diffHunk = l;
              continue;
            }

            position++;
            if (l.startsWith('+')) {
              patches.push({
                path: file.filename,
                line: currentLine,
                position,
                content: l.slice(1),
                diffHunk,
              });
              currentLine++;
            } else if (!l.startsWith('-')) {
              currentLine++;
            }
          }
        }
      }

      return patches;
    } catch (error) {
      console.error('[GitHub] Error collecting patches:', error);

      throw error;
    }
  }

  private async postComments(
    owner: string,
    repo: string,
    pull_number: number,
    suggestions: CommentSuggestion[],
    patches: Patch[],
    pr_head_sha: string,
  ): Promise<void> {
    try {
      const comments = suggestions
        .map((s) => {
          const patch = patches.find((p) => p.path === s.path && p.line === s.line);

          if (!patch) {
            return null;
          }

          return {
            path: s.path,
            line: patch.line,
            side: 'RIGHT' as const,
            body: s.message,
            diffHunk: patch.diffHunk,
          };
        })
        .filter((comment): comment is NonNullable<typeof comment> => comment !== null);

      if (comments.length === 0) {
        return;
      }

      for (const comment of comments) {
        await this.octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number,
          commit_id: pr_head_sha,
          ...comment,
        });

        await new Promise((resolve) => setTimeout(resolve, GITHUB_COMMENT_RATE_LIMIT_DELAY));
      }

      console.log(`[GitHub] Published ${comments.length} comments.`);
    } catch (error) {
      console.error('[GitHub] Error posting comments:', error);

      throw error;
    }
  }
}
