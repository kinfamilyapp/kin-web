#!/usr/bin/env node
// scripts/generate-vapid-keys.js
// Run once: node scripts/generate-vapid-keys.js
// Then copy the output into your .env and Supabase secrets

import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('\n✅ VAPID Keys generated!\n')
console.log('─── Add to your .env file ───────────────────────────')
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log('')
console.log('─── Add to Supabase Edge Function secrets ───────────')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:hello@flockfamily.app`)
console.log('')
console.log('─── Supabase CLI commands ────────────────────────────')
console.log(`supabase secrets set VAPID_PUBLIC_KEY="${keys.publicKey}"`)
console.log(`supabase secrets set VAPID_PRIVATE_KEY="${keys.privateKey}"`)
console.log(`supabase secrets set VAPID_SUBJECT="mailto:hello@flockfamily.app"`)
console.log('')
