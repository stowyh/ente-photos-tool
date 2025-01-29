#!/usr/bin/env ts-node

import path from "path";
import fs from "fs-extra";
import { exiftool } from "exiftool-vendored";
import {fromFile} from 'file-type';

//
// ---------- Config ----------------------------------------------------------------------
//

const SOURCE_DIR = "~/path/to/Ente Photos";
const OUTPUT_DIR = "~/Documents/output";
const ERROR_DIR = "~/Documents/error";
const TMP_DIR = "~/Documents/tmp";

//
// ---------- Custom Error Types ----------------------------------------------------------
//

class MissingJsonError extends Error {
  constructor(public mediaFilePath: string, public expectedJsonPath: string) {
    super(`No matching JSON found at ${expectedJsonPath}`);
    this.name = "MissingJsonError";
  }
}

class ExifWriteError extends Error {
  constructor(public mediaFilePath: string, public innerError: unknown) {
    super(`Failed to embed metadata into ${mediaFilePath}: ${String(innerError)}`);
    this.name = "ExifWriteError";
  }
}

//
// ---------- Helpers ---------------------------------------------------------------------
//
function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".tif") ||
    lower.endsWith(".tiff")
  );
}
function isVideoFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".mov") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".mkv") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".webm")
  );
}

function isMediaFile(fileName: string): boolean {
  return isImageFile(fileName) || isVideoFile(fileName);
}

function isLivePhotoVideo(dir: string, fileName: string): boolean {
  if (!isVideoFile(fileName)) return false;
  const base = path.basename(fileName, path.extname(fileName)); // e.g. "IMG_1234"
  for (const ext of [".jpg", ".jpeg", ".heic", ".png", ".webp", ".tif", ".tiff"]) {
    const possiblePhoto = path.join(dir, base + ext);
    if (fs.existsSync(possiblePhoto)) {
      return true;
    }
  }
  return false;
}

function parseMetadata(jsonPath: string, isVideo: boolean): Record<string, any> {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);

  const result: Record<string, any> = {};

  // 1. description -> ImageDescription or QuickTime:Title
  if (typeof data.description === "string") {
    if (isVideo) {
      result["QuickTime:Title"] = data.description;
    } else {
      result["ImageDescription"] = data.description;
    }
  }

  // 2. creationTime -> DateTimeOriginal or QuickTime:CreateDate
  if (data.creationTime && data.creationTime.timestamp) {
    const unixSeconds = Number(data.creationTime.timestamp);
    if (!isNaN(unixSeconds)) {
      const date = new Date(unixSeconds * 1000);
      const yyyy = date.getUTCFullYear();
      const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const mm = String(date.getUTCMinutes()).padStart(2, "0");
      const ss = String(date.getUTCSeconds()).padStart(2, "0");
      const dateTimeString = `${yyyy}:${MM}:${dd} ${hh}:${mm}:${ss}`;

      if (isVideo) {
        result["CreateDate"] = dateTimeString;
        result["DateTimeOriginal"] = dateTimeString;
      } else {
        result["DateTimeOriginal"] = dateTimeString;
      }
    }
  }

  // 3. geoData -> GPSLatitude, GPSLongitude (+ optional QuickTime:GPSCoordinates)
  if (data.geoData && data.geoData.latitude && data.geoData.longitude) {
    const lat = data.geoData.latitude;
    const lon = data.geoData.longitude;
    result["GPSLatitude"] = lat;
    result["GPSLongitude"] = lon;
    if (isVideo) {
      result["QuickTime:GPSCoordinates"] = `${lat} ${lon}`;
    }
  }

  return result;
}

//
// ---------- Main Logic ------------------------------------------------------------------
//

async function main() {
  // 1. Check source folder
  if (!(await fs.pathExists(SOURCE_DIR))) {
    console.error("Source folder does not exist:", SOURCE_DIR);
    process.exit(1);
  }

  // 2. Ensure output dirs
  await fs.ensureDir(TMP_DIR);
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(ERROR_DIR);

  // 3. Process entire source tree
  try {
    await processDirectory(SOURCE_DIR);
    console.log("All done. Closing ExifTool...");
  } finally {
    await exiftool.end();
  }
}

