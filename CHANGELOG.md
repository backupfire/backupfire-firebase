# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].
This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: https://semver.org
[keep a changelog]: https://keepachangelog.com

## 1.5.0 - 2023-02-28

### Added

- Added logging to the agent endpoints to help with debugging and troubleshooting.

## 1.4.0 - 2022-06-03

### Changed

- Set default `memory` (`1GB`) and `timeoutSeconds` (`540`) Firebase Functions runtime options. It solves the problem with the huge users' backups that either run out of memory or timeout.

- Even further improved the memory usage by the users backup.

- Updated dependencies to the latest supported versions.

### Added

- Added delayed users backup feature. If the delay is requested, the agent will respond with a pending backup state. When the backup is completed, the agent will notify the controller. That prevents multiple backups caused by timeouts.

## 1.3.0 - 2022-06-01

### Fixed

- Fixed compatibility with `firebase-functions` tripping over `timeoutSeconds` set to `undefined` and throwing `Field 'timeout', Invalid duration format, failed to parse seconds"`.

### Changed

- Dramatically decrease the memory footprint of the user backup, making `memory` usage unnecessary.

- Updated dependencies to the latest supported versions.

### Added

- Added list files endpoint to the agent API that will help with Realtime Database backup integration and check for the backups' status (storage class, size, etc.)

- Added create storage endpoint to simplify the integration process and automatically create the backups bucket with optimal defaults.

- Added support for managing Backup Fire config with `.env` by setting `BACKUPFIRE_TOKEN` and `BACKUPFIRE_PASSWORD`.

## 1.2.0 - 2021-05-20

### Added

- Added support for Firebase Extension runtime.

- The agent now reports the GAE runtime version.

## 1.1.0 - 2021-04-01

### Changed

- Updated dependencies.

## 1.0.3 - 2021-01-30

### Fixed

- Finally fixed the `memory` option.

### Added

- Added `timeout` option that allows to set the agent timeout in seconds (defaults to `60`; max `540`).

## 1.0.2 - 2021-01-22

### Fixed

- Fixed the `memory` option in the agent that previously wasn't properly applied.

## 1.0.1 - 2021-01-14

### Fixed

- Fixed an issue with `express-jwt` failing without specifying `algorithms`.

## 1.0.0 - 2021-01-13

### Changed

- Upgraded dependencies to address the dependabot alerts.

- Upgraded peer dependency `firebase-admin` to `>=9`.

## 0.19.0 - 2020-10-26

### Added

- Added `memory` to the agent options to allow configuring the memory limit.

## 0.18.0 - 2020-07-17

### Changed

- Accurately detect if the agent code is executed in a non-Functions environment (i.e., emulator or tests code) and suppress warnings.

## 0.17.0 - 2020-07-14

### Fixed

- Prevent intercepting app events and exceptions if the app's also using Sentry.

### Changed

- Improve the behavior of the agent crashed during initialization.

### Added

- Send more information with the ping request: agent and Node.js versions, and the current region.

## 0.16.0 - 2020-06-20

- Upgraded `@google-cloud/firestore` to the latest version (v3).

## 0.15.0 - 2020-06-18

### Changed

- Upgraded `firebase-tools` to the latest version (v8).

## 0.14.0 - 2020-05-27

### Changed

- Unless explicitly specified, make complete Firestore database backup by default.

### Added

- Added the ability to choose between complete and selective Firestore backups.

- Added the ability to specify collection groups when selective Firestore backup is chosen.

## 0.13.0 - 2020-04-12

### Added

- Added the ability to specify the region via `region` option.

## 0.12.0 - 2019-12-22

### Changed

- Ignore the emulator environment.

- Improve exceptions tracking:
  - Stop automatic exception tracking to prevent accidental user data leaks.
  - Send additional information that could help with debugging (user ID, project ID, Node.js version).
  - General improvements.

## 0.11.0 - 2019-12-20

### Added

- Added README and license.

## 0.10.0 - 2019-11-25

### Changed

- **BREAKING**: Use `module.exports` to export the agent for CommonJS. If you import the agent using `require('@backupfire/firebase').default` you'll need to drop `.default`.

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
