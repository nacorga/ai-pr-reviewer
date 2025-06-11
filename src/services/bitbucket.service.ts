import { BaseService } from './base.service';
import { BaseComment, BaseCommentSuggestion, BasePatch, BasePullRequestPayload } from '../types/base.types';
import { BitbucketPullRequestPayload } from '../types/bitbucket.types';
import axios from 'axios';

export class BitbucketService extends BaseService<BasePullRequestPayload> {
  private baseUrl: string;

  private auth: {
    username: string;
    password: string;
  };

  constructor() {
    super('BITBUCKET');

    const username = process.env.BITBUCKET_USERNAME;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;
    const workspace = process.env.BITBUCKET_WORKSPACE;

    if (!username || !appPassword || !workspace) {
      throw new Error(
        'BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD, and BITBUCKET_WORKSPACE environment variables are required',
      );
    }

    this.baseUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}`;

    this.auth = {
      username,
      password: appPassword,
    };
  }

  async handlePullRequest(payload: BitbucketPullRequestPayload): Promise<void> {
    const basePayload: BasePullRequestPayload = {
      action: payload.eventKey,
      pullRequest: {
        id: payload.pullRequest.id,
        head: {
          sha: payload.pullRequest.fromRef.latestCommit,
        },
      },
      repository: {
        owner: { login: payload.pullRequest.fromRef.repository.project.key },
        name: payload.pullRequest.fromRef.repository.slug,
        slug: payload.pullRequest.fromRef.repository.slug,
        project: payload.pullRequest.fromRef.repository.project,
      },
    };

    return this.processPullRequest(basePayload);
  }

  protected async getPatches(payload: BasePullRequestPayload): Promise<BasePatch[]> {
    try {
      const { repository: repo, pullRequest: pr } = payload;
      const response = await axios.get(
        `${this.baseUrl}/${repo.project!.key}/${repo.slug!}/pullrequests/${pr.id}/diff`,
        { auth: this.auth },
      );

      const patches: BasePatch[] = [];
      const diffLines = response.data.split('\n');

      let currentFile = '';
      let currentLine = 0;
      let currentDiffHunk = '';

      for (const line of diffLines) {
        if (line.startsWith('diff --git')) {
          const match = line.match(/diff --git a\/(.*) b\/(.*)/);

          if (match) {
            currentFile = match[2];
          }

          continue;
        }

        if (line.startsWith('@@')) {
          const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);

          if (match) {
            currentLine = parseInt(match[1], 10);
          }

          currentDiffHunk = line;

          continue;
        }

        if (line.startsWith('+') && !this.isFileIgnored(currentFile)) {
          patches.push({
            path: currentFile,
            line: currentLine,
            content: line.slice(1),
            diffHunk: currentDiffHunk,
          });
          currentLine++;
        } else if (!line.startsWith('-')) {
          currentLine++;
        }
      }

      return patches;
    } catch (error) {
      console.error('[Bitbucket] Error collecting patches:', error);

      throw error;
    }
  }

  protected async getReferenceFiles(payload: BasePullRequestPayload): Promise<string> {
    const { repository: repo, pullRequest: pr } = payload;

    let referenceContent = '';

    try {
      const response = await axios.get(
        `${this.baseUrl}/${repo.project!.key}/${repo.slug!}/src/${pr.head.sha}/.pr-guidelines`,
        { auth: this.auth },
      );

      const files = response.data.values || [];
      const mdFiles = files.filter((file: any) => file.path.endsWith('.md'));

      for (const file of mdFiles) {
        const fileResponse = await axios.get(
          `${this.baseUrl}/${repo.project!.key}/${repo.slug!}/raw/${pr.head.sha}/${file.path}`,
          { auth: this.auth },
        );

        referenceContent += `\nReferencia de ${file.path}:\n${fileResponse.data}\n`;
      }
    } catch (error: any) {
      const codeInfo = error?.response?.status ? `${error.response.status} - ` : '';

      console.warn(`[Bitbucket] Could not read reference files: ${codeInfo}${error?.message}`);
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
        try {
          await axios.post(
            `${this.baseUrl}/${repo.project!.key}/${repo.slug!}/pullrequests/${pr.id}/comments`,
            {
              content: { raw: comment.content },
              inline: {
                path: comment.path,
                line: comment.line,
              },
            },
            { auth: this.auth },
          );

          await this.delay();
        } catch (error) {
          console.error('[Bitbucket] Error posting individual comment:', error);

          continue;
        }
      }

      console.log(`[Bitbucket] Published ${comments.length} comments.`);
    } catch (error) {
      console.error('[Bitbucket] Error posting comments:', error);

      throw error;
    }
  }

  protected async getComments(
    payload: BasePullRequestPayload,
    suggestions: BaseCommentSuggestion[],
    patches: BasePatch[],
  ): Promise<BaseComment[]> {
    try {
      const { repository: repo, pullRequest: pr } = payload;
      const response = await axios.get(
        `${this.baseUrl}/${repo.project!.key}/${repo.slug!}/pullrequests/${pr.id}/comments`,
        { auth: this.auth },
      );

      const existingComments = response.data.values || [];

      const comments = suggestions
        .map((s) => {
          const patch = patches.find((p) => p.path === s.path && p.line === s.line);

          if (!patch) {
            return null;
          }

          const isDuplicate = existingComments.some(
            (comment: any) =>
              comment.inline?.path === s.path &&
              comment.inline?.line === patch.line &&
              comment.content?.raw === s.message,
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
    } catch (error) {
      console.error('[Bitbucket] Error getting comments:', error);

      throw error;
    }
  }
}
