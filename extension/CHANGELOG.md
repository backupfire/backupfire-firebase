# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].
This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: https://semver.org
[keep a changelog]: https://keepachangelog.com

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
