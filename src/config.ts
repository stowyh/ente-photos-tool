import path from 'path';
import { Command } from 'commander';

/**
 * Define the command-line interface (CLI) program using Commander.
 */
const program = new Command();

/**
 * Configure command-line options for the program.
 * These options allow users to specify directories for source, output, error, and temporary files.
 */
program
  .option('-s, --source <path>', 'Source directory', '~/path/to/Ente Photos') // Option to specify the source directory
  .option('-o, --output <path>', 'Output directory', '~/Documents/output') // Option to specify the output directory
  .option('-e, --error <path>', 'Error directory', '~/Documents/error') // Option to specify the error directory
  .option('-t, --tmp <path>', 'Temporary directory', '~/Documents/tmp') // Option to specify the temporary directory
  .parse(process.argv); // Parse command-line arguments

// Retrieve the options from the parsed command-line arguments
const options = program.opts();

/**
 * Resolve and export the absolute paths for the source, output, error, and temporary directories.
 * These paths are used throughout the application to manage file operations.
 */
export const SOURCE_DIR = path.resolve(options.source); // Resolve the absolute path for the source directory
export const OUTPUT_DIR = path.resolve(options.output); // Resolve the absolute path for the output directory
export const ERROR_DIR = path.resolve(options.error); // Resolve the absolute path for the error directory
export const TMP_DIR = path.resolve(options.tmp); // Resolve the absolute path for the temporary directory
