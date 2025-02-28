import { main } from './processing';

/**
 * Entry point of the application.
 * Invokes the main processing function and handles any errors that occur.
 */
main()
  .catch((err) => {
    // Log the error message to the console
    console.error("Fatal error:", err);
    // Exit the process with a non-zero status code to indicate an error
    process.exit(1);
  });
