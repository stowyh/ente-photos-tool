import fs from 'fs-extra';

/**
 * Parses metadata from a JSON file and maps it to EXIF tags.
 * @param jsonPath - The path to the JSON file containing metadata.
 * @param isVideo - A boolean indicating whether the media is a video.
 * @returns An object containing EXIF tags and their corresponding values.
 */
export function parseMetadata(jsonPath: string, isVideo: boolean): Record<string, any> {
  // Read the JSON file synchronously and parse its content
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);

  // Initialize an empty object to store the resulting EXIF tags
  const result: Record<string, any> = {};

  // Map the description to the appropriate EXIF tag based on media type
  if (typeof data.description === "string") {
    if (isVideo) {
      result["QuickTime:Title"] = data.description;
    } else {
      result["ImageDescription"] = data.description;
    }
  }

  // Map the creation time to the appropriate EXIF tag
  if (data.creationTime && data.creationTime.timestamp) {
    const unixSeconds = Number(data.creationTime.timestamp);
    if (!isNaN(unixSeconds)) {
      // Convert Unix timestamp to a JavaScript Date object
      const date = new Date(unixSeconds * 1000);
      // Format the date as a string suitable for EXIF metadata
      const dateTimeString = date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

      if (isVideo) {
        result["CreateDate"] = dateTimeString;
        result["DateTimeOriginal"] = dateTimeString;
      } else {
        result["DateTimeOriginal"] = dateTimeString;
      }
    }
  }

  // Map geo data to the appropriate EXIF tags
  if (data.geoData && data.geoData.latitude && data.geoData.longitude) {
    const lat = data.geoData.latitude;
    const lon = data.geoData.longitude;
    result["GPSLatitude"] = lat;
    result["GPSLongitude"] = lon;
    if (isVideo) {
      result["QuickTime:GPSCoordinates"] = `${lat} ${lon}`;
    }
  }

  // Return the resulting EXIF tags
  return result;
}
