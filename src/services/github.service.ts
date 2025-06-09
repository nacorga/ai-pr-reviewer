import { Octokit } from '@octokit/rest';
import { config } from '../config';
import { OpenAIService } from './openai.service';

export class GitHubService {
  private octokit = new Octokit({ auth: config.github.token });
  private openai = new OpenAIService();

  async handlePullRequest(payload: any) {
    const { action, pull_request: pr, repository: repo } = payload;

    console.log(`Received PR ${action}: ${repo.full_name}#${pr.number}`);

    if (!['opened', 'edited', 'synchronize'].includes(action)) return;

    const patches = await this.collectPatches(repo.owner.login, repo.name, pr.number);

    if (!patches) return;

    const comments = await this.openai.reviewPatches(patches);

    await this.postComments(repo.owner.login, repo.name, pr.number, pr.head.sha, comments);
  }

  private async collectPatches(owner: string, repo: string, pull_number: number): Promise<string> {
    let patches = '';

    for await (const response of this.octokit.paginate.iterator(
      this.octokit.pulls.listFiles,
      { owner, repo, pull_number }
    )) {
      for (const file of response.data) {
        if (file.patch) {
          patches += `\n// File: ${file.filename}\n${file.patch}\n`;
        }
      }
    }

    return patches;
  }

  private async postComments(
    owner: string,
    repo: string,
    pull_number: number,
    commit_id: string,
    comments: Array<{ path: string; line: number; message: string }>
  ) {
    for (const c of comments) {
      await this.octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        body: c.message,
        path: c.path,
        line: c.line,
        commit_id,
      });
    }
  }
}