import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import webpush from 'web-push'
import { readEnvValue, upsertEnvValues } from './env-file.js'

// Usage:
//   pnpm --filter backend push:vapid                  print a new key pair
//   pnpm --filter backend push:vapid --write          save it to packages/backend/.env
//   pnpm --filter backend push:vapid --write --force  replace keys that are already set
//
// Replacing keys invalidates every existing push subscription: browsers keep
// the old public key, so users have to subscribe again.

const args = new Set(process.argv.slice(2))
const write = args.has('--write')
const force = args.has('--force')
const envPath = resolve(process.cwd(), '.env')

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

if (!write) {
    console.log('Add these lines to packages/backend/.env (the private key is a secret):\n')
    console.log(`VAPID_PUBLIC_KEY="${publicKey}"`)
    console.log(`VAPID_PRIVATE_KEY="${privateKey}"`)
    console.log('\nOr run with --write to save them to .env automatically.')
    process.exit(0)
}

const content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''

if (!force && readEnvValue(content, 'VAPID_PRIVATE_KEY') !== '') {
    console.error(
        `VAPID keys are already set in ${envPath}. Replacing them breaks existing push ` +
            'subscriptions; pass --force if you really want new keys.',
    )
    process.exit(1)
}

writeFileSync(
    envPath,
    upsertEnvValues(content, { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey }),
)
console.log(`VAPID keys written to ${envPath}`)
console.log(`VAPID_PUBLIC_KEY="${publicKey}"`)
console.log('Restart the backend to apply them.')
