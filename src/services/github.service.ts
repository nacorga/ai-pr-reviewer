import { Octokit } from '@octokit/rest';
import { OpenAIService } from './openai.service';

interface Patch {
  path: string;
  line: number;
  position: number;
  content: string;
}

interface CommentSuggestion {
  path: string;
  line: number;
  message: string;
}

export class GitHubService {
  private octokit = new Octokit({ auth: process.env.GITHUB_TOKEN as string });
  private openai = new OpenAIService();

  async handlePullRequest(payload: any) {
    const { action, pull_request: pr, repository: repo } = payload;
    if (!['opened', 'reopened', 'synchronize'].includes(action)) return;

    console.log(`[GitHub] Processing PR #${pr.number} (${action})`);

    // 1) Extrae todos los parches de adición (+) del PR
    const patches = await this.collectPatches(repo.owner.login, repo.name, pr.number);
    if (patches.length === 0) {
      console.log(`[GitHub] No changes in PR #${pr.number}`);
      return;
    }

    console.log(`[GitHub] Reviewing ${patches.length} changed lines in PR #${pr.number}`);
    // 2) Llama a OpenAI para generar sugerencias
    const suggestions: CommentSuggestion[] = await this.openai.reviewPatches(
      patches.map(({ path, line, content }) => ({ path, line, content })),
    );

    // 3) Publica de golpe todos los comentarios
    await this.postComments(repo.owner.login, repo.name, pr.number, suggestions, patches);
  }

  private async collectPatches(owner: string, repo: string, pull_number: number): Promise<Patch[]> {
    const patches: Patch[] = [];

    // Paginea sobre listFiles para obtener todos los parches
    for await (const { data: files } of this.octokit.paginate.iterator(this.octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
    })) {
      for (const file of files) {
        if (!file.patch) continue;

        const lines = file.patch.split('\n');
        let currentLine = 0;
        let position = 0;

        for (const l of lines) {
          if (l.startsWith('@@')) {
            const m = /@@ -\d+,?\d* \+(\d+),?\d* @@/.exec(l);
            if (m) currentLine = parseInt(m[1], 10);
            continue;
          }

          position++;
          if (l.startsWith('+')) {
            patches.push({
              path: file.filename,
              line: currentLine,
              position,
              content: l.slice(1),
            });
            currentLine++;
          } else if (!l.startsWith('-')) {
            currentLine++;
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
    comments: CommentSuggestion[],
    patches: Patch[],
  ) {
    // 1) Obtén en paralelo el SHA del PR y los comments ya existentes
    const [{ data: pr }, { data: existing }] = await Promise.all([
      this.octokit.rest.pulls.get({ owner, repo, pull_number }),
      this.octokit.rest.pulls.listReviewComments({ owner, repo, pull_number }),
    ]);

    // 2) Usa un Set para filtrar duplicados en O(1)
    const seen = new Set(existing.map((ec) => `${ec.path}|${ec.position}|${ec.body}`));

    // 3) Mapea y filtra sólo las sugerencias nuevas y válidas
    const reviewComments = comments.flatMap((c) => {
      const patch = patches.find((p) => p.path === c.path && p.line === c.line);
      if (!patch) return [];

      const key = `${c.path}|${patch.position}|${c.message}`;
      if (seen.has(key)) return [];
      seen.add(key);

      return {
        path: c.path,
        position: patch.position,
        body: c.message,
      };
    });

    if (reviewComments.length === 0) {
      console.log('[GitHub] No new comments to post.');
      return;
    }

    // 4) Crea y publica la review con todos los comments en un solo request
    //    event: 'COMMENT' envía y publica la review inmediatamente sin pasos extra :contentReference[oaicite:0]{index=0}
    const { data: review } = await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number,
      commit_id: pr.head.sha,
      event: 'COMMENT',
      comments: reviewComments,
    });

    console.log(`[GitHub] Published review #${review.id} with ${reviewComments.length} comments.`);
  }
}
