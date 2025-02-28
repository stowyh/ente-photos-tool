import path from 'path';
import fs from 'fs-extra';
import { exiftool } from 'exiftool-vendored';
import { fromFile } from 'file-type';
import { MissingJsonError, ExifWriteError } from './errors';
import { isMediaFile, isLivePhotoVideo, isVideoFile } from './helpers';
import { parseMetadata } from './metadata';
import { SOURCE_DIR, OUTPUT_DIR, ERROR_DIR, TMP_DIR } from './config';

/**
 * Main function to process media files in the source directory.
 */
export async function main() {
  // Check if the source directory exists
  if (!(await fs.pathExists(SOURCE_DIR))) {
    console.error("Source folder does not exist:", SOURCE_DIR);
    process.exit(1);
  }

  // Ensure the necessary directories exist
  await fs.ensureDir(TMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(ERROR_DIR);

  try {
    // Process the source directory
    await processDirectory(SOURCE_DIR);
    console.log("All done. Closing ExifTool...");
  } finally {
    // Ensure ExifTool is closed properly
    await exiftool.end();
  }
}

/**
 * Recursively processes a directory to find and handle media files.
 * @param dir - The directory to process.
 */
async function processDirectory(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await processDirectory(fullPath);
    } else if (entry.isFile() && isMediaFile(entry.name)) {
      // Skip Live Photo videos
      if (isLivePhotoVideo(dir, entry.name)) {
        console.log("[SKIP LIVE PHOTO VIDEO]", fullPath);
        continue;
      }
      // Handle the media file
      await handleMediaFile(fullPath);
    }
  }
}

/**
 * Handles a media file by parsing metadata, correcting the file extension,
 * and embedding the metadata using ExifTool.
 * @param mediaPath - The path to the media file.
 */
async function handleMediaFile(mediaPath: string) {
  const fileName = path.basename(mediaPath);
  const fileExt = path.extname(fileName).toLowerCase();
  const dir = path.dirname(mediaPath);
  const relativePath = path.relative(SOURCE_DIR, mediaPath);
  const jsonPath = path.join(dir, "metadata", fileName + ".json");
  const isVideo = isVideoFile(fileName);

  try {
    // Check if the JSON metadata file exists
    if (!(await fs.pathExists(jsonPath))) {
      throw new MissingJsonError(mediaPath, jsonPath);
    }

    // Parse metadata from the JSON file
    const tags = parseMetadata(jsonPath, isVideo);

    // Detect the actual file type
    const actualType = await fromFile(mediaPath);
    const correctExtension = actualType?.ext ? `.${actualType.ext.toLowerCase()}` : fileExt;

    // Generate the corrected file name and paths
    const originalBaseName = path.basename(fileName, fileExt);
    const correctedFileName = originalBaseName + correctExtension;
    const correctedRelativePath = path.join(path.dirname(relativePath), correctedFileName);
    const outputFilePath = path.join(OUTPUT_DIR, correctedRelativePath);
    const errorFilePath = path.join(ERROR_DIR, correctedRelativePath);

    // Ensure the output directories exist
    await fs.ensureDir(path.dirname(outputFilePath));
    await fs.ensureDir(path.dirname(errorFilePath));

    // Copy the original file to a temporary location with the correct extension
    const tmpFile = path.join(TMP_DIR, `temp_${Date.now()}_${correctedFileName}`);
    await fs.copyFile(mediaPath, tmpFile);

    // Embed metadata into the temporary file
    try {
      await exiftool.write(tmpFile, tags, { writeArgs: ["-overwrite_original"] });
    } catch (innerErr) {
      throw new ExifWriteError(mediaPath, innerErr);
    }

    // Move the temporary file to the output directory
    await fs.move(tmpFile, outputFilePath, { overwrite: true });
    console.log("[OK]", relativePath, "→", outputFilePath);

  } catch (err: any) {
    // Handle errors by copying the original file to the error directory
    const originalBaseName = path.basename(fileName, fileExt);
    const actualType = await fromFile(mediaPath);
    const correctExtension = actualType?.ext ? `.${actualType.ext.toLowerCase()}` : fileExt;
    const correctedFileName = originalBaseName + correctExtension;
    const correctedRelativePath = path.join(path.dirname(relativePath), correctedFileName);
    const errorFilePath = path.join(ERROR_DIR, correctedRelativePath);

    await fs.ensureDir(path.dirname(errorFilePath));
    await fs.copyFile(mediaPath, errorFilePath);

    // Log the error details
    if (err instanceof MissingJsonError) {
      console.error(`[MISS JSON] ${relativePath}:`, err.message);
    } else if (err instanceof ExifWriteError) {
      console.error(`[EXIF FAIL] ${relativePath}:`, err.message);
    } else {
      console.error(`[OTHER ERR] ${relativePath}:`, err.message);
    }
  }
}
