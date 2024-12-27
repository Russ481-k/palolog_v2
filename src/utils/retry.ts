interface RetryOptions {
    retries?: number;
    factor?: number;
    minTimeout?: number;
    maxTimeout?: number;
    onRetry?: (error: Error, attempt: number) => void;
}

export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        retries = 3,
        factor = 2,
        minTimeout = 1000,
        maxTimeout = 30000,
        onRetry
    } = options;

    let lastError: Error;
    let attempt = 0;

    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            attempt++;

            if (attempt === retries) {
                throw lastError;
            }

            if (onRetry) {
                onRetry(lastError, attempt);
            }

            const timeout = Math.min(
                maxTimeout,
                minTimeout * Math.pow(factor, attempt - 1)
            );

            await new Promise(resolve => setTimeout(resolve, timeout));
        }
    }

    throw lastError!;
} 