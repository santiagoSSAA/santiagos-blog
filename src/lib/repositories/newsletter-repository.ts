export interface SubscribeResult {
  alreadyExists: boolean;
}

export interface NewsletterRepository {
  subscribe(email: string): Promise<SubscribeResult>;
}
