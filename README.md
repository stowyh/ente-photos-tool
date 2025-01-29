# ente-photos-tool

A simple tool that merges metadata from `.json` files into photos and videos.

More info: [Ente Metadata FAQ](https://help.ente.io/photos/faq/metadata)

## Table of Contents
- [Installation](#installation)
- [To-Do](#to-do)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/stowyh/ente-photos-tool.git
   ```
2. Navigate to the cloned repository and install the required packages:
   ```bash
   npm install file-type@16.5.4 fs-extra exiftool-vendored;
   npm install --save-dev @types/fs-extra typescript tsx;
   ```
   **Note:** Due to compatibility issues, this script uses an outdated version of the `file-type` package.

3. Modify the following line in `ente-tool.ts` to set the correct source directory:
   ```typescript
   const SOURCE_DIR = "~/path/to/Ente Photos";
   ```
4. Run the script:
   ```bash
   npx tsx ente-tool.ts
   ```

## To-Do

- [ ] Allow passing directories as a parameter.

## License
[MIT](LICENSE.md)
