import { Octokit } from '@octokit/rest';
import { BaseService } from './base.service';
import { BaseComment, BaseCommentSuggestion, BasePatch, BasePullRequestPayload } from '../types/base.types';
import { GithubPullRequestPayload } from '../types/github.types';

export class GitHubService extends BaseService<BasePullRequestPayload> {
  private octokit: Octokit;

  constructor() {
    super('GITHUB');
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new Octokit({ auth: token });
  }

  async handlePullRequest(payload: GithubPullRequestPayload): Promise<void> {
    const basePayload: BasePullRequestPayload = {
      action: payload.action,
      pullRequest: {
        id: payload.pull_request.number,
        number: payload.pull_request.number,
        head: {
          sha: payload.pull_request.head.sha,
        },
      },
      repository: {
        owner: payload.repository.owner,
        name: payload.repository.name,
      },
    };

    return this.processPullRequest(basePayload);
  }

  protected async getPatches(payload: BasePullRequestPayload): Promise<BasePatch[]> {
    try {
      const { repository: repo, pullRequest: pr } = payload;
      const patches: BasePatch[] = [];

      for await (const { data: files } of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
        owner: repo.owner.login,
        repo: repo.name,
        pull_number: pr.number!,
      })) {
        for (const file of files) {
          if (!file.patch || this.isFileIgnored(file.filename)) {
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

  protected async getReferenceFiles(payload: BasePullRequestPayload): Promise<string> {
    const { repository: repo, pullRequest: pr } = payload;

    let referenceContent = '';

    try {
      const { data: dirContents } = await this.octokit.rest.repos.getContent({
        owner: repo.owner.login,
        repo: repo.name,
        path: '.pr-guidelines',
        ref: pr.head.sha,
      });

      if (!Array.isArray(dirContents)) {
        return referenceContent;
      }

      if (!dirContents.every((entry) => entry && typeof entry === 'object' && 'type' in entry && 'name' in entry)) {
        console.warn('[GitHub] Unexpected directory contents structure:', dirContents);

        return referenceContent;
      }

      const mdFiles = dirContents.filter((file) => file.type === 'file' && file.name.endsWith('.md'));

      for (const file of mdFiles) {
        const { data: fileContent } = await this.octokit.rest.repos.getContent({
          owner: repo.owner.login,
          repo: repo.name,
          path: file.path,
          ref: pr.head.sha,
        });

        if ('content' in fileContent) {
          const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

          referenceContent += `\nReferencia de ${file.name}:\n${content}\n`;
        }
      }
    } catch (error: any) {
      const codeInfo = error?.code ? `${error.code} - ` : '';

      console.warn(`[GitHub] Could not read reference files: ${codeInfo}${error?.message}`);
    }

    return referenceContent;
  }

  protected async postComments(
    payload: BasePullRequestPayload,
    suggestions: BaseCommentSuggestion[],
    patches: BasePatch[],
  ): Promise<void> {
    try {
      const { repository: repo, pullRequest: pr } = payload;
      const comments = await this.getComments(payload, suggestions, patches);

      if (comments.length === 0) {
        return;
      }

      for (const comment of comments) {
        if (!comment.path || !comment.line || !comment.content || !pr.head.sha) {
          console.error('[GitHub] Missing required parameters for comment:', comment);

          continue;
        }

        const params = {
          owner: repo.owner.login,
          repo: repo.name,
          pull_number: pr.number!,
          commit_id: pr.head.sha,
          path: comment.path,
          line: comment.line,
          side: 'RIGHT' as const,
          body: comment.content,
        };

        console.log(`[GitHub] Posting comment: ${JSON.stringify(params)}`);

        try {
          await this.octokit.rest.pulls.createReviewComment(params);
          await this.delay();
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

  protected async getComments(
    payload: BasePullRequestPayload,
    suggestions: BaseCommentSuggestion[],
    patches: BasePatch[],
  ): Promise<BaseComment[]> {
    const { repository: repo, pullRequest: pr } = payload;
    const existingComments = await this.octokit.paginate(this.octokit.rest.pulls.listReviewComments, {
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: pr.number!,
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
          content: s.message,
        };
      })
      .filter((comment): comment is NonNullable<typeof comment> => comment !== null);

    return comments;
  }
}
