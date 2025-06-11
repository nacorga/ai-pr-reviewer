export interface OpenAIPatch {
  path: string;
  line: number;
  content: string;
}

export interface OpenAIReview {
  path: string;
  line: number;
  message: string;
}

export interface OpenAIReviewResponse {
  reviews: OpenAIReview[];
}
