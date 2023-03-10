# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].
This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: https://semver.org
[keep a changelog]: https://keepachangelog.com

## v1.6.0 - 2023-03-10

### Changed

- Upgraded the Node.js runtime from v16 to v18.

- Bumped the default RAM to 1Gb RAM and set the timeout to 9 minutes. It solves the problem with the huge users' backups that either run out of memory or timeout.

- Set function invoker to public, to avoid [random permission bug](https://github.com/firebase/firebase-tools/issues/3965#issuecomment-1006005316).

- Upgraded firebase-functions and firebase-admin.

## v1.5.0 - 2023-02-28

### Changed

- The version now match the agent npm package version.

### Added

- Added logging to the agent endpoints to help with debugging and troubleshooting.

## v1.1.0 - 2022-08-03

### Changed

- Dramatically decrease the memory footprint of the user backup, making `memory` usage unnecessary.

- Updated dependencies to the latest supported versions.

### Added

- Added support for more Firestore location regions.

- Added list files endpoint to the agent API that will help with Realtime Database backup integration and check for the backups' status (storage class, size, etc.)

- Added create storage endpoint to simplify the integration process and automatically create the backups bucket with optimal defaults.

## v1.0.0 - 2021-09-27

### Fixed

- Fixed missing `datastore.viewer` role that allows fetching the list of collections needed to perform selective backups.

## v0.2.0 - 2021-05-20

Initial version.
