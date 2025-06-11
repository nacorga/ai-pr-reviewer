export interface GithubPatch {
  path: string;
  line: number;
  position: number;
  content: string;
  diffHunk: string;
}

export interface GithubCommentSuggestion {
  path: string;
  line: number;
  message: string;
}

export interface GithubPullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    head: {
      sha: string;
    };
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
  };
}
