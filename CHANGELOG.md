# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].
This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: https://semver.org
[keep a changelog]: https://keepachangelog.com

## 0.9.0 - 2019-11-15

### Added

- Add Firestore collections list endpoint.

- Enable selective Firestore backups:
  - Always specify collection ids during export, to enable selective restore.
  - Allow specifying ignored collections during Firestore backup.

## 0.8.0 - 2019-11-14

### Added

- Capture exceptions to Sentry.

## 0.7.0 - 2019-11-13

### Changed

- **BREAKING**: Move firebase-admin and firebase-functions to peer dependencies.

## 0.6.0 - 2019-10-30

### Added

- Protected the storage update endpoint with admin password.

## 0.5.0 - 2019-10-19

### Fixed

- Fixed more incompatibilities with the Node.js v10 runtime.

## 0.4.0 - 2019-10-18

### Fixed

- Make the agent work with Node.js v10 runtime.

### Changed

- Always deploy the agent to `us-central1` region.

## 0.3.0 - 2019-10-18

### Added

- Added `debug` option which prints debug information to the log.
- Print warnings when environment configuration isn't found or necessary variables are missing in the runtime environment.

### Changed

- Ignore function instances with name not equal `backupfire`.

## 0.2.0 - 2019-10-17

### Changed

- Replace the Backup Fire agent with a dummy HTTP handler and print a warning when `backupfire` key isn't found in the Functions environment configuration.

## 0.1.0 - 2019-10-15

Initial version.
