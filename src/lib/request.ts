export const withTimeout = async <T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

interface RetryWithTimeoutOptions {
  attempts?: number;
  timeoutMs: number;
  timeoutMessage: string;
  retryDelayMs?: number;
}

const wait = async (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const retryWithTimeout = async <T>(
  operation: () => PromiseLike<T>,
  options: RetryWithTimeoutOptions
): Promise<T> => {
  const attempts = Math.max(1, options.attempts ?? 2);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 600);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withTimeout(operation(), options.timeoutMs, options.timeoutMessage);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(retryDelayMs);
      }
    }
  }

  throw lastError;
};

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unexpected request error.';
};
