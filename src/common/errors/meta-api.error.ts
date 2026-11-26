export class MetaApiError extends Error {
  readonly context?: Record<string, unknown>;

  constructor(context?: Record<string, unknown>) {
    super('Meta API request failed');
    this.name = MetaApiError.name;
    this.context = context;
  }
}
