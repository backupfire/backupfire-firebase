const admin = require('firebase-admin')

admin.initializeApp()

const number = parseInt(process.env.NUMBER)
if (isNaN(number))
  throw new Error('The NUMBER environment variable must be a number')

const auth = admin.auth()

async function main() {
  for (let bunch = 0; bunch < number; bunch++) {
    console.log(`=== Creating users bunch #${bunch} ===`)

    await Promise.all(
      new Array(100).fill(undefined).map((_, i) => {
        const email = `test${bunch}${i}${Date.now()}@backupfire.dev`

        console.log(`...creating user #${bunch}/${i} (${email})`)

        return auth.createUser({
          email,
          password: Date.now().toString(),
          displayName: 'Sasha Clone',
          photoURL:
            'https://pbs.twimg.com/profile_images/979030533719064576/rD33B86M_400x400.jpg',
        })
      })
    )
  }
}

main()
