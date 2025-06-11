import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';
import { GithubCommentSuggestion, GithubPatch, GithubPullRequestPayload } from '../types/github.types';
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

  async handlePullRequest(payload: GithubPullRequestPayload): Promise<void> {
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

      const referenceContent = await this.getReferenceFiles(repo.owner.login, repo.name, pr.head.sha);

      const suggestions = await this.openaiSrv.reviewPatches(
        patches.map(({ path, line, content }) => ({ path, line, content })),
        referenceContent,
      );

      await this.postComments(repo.owner.login, repo.name, pr.number, suggestions, patches, pr.head.sha);
    } catch (error) {
      console.error('[GitHub] Error processing pull request:', error);

      throw error;
    }
  }

  private async collectPatches(owner: string, repo: string, pull_number: number): Promise<GithubPatch[]> {
    try {
      const patches: GithubPatch[] = [];

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
          let currentDiffHunk = '';

          for (const l of lines) {
            if (l.startsWith('@@')) {
              const m = /@@ -\d+,?\d* \+(\d+),?\d* @@/.exec(l);

              if (m) {
                currentLine = parseInt(m[1], 10);
              }

              currentDiffHunk = l;

              continue;
            }

            if (l.startsWith('+')) {
              patches.push({
                path: file.filename,
                line: currentLine,
                content: l.slice(1),
                diffHunk: currentDiffHunk,
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

  private async getReferenceFiles(owner: string, repo: string, ref: string): Promise<string> {
    let referenceContent = '';

    try {
      const { data: dirContents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.pr-guidelines',
        ref,
      });

      if (!Array.isArray(dirContents)) {
        return referenceContent;
      }

      const mdFiles = dirContents.filter((file) => file.type === 'file' && file.name.endsWith('.md'));

      for (const file of mdFiles) {
        const { data: fileContent } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref,
        });

        if ('content' in fileContent) {
          const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

          referenceContent += `\nReferencia de ${file.name}:\n${content}\n`;
        }
      }
    } catch (error) {
      console.warn('[GitHub] Could not read reference files:', error);
    }

    return referenceContent;
  }

  private async postComments(
    owner: string,
    repo: string,
    pull_number: number,
    suggestions: GithubCommentSuggestion[],
    patches: GithubPatch[],
    pr_head_sha: string,
  ): Promise<void> {
    try {
      const comments = await this.getComments(owner, repo, pull_number, suggestions, patches);

      if (comments.length === 0) {
        return;
      }

      for (const comment of comments) {
        if (!comment.path || !comment.line || !comment.body || !pr_head_sha) {
          console.error('[GitHub] Missing required parameters for comment:', comment);

          continue;
        }

        const params = {
          owner,
          repo,
          pull_number,
          commit_id: pr_head_sha,
          path: comment.path,
          line: comment.line,
          side: comment.side,
          body: comment.body,
          ...(comment.start_line && { start_line: comment.start_line }),
          ...(comment.start_side && { start_side: comment.start_side }),
        };

        console.log(`[GitHub] Posting comment: ${JSON.stringify(params)}`);

        try {
          await this.octokit.rest.pulls.createReviewComment(params);
          await new Promise((resolve) => setTimeout(resolve, GITHUB_COMMENT_RATE_LIMIT_DELAY));
        } catch (error) {
          console.error('[GitHub] Error posting individual comment:', error);

          continue;
        }
      }

      console.log(`[GitHub] Published ${comments.length} comments.`);
    } catch (error) {
      console.error('[GitHub] Error posting comments:', error);

      throw error;
    }
  }

  private async getComments(
    owner: string,
    repo: string,
    pull_number: number,
    suggestions: GithubCommentSuggestion[],
    patches: GithubPatch[],
  ): Promise<
    Array<{
      path: string;
      line: number;
      side: 'RIGHT';
      body: string;
      start_line?: number;
      start_side?: 'RIGHT';
    }>
  > {
    const existingComments = await this.octokit.paginate(this.octokit.rest.pulls.listReviewComments, {
      owner,
      repo,
      pull_number,
      per_page: 100,
    });

    const comments = suggestions
      .map((s) => {
        const patch = patches.find((p) => p.path === s.path && p.line === s.line);

        if (!patch) {
          return null;
        }

        const isDuplicate = existingComments.some(
          (comment) => comment.path === s.path && comment.line === patch.line && comment.body === s.message,
        );

        if (isDuplicate) {
          return null;
        }

        return {
          path: s.path,
          line: patch.line,
          side: 'RIGHT' as const,
          body: s.message,
        };
      })
      .filter((comment): comment is NonNullable<typeof comment> => comment !== null);

    return comments || [];
  }
}
