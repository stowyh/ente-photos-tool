/**
 * Custom error class to handle cases where a JSON metadata file is missing.
 * Extends the built-in Error class to provide additional context.
 */
export class MissingJsonError extends Error {
  /**
   * Constructs a new MissingJsonError instance.
   * @param mediaFilePath - The path to the media file that is missing its JSON metadata.
   * @param expectedJsonPath - The expected path of the missing JSON metadata file.
   */
  constructor(public mediaFilePath: string, public expectedJsonPath: string) {
    // Call the superclass constructor with a custom error message
    super(`No matching JSON found at ${expectedJsonPath}`);
    // Set the name of the error to "MissingJsonError" for identification
    this.name = "MissingJsonError";
  }
}

/**
 * Custom error class to handle cases where embedding metadata into a file fails.
 * Extends the built-in Error class to provide additional context.
 */
export class ExifWriteError extends Error {
  /**
   * Constructs a new ExifWriteError instance.
   * @param mediaFilePath - The path to the media file where embedding metadata failed.
   * @param innerError - The underlying error that caused the failure.
   */
  constructor(public mediaFilePath: string, public innerError: unknown) {
    // Call the superclass constructor with a custom error message
    super(`Failed to embed metadata into ${mediaFilePath}: ${String(innerError)}`);
    // Set the name of the error to "ExifWriteError" for identification
    this.name = "ExifWriteError";
  }
}
