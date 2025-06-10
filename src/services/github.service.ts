import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';

export class GitHubService {
  private octokit = new Octokit({ auth: process.env.GITHUB_TOKEN as string });
  private openai = new OpenAIService();

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

    for await (const resp of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
    })) {
      for (const file of resp.data) {
        if (file.patch) {
          const lines = file.patch.split('\n');

          let currentLine = 0;
          let position = 0;

          for (const line of lines) {
            if (line.startsWith('@@')) {
              const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);

              if (match) {
                currentLine = parseInt(match[1], 10);
              }
            } else {
              position++;
              if (line.startsWith('+')) {
                patches.push({
                  path: file.filename,
                  line: currentLine,
                  position,
                  content: line.substring(1),
                });
                currentLine++;
              } else if (line.startsWith('-')) {
                // Removed lines do not advance the new file's line counter
              } else {
                currentLine++;
              }
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
    const { data: pr } = await this.octokit.pulls.get({ owner, repo, pull_number });

    const { data: existingComments } = await this.octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    const patchMap = new Map<string, Map<number, number>>();

    for (const p of patches) {
      if (!patchMap.has(p.path)) {
        patchMap.set(p.path, new Map());
      }
      patchMap.get(p.path)!.set(p.line, p.position);
    }

    for (const c of comments) {
      const isDuplicate = existingComments.some(
        (existing) => existing.path === c.path && existing.line === c.line && existing.body === c.message,
      );

      const position = patchMap.get(c.path)?.get(c.line);

      if (position && !isDuplicate) {
        await this.octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number,
          body: c.message,
          path: c.path,
          commit_id: pr.head.sha,
          position,
        });
      }
    }
  }
}
