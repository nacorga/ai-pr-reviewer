export interface BitbucketPullRequestPayload {
  eventKey: string;
  pullRequest: {
    id: number;
    title: string;
    description: string;
    state: string;
    open: boolean;
    closed: boolean;
    createdDate: number;
    updatedDate: number;
    fromRef: {
      latestCommit: string;
      repository: {
        slug: string;
        name: string;
        project: {
          key: string;
        };
      };
    };
    toRef: {
      latestCommit: string;
      repository: {
        slug: string;
        name: string;
        project: {
          key: string;
        };
      };
    };
  };
}

export interface BitbucketPatch {
  path: string;
  line: number;
  content: string;
  diffHunk: string;
}

export interface BitbucketCommentSuggestion {
  path: string;
  line: number;
  message: string;
}

export interface BitbucketComment {
  path: string;
  line: number;
  content: string;
  parent?: {
    id: number;
  };
}
