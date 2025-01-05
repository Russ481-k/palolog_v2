export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onError?: (error: Error) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 5000,
    onError,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (onError) {
        onError(lastError);
      }

      if (attempt === retries - 1) {
        throw lastError;
      }

      const timeout = Math.min(
        Math.max(minTimeout * Math.pow(2, attempt), minTimeout),
        maxTimeout
      );
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }

  throw lastError;
}
