# ente-photos-tool

A simple tool that merges metadata from `.json` files into photos and videos.

More info: [Ente Metadata FAQ](https://help.ente.io/photos/faq/metadata)

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [To-Do](#to-do)
- [License](#license)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/stowyh/ente-photos-tool.git
   ```

2. **Navigate to the cloned repository and install the required packages**:
   ```bash
   npm install file-type@16.5.4 fs-extra exiftool-vendored
   npm install --save-dev @types/fs-extra typescript tsx
   ```
   **Note**: Due to compatibility issues, this script uses an outdated version of the `file-type` package.

## Usage

1. **Modify the source directory** (if needed):
   - The source directory can now be specified as a command-line argument.

2. **Run the script**:
   ```bash
   npx tsx src/index.ts --source /path/to/source --output /path/to/output --error /path/to/error --tmp /path/to/tmp
   ```
   - Replace `/path/to/source`, `/path/to/output`, `/path/to/error`, and `/path/to/tmp` with the actual paths you want to use.

## To-Do

- [x] Allow passing directories as a parameter.
- [ ] Improve performance for large directories.

## License

[MIT](LICENSE.md)
