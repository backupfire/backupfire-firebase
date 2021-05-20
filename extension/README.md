# Backup Fire agent extension for Firebase

This is open-source core of [Backup Fire](https://backupfire.dev) packed as a Firebase extension, a service that enables automatic backup of Firestore, the Firebase's DB, and Firebase authentication data.

**To setup automatic backups, sign up at [Backup Fire](https://backupfire.dev), create a project, and follow the provided instructions. The examples below are provided only as a reference.**

## Installation

To install the agent extension, please execute the command below in the project directory. You can also specify the project ID using the argument: `--project=PROJECT_ID`.

```bash
firebase ext:install backupfire/backupfire-agent
# or with project ID:
firebase ext:install backupfire/backupfire-agent --project=PROJECT_ID
```

During the installation you'll need to pick:

- Region (pick the same region where your Firestore is deployed).

- Agent token.

- Admin password.

To get the agent token you'll need to sign up and create a project at [Backup Fire](https://backupfire.dev).

## License

[Apache-2.0 © Backup Fire](./LICENSE)
