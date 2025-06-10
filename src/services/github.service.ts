import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';

export class GitHubService {
  private octokit = new Octokit({ auth: process.env.GITHUB_TOKEN as string });
  private openai = new OpenAIService();

  async handlePullRequest(payload: any) {
    const { action, pull_request: pr, repository: repo } = payload;

    console.log(`PR ${action}: ${repo.full_name}#${pr.number}`);

    if (!['opened', 'edited', 'synchronize'].includes(action)) {
      return;
    }

    const patches = await this.collectPatches(repo.owner.login, repo.name, pr.number);

    if (!patches.length) {
      return;
    }

    const comments = await this.openai.reviewPatches(patches);

    await this.postComments(repo.owner.login, repo.name, pr.number, comments);
  }

  private async collectPatches(owner: string, repo: string, pull_number: number): Promise<Array<{ path: string; line: number; content: string }>> {
    const patches: Array<{ path: string; line: number; content: string }> = [];

    for await (const resp of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
    })) {
      for (const file of resp.data) {
        if (file.patch) {
          const lines = file.patch.split('\n');

          let currentLine = 0;
          let contextLines = 0;
          
          for (const line of lines) {
            if (line.startsWith('@@')) {
              const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);

              if (match) {
                currentLine = parseInt(match[1], 10);
                contextLines = 0;
              }
            } else if (line.startsWith('+')) {
              patches.push({
                path: file.filename,
                line: currentLine + contextLines - 1,
                content: line.substring(1)
              });
              contextLines++;
            } else if (line.startsWith('-')) {
              contextLines++;
            } else {
              contextLines++;
            }
          }
        }
      }
    }

    return patches;
  }

  private async postComments(
    owner: string,
    repo: string,
    pull_number: number,
    comments: Array<{ path: string; line: number; message: string }>,
  ) {
    const { data: pr } = await this.octokit.pulls.get({ owner, repo, pull_number });

    const { data: existingComments } = await this.octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    for (const c of comments) {
      const isDuplicate = existingComments.some(
        (existing) =>
          existing.path === c.path &&
          existing.line === c.line &&
          existing.body === c.message
      );

      if (!isDuplicate) {
        await this.octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number,
          body: c.message,
          path: c.path,
          line: c.line,
          commit_id: pr.head.sha,
        });
      }
    }
  }
}
