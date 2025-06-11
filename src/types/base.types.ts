export interface BasePatch {
  path: string;
  line: number;
  content: string;
  diffHunk: string;
}

export interface BaseCommentSuggestion {
  path: string;
  line: number;
  message: string;
}

export interface BaseComment {
  path: string;
  line: number;
  content: string;
}

export interface BasePullRequestPayload {
  action: string;
  pullRequest: {
    id: number;
    number?: number;
    head: {
      sha: string;
    };
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
    slug?: string;
    project?: {
      key: string;
    };
  };
}
