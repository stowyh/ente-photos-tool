import path from 'path';
import fs from 'fs-extra';

/**
 * Checks if a file is an image based on its extension.
 * @param fileName - The name of the file to check.
 * @returns True if the file is an image, false otherwise.
 */
export function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase(); // Convert the file name to lowercase
  return [".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif", ".tif", ".tiff"].some(ext => lower.endsWith(ext));
}

/**
 * Checks if a file is a video based on its extension.
 * @param fileName - The name of the file to check.
 * @returns True if the file is a video, false otherwise.
 */
export function isVideoFile(fileName: string): boolean {
  const lower = fileName.toLowerCase(); // Convert the file name to lowercase
  return [".mov", ".mp4", ".mkv", ".avi", ".webm"].some(ext => lower.endsWith(ext));
}

/**
 * Checks if a file is a media file (either an image or a video).
 * @param fileName - The name of the file to check.
 * @returns True if the file is a media file, false otherwise.
 */
export function isMediaFile(fileName: string): boolean {
  return isImageFile(fileName) || isVideoFile(fileName);
}

/**
 * Checks if a video file is part of a Live Photo.
 * @param dir - The directory containing the file.
 * @param fileName - The name of the video file to check.
 * @returns True if the video file is part of a Live Photo, false otherwise.
 */
export function isLivePhotoVideo(dir: string, fileName: string): boolean {
  if (!isVideoFile(fileName)) return false; // Return false if the file is not a video

  const base = path.basename(fileName, path.extname(fileName)); // Get the base name of the file without extension
  const imageExtensions = [".jpg", ".jpeg", ".heic", ".png"]; // List of image extensions

  // Check if there is a corresponding image file with the same base name
  return imageExtensions.some(ext => fs.existsSync(path.join(dir, base + ext)));
}