async function processDirectory(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && isMediaFile(entry.name)) {
      // If it's the video side of a Live Photo, skip
      if (isLivePhotoVideo(dir, entry.name)) {
        console.log("[SKIP LIVE PHOTO VIDEO]", fullPath);
        continue;
      }
      await handleMediaFile(fullPath);
    }
  }
}

/**
 * handleMediaFile():
 *  1. Parse metadata from JSON
 *  2. Use file-type to detect actual format
 *  3. Generate corrected file name + path
 *  4. Copy original -> temp (with correct extension)
 *  5. exiftool.write(...) on temp
 *  6. Move to output (with correct extension)
 *  7. On error, copy original -> error
 */
async function handleMediaFile(mediaPath: string) {
  const fileName = path.basename(mediaPath);
  const fileExt = path.extname(fileName).toLowerCase();
  const dir = path.dirname(mediaPath);

  const relativePath = path.relative(SOURCE_DIR, mediaPath);

  // We'll look for e.g. /folder/metadata/flower.jpg.json
  const jsonPath = path.join(dir, "metadata", fileName + ".json");

  const isVideo = isVideoFile(fileName);

  try {
    // 1. Read JSON
    if (!(await fs.pathExists(jsonPath))) {
      throw new MissingJsonError(mediaPath, jsonPath);
    }
    const tags = parseMetadata(jsonPath, isVideo);

    // 2. Detect actual file type
    const actualType = await fromFile(mediaPath);
    let correctExtension = fileExt;
    if (actualType && actualType.ext) {
      correctExtension = "." + actualType.ext.toLowerCase();
    }

    // 3. Create corrected final path
    const originalBaseName = path.basename(fileName, fileExt);
    const correctedFileName = originalBaseName + correctExtension;

    const correctedRelativePath = path.join(
      path.dirname(relativePath), // subfolders
      correctedFileName
    );
    const outputFilePath = path.join(OUTPUT_DIR, correctedRelativePath);
    const errorFilePath = path.join(ERROR_DIR, correctedRelativePath);

    // 4. Copy the original -> a temp location (with correct extension)
    await fs.ensureDir(path.dirname(outputFilePath));
    await fs.ensureDir(path.dirname(errorFilePath));

    const tmpFile = path.join(TMP_DIR, `temp_${Date.now()}_${correctedFileName}`);
    await fs.copyFile(mediaPath, tmpFile);

    // 5. Write metadata in place
    try {
      await exiftool.write(tmpFile, tags, {
        writeArgs: ["-overwrite_original"],
      });
    } catch (innerErr) {
      throw new ExifWriteError(mediaPath, innerErr);
    }

    // 6. Move from temp -> output (with corrected extension)
    await fs.move(tmpFile, outputFilePath, { overwrite: true });
    console.log("[OK]", relativePath, "→", outputFilePath);

  } catch (err: any) {
    const originalBaseName = path.basename(fileName, fileExt);
    const actualType = await fromFile(mediaPath);
    let correctExtension = fileExt;
    if (actualType && actualType.ext) {
      correctExtension = "." + actualType.ext.toLowerCase();
    }
    const correctedFileName = originalBaseName + correctExtension;
    const correctedRelativePath = path.join(
      path.dirname(relativePath),
      correctedFileName
    );
    const errorFilePath = path.join(ERROR_DIR, correctedRelativePath);

    await fs.ensureDir(path.dirname(errorFilePath));
    await fs.copyFile(mediaPath, errorFilePath);

    if (err instanceof MissingJsonError) {
      console.error(`[MISS JSON] ${relativePath}:`, err.message);
    } else if (err instanceof ExifWriteError) {
      console.error(`[EXIF FAIL] ${relativePath}:`, err.message);
    } else {
      console.error(`[OTHER ERR] ${relativePath}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
