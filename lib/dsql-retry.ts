const isDsqlConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as Record<string, unknown>).code
  return code === '40001' || code === 'OC000' || code === 'OC001'
}

export async function withDsqlRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      if (isDsqlConflict(error) && attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 50 * Math.pow(2, attempt)),
        )
        continue
      }
      throw error
    }
  }
  throw new Error('DSQL transaction failed after max retries')
}
