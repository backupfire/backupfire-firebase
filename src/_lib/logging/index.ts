/**
 * The {@link maskString} function options.
 */
export interface MaskStringOptions {
  /** If can display few chars  */
  critical?: boolean
}

/**
 * The function masks passed input string or returns a string describing
 * the type of the input.
 *
 * @param input - the value to mask
 * @param options - the masking options
 * @returns the masked string or a string describing the type of the input
 */
export function maskString(
  input: unknown,
  options?: MaskStringOptions
): string {
  if (typeof input !== 'string') {
    return `Type: ${typeof input}`
  }

  // Unless specified explicitly, mask all chars and display random length
  if (options?.critical !== false) {
    return '*'.repeat(8)
  }

  const length = input.length
  let unmaskedChars: number

  if (length <= 1) {
    unmaskedChars = 0
  } else if (length <= 4) {
    unmaskedChars = 1
  } else if (length <= 8) {
    unmaskedChars = 2
  } else {
    unmaskedChars = 3
  }

  const maskedPart = '*'.repeat(length - unmaskedChars)
  const unmaskedPart = input.slice(length - unmaskedChars)

  return `${maskedPart}${unmaskedPart}`
}
