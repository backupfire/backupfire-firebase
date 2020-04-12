# Backup Fire agent for Firebase

This is open-source core of [Backup Fire](https://backupfire.dev), a service that enables automatic backup of Firestore, the Firebase's DB, and Firebase authentication data.

**To setup automatic backups, sign up at [Backup Fire](https://backupfire.dev), create a project, and follow the provided instructions. The examples below are provided only as a reference.**

## Installation

The library is available as [an npm package](https://www.npmjs.com/package/@backupfire/firebase). To install it, run:

```bash
npm install @backupfire/firebase --save
# or with yarn
yarn add @backupfire/firebase
```

## Usage

**Make sure that you created and activated a project at [Backup Fire](https://backupfire.dev) first**.

JavaScript:

```js
// 1. Import the agent package
const backupfireAgent = require('@backupfire/firebase')

// 2. Create and export the agent
exports.backupfire = backupfireAgent()
```

TypeScript:

```ts
// 1. Import the agent package
import backupfireAgent from '@backupfire/firebase'

// 2. Create and export the agent
export const backupfire = backupfireAgent()
```

Specify the region to deploy the agent function:

```ts
import backupfireAgent from '@backupfire/firebase'

export const backupfire = backupfireAgent({
  // See the list of available regions:
  // https://firebase.google.com/docs/functions/locations
  region: 'europe-west3'
})
```

## License

[BSD 3-Clause © Backup Fire](./LICENSE.md)
