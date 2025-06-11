export interface Patch {
  path: string;
  line: number;
  position: number;
  content: string;
  diffHunk: string;
}

export interface CommentSuggestion {
  path: string;
  line: number;
  message: string;
}

export interface PullRequestPayload {
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
