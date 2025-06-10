import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';

export class GitHubService {
  private octokit: Octokit;
  private openai: OpenAIService;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN as string });
    this.openai = new OpenAIService();
  }

  async handlePullRequest(payload: any) {
    const { action, pull_request: pr, repository: repo } = payload;

    console.log(`[GitHub] Processing PR #${pr.number} in ${repo.full_name} (${action})`);

    if (!['opened', 'reopened', 'synchronize'].includes(action)) {
      console.log(`[GitHub] Skipping PR #${pr.number} - action '${action}' not supported`);
      return;
    }

    const patches = await this.collectPatches(repo.owner.login, repo.name, pr.number);

    if (!patches.length) {
      console.log(`[GitHub] No changes found to review in PR #${pr.number}`);
      return;
    }

    console.log(`[GitHub] Found ${patches.length} changes to review in PR #${pr.number}`);

    const aiPatches = patches.map(({ path, line, content }) => ({
      path,
      line,
      content,
    }));

    const comments = await this.openai.reviewPatches(aiPatches);

    await this.postComments(repo.owner.login, repo.name, pr.number, comments, patches);
  }

  private async collectPatches(
    owner: string,
    repo: string,
    pull_number: number,
  ): Promise<Array<{ path: string; line: number; position: number; content: string }>> {
    const patches: Array<{ path: string; line: number; position: number; content: string }> = [];

    // Recorre todos los archivos modificados del PR
    for await (const resp of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
    })) {
      for (const file of resp.data) {
        if (!file.patch) continue;

        const lines = file.patch.split('\n');
        let currentLine = 0;
        let position = 0;

        for (const l of lines) {
          if (l.startsWith('@@')) {
            const match = l.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
            if (match) {
              currentLine = parseInt(match[1], 10);
            }
          } else {
            position++;
            if (l.startsWith('+')) {
              patches.push({
                path: file.filename,
                line: currentLine,
                position,
                content: l.substring(1),
              });
              currentLine++;
            } else if (l.startsWith('-')) {
              // línea eliminada: no incrementa currentLine
            } else {
              // contexto
              currentLine++;
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
    patches: Array<{ path: string; line: number; position: number; content: string }>,
  ) {
    const { data: pr } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const { data: existingComments } = await this.octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    for (const c of comments) {
      const patch = patches.find((p) => p.path === c.path && p.line === c.line);

      if (!patch) {
        continue;
      }

      const isDuplicate = existingComments.some(
        (ec) => ec.path === c.path && ec.line === c.line && ec.body === c.message,
      );

      if (isDuplicate) {
        continue;
      }

      await this.octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        commit_id: pr.head.sha,
        path: c.path,
        line: c.line,
        side: 'RIGHT',
        body: c.message,
      });
    }
  }
}
