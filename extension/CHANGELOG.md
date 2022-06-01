# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning].
This change log follows the format documented in [Keep a CHANGELOG].

[semantic versioning]: https://semver.org
[keep a changelog]: https://keepachangelog.com

## v1.2.0 - 2022-05-??

### Changed

- Dramatically the memory footprint of the user backup making `memory` usage unnecessary.

### Added

- Added list files endpoint to the agent API that will help with Realtime Database backup integration and checking for the status of the backups (storage class, size, etc.)

- Added create storage endpoint to simplify the integration process and automatically create the backups bucket with optimal defaults.

## v1.0.0 - 2021-09-27

### Fixed

- Fixed missing `datastore.viewer` role that allows fetching the list of collections needed to perform selective backups.

## v0.2.0 - 2021-05-20

Initial version.
