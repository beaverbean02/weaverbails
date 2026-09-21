# @weaver/baileys

A high-performance WhatsApp Web library built on [Baileys](https://github.com/WhiskeySockets/Baileys), with critical paths accelerated via a [Rust WASM bridge](https://github.com/7ucg/whatsapp-rust-bridge).

<p align="center">
  <img alt="package" src="https://img.shields.io/badge/package-%40zeppeliorg%2Fwbails-25D366?style=for-the-badge&logo=whatsapp&logoColor=white">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.9-blue?style=for-the-badge">
</p>
<p align="center">
  <a href="https://t.me/XzC_Information"><img alt="Telegram" src="https://img.shields.io/badge/Telegram-XzC__Information-26A5E4?style=for-the-badge&logo=telegram&logoColor=white"></a>
  <a href="https://github.com/XazepysK"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-XazepysK-181717?style=for-the-badge&logo=github&logoColor=white"></a>
</p>

| | |
|---|---|
| 📦 **Package** | `@weaver/baileys` |
| 🏷️ **Version** | `1.1.9` |
| ☕ **Donation** | [www.zeppeli.my.id/](https://www.zeppeli.my.id) |
| 💬 **Telegram** | [t.me/XzC_Information](https://t.me/XzC_Information) |
| 🐙 **GitHub** | [github.com/XazepysK](https://github.com/XazepysK) |

---

## Index

- [What's Different](#whats-different)
- [Installation](#installation)
  - [Running on Termux / Android](#running-on-termux--android)
  - [Running on Pterodactyl](#running-on-pterodactyl)
- [Connecting Account](#connecting-account)
  - [QR Code](#qr-code)
  - [Pairing Code](#pairing-code)
  - [Receive Full History](#receive-full-history)
- [Socket Config Notes](#socket-config-notes)
- [Saving & Restoring Sessions](#saving--restoring-sessions)
- [Handling Events](#handling-events)
  - [Text Routing (onText / hears / command)](#text-routing-onText--hears--command)
- [Anti-Ban System](#anti-ban-system)
  - [RateLimiter](#ratelimiter--throttle-outbound-messages)
  - [WarmUp](#warmup--gradual-daily-limit-increase-for-new-numbers)
  - [HealthMonitor](#healthmonitor--detect-ban-risk)
  - [TimelockGuard](#timelockguard--handle-wa-463-reachout-blocks)
  - [PresenceChoreographer](#presencechoreographer--human-like-typing-simulation)
  - [wrapSocket](#wrapsocket--apply-all-anti-ban-layers-at-once)
- [Sending Messages](#sending-messages)
  - [Text & Basic](#text--basic)
  - [Buttons & Interactive](#buttons--interactive)
  - [Media](#media)
  - [Meta AI / Rich Responses](#meta-ai--rich-responses)
  - [Rich menu and Bloks widget helpers](#rich-menu-and-bloks-widget-helpers)
  - [Status / Stories](#status--stories)
- [Modifying Messages](#modifying-messages)
- [Manipulating Media](#manipulating-media)
- [Groups](#groups)
- [Privacy](#privacy)
- [User Queries](#user-queries)
- [Change Profile](#change-profile)
- [Chat Modifiers](#chat-modifiers)
- [MEX — WhatsApp's Internal GraphQL](#mex--whatsapps-internal-graphql)
- [Writing Custom Functionality](#writing-custom-functionality)
- [Extra Utilities](#extra-utilities)
  - [Sticker Maker](#sticker-maker)
  - [Auto-Cache View-Once Media](#auto-cache-view-once-media)
  - [Folder-Based Command Loader](#folder-based-command-loader)
  - [Multi-Account Session Pool](#multi-account-session-pool)
  - [Store Auto-Save, Message Limits & Encryption](#store-auto-save-message-limits--encryption)
- [Rust WASM Bridge](#rust-wasm-bridge)

---

## MEX — WhatsApp's Internal GraphQL

All WhatsApp features (privacy, passkeys, profiles, usernames, integrity checks, …) run over MEX — WhatsApp's GraphQL-over-WebSocket protocol. Every method is available directly on your socket:

```js
// Privacy
await sock.setPrivacySetting('LAST_SEEN', 'CONTACTS')   // UPPERCASE enums
await sock.updateGroupsAddPrivacy('contact_blacklist')   // lowercase IQ helpers also available

// Contact integrity — verify a JID is on WhatsApp before opening a chat
const result = await sock.contactIntegrityQuery(['491234567890@s.whatsapp.net'])

// Username lookup
const user = await sock.findUserByUsername('zepysk')
// { jid: '49123456789@s.whatsapp.net', contact: false } or null

// About text
const abouts = await sock.getTextStatusList(['491234567890@s.whatsapp.net'])

// Error handling — all MEX methods throw Boom on failure
try {
    await sock.setPrivacySetting('LAST_SEEN', 'NONE')
} catch (err) {
    // err.output.statusCode: 400 bad request, 403 not available, 404 not found
}
```

See [MEX.md](documentation/MEX.md) for full documentation.

---

## Feature Documentation

| Topic | File |
|-------|------|
| MEX — WhatsApp's internal GraphQL protocol | [MEX.md](documentation/MEX.md) |
| USync — Bulk user data queries (devices, status, picture, LID) | [USYNC.md](documentation/USYNC.md) |
| HTTPS GraphQL — Meta AI, Events, Payments | [GRAPHQL.md](documentation/GRAPHQL.md) |
| Privacy, Profile & Account | [PRIVACY.md](documentation/PRIVACY.md) |
| Registration, Passkeys & Account Management | [REGISTRATION.md](documentation/REGISTRATION.md) |
| Managed Accounts, Payments Passkey & IPLS | [MANAGED-ACCOUNT.md](documentation/MANAGED-ACCOUNT.md) |
| Communities & AI Groups | [COMMUNITIES.md](documentation/COMMUNITIES.md) |
| Interoperability (BirdyChat, Haiket, DMA) | [INTEROP.md](documentation/INTEROP.md) |
| Username (`@username`) | [USERNAME.md](documentation/USERNAME.md) |
| Anti-Ban System | [ANTIBAN.md](documentation/ANTIBAN.md) |
| Ban & Enforcement System (APK internals) | [BAN-SYSTEM.md](documentation/BAN-SYSTEM.md) |
| WhatsApp Protocol Reference (APK namespaces) | [PROTOCOLS.md](documentation/PROTOCOLS.md) |
| WA-Web Protocol Port (chat-block, call links, group settings, coexistence) | [WA-WEB-PORT.md](documentation/WA-WEB-PORT.md) |

---

## What's Different

**Performance — Rust WASM**

| Area | Upstream Baileys | This fork |
|---|---|---|
| Binary decode | JS | Rust WASM |
| Noise handshake | JS | Rust WASM |
| AES / HMAC / HKDF | JS (`crypto`) | Rust WASM |
| Signal protocol | `libsignal-node` | Rust WASM |

**Extra Features**

| Feature | Notes |
|---|---|
| Meta AI / msmsg decrypt | Full `messageSecret`-encrypted AI message decryption |
| Meta AI message handling | Receive and process Meta AI bot responses |
| Rich AI composer | Send tables, lists, code blocks, LaTeX via Meta AI format |
| Interactive buttons | List, reply, template, cards, product list, PIX/PAY |
| Interop (FB/IG) | Near-parity with mobile & web for cross-platform JIDs |
| Anti-ban measures | Connection fingerprinting aligned with official clients |
| Album messages | Send multiple media as an album |
| Sticker packs | Sticker pack message support |
| Newsletter messages | Follower invite messages |
| WA-Web protocol port | Chat-block toggle, call-link waiting room, community sub-group ops, group sharing settings, business eligibility, opt-out/push, coexistence events — [WA-WEB-PORT.md](documentation/WA-WEB-PORT.md) |
| Top-level call signalling | Emits `call` for both `<call>`-wrapped and top-level `<offer>`/`<terminate>` stanzas (+ acks them) |

---

## Installation

```bash
npm install @weaver/baileys
# or
yarn add @weaver/baileys
```

**Requirements:** Node.js ≥ 20

**Optional peer dependencies:**

| Package | Purpose |
|---|---|
| `sharp` | Image processing / thumbnails |
| `jimp` | Fallback image processing |
| `audio-decode` | Voice message metadata |
| `link-preview-js` | Link preview generation |

### Running on Termux / Android

```bash
pkg install nodejs-lts
npm install @weaver/baileys
```

`whatsapp-rust-bridge` compiles to **WASM**, not a platform-specific native binary, and
ships a prebuilt `.wasm` artifact — so a normal `npm install` typically works on Termux
without installing a Rust toolchain at all (WASM bytecode runs the same on ARM, x86,
etc., unlike a native N-API `.node` addon). It's still marked as an **optional**
dependency as a safety net: on the rare setup where the prebuilt doesn't load (very old
CPUs lacking WASM SIMD, an unusual libc, etc.), `npm install` will **not** fail, and the
package still loads and works:

- MD5, SHA-256, HMAC-SHA256, AES-GCM/CTR/CBC, and HKDF transparently fall back to
  Node's built-in `crypto` module — no functionality lost, no native module needed.
- WABinary node encoding/decoding fall back to a pure-JS implementation.
- **X25519 key exchange and XEdDSA signing** (used for identity/pre-key generation
  and signing) also fall back to pure JS — X25519 itself via Node's own built-in
  `crypto` (native, audited), and XEdDSA signing via a small hand-written
  Edwards-curve implementation validated against the official RFC 8032 Ed25519 test
  vectors and hundreds of randomized Montgomery↔Edwards interop checks (see
  `Utils/curve25519-js.js`).
- **The Noise handshake and the Signal Double Ratchet session** genuinely need the
  module (hand-rolling a full protocol session state machine from scratch is a much
  larger correctness/security risk than a single curve operation, so there's no JS
  fallback for these). Without the native module, connecting a WhatsApp session will
  throw a clear error rather than silently failing — everything else (stickers, the
  in-memory store, USync helpers, the command loader, session pool, key generation,
  etc.) keeps working.

If you ever do need to build it from source (e.g. `WHATSAPP_RUST_BRIDGE_SKIP_PREBUILT=1`):

```bash
pkg install rust binutils
npm install @weaver/baileys
```

> **Note:** some published versions of the bridge ship a `package.json` whose
> `"exports"` map is missing a `.` entry, which makes a plain `require()` throw
> `ERR_PACKAGE_PATH_NOT_EXPORTED` even though the module itself works fine. This
> package works around that automatically (it locates the installed module's real
> entry file and requires it directly) — no action needed on your end.

Other Termux notes:
- `sharp` needs `pkg install libvips` to build; if that's not available, install
  `jimp` instead (`npm install jimp`) — it's a pure-JS fallback used automatically.
- Animated stickers (`videoToWebpSticker`) need `ffmpeg` on PATH: `pkg install ffmpeg`.

### Running on Pterodactyl

Works fine on a standard Node.js egg — Pterodactyl containers are normal x86_64 Linux
(Debian/Alpine-based) Docker images, which is the best-supported target for both the
prebuilt WASM bridge and `sharp`'s prebuilt binaries. Checklist:

- Pick a **Node.js ≥ 20** egg/variable (the package's `engines` field enforces this).
- If you want animated stickers, make sure `ffmpeg` is available in the container —
  either an egg/image that already bundles it, or add an install script step
  (`apt-get install -y ffmpeg` on Debian-based yolks). Static stickers only need
  `sharp`, which installs normally.
- Persistent storage: point `useMultiFileAuthState`/the store's `writeToFile` at a path
  under the server's data volume so sessions survive container restarts/reinstalls.
- If the egg's image is Alpine/musl-based rather than Debian/glibc-based, the
  prebuilt WASM/`sharp` binaries are less likely to match — everything still installs
  (thanks to the fallbacks above), but a live connection needs the native bridge to
  work, so prefer a glibc-based Node image if you have the choice.

---

## Connecting Account

### QR Code

```js
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@weaver/baileys')
const { Boom } = require('@hapi/boom')

const { state, saveCreds } = await useMultiFileAuthState('./auth')

const sock = makeWASocket({ auth: state, printQRInTerminal: true })

sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
        const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) connect()
    }
})
```

### Pairing Code

```js
const sock = makeWASocket({ auth: state, printQRInTerminal: false })

if (!state.creds.registered) {
    const code = await sock.requestPairingCode('49123456789') // phone number without +
    console.log('Pairing code:', code)
}
```

### Receive Full History

```js
const sock = makeWASocket({
    auth: state,
    syncFullHistory: true
})
```

---

## Socket Config Notes

```js
const sock = makeWASocket({
    auth: state,

    // Cache group metadata to reduce WA queries (recommended)
    cachedGroupMetadata: async (jid) => groupCache.get(jid),

    // Improve retry system and enable poll vote decryption
    getMessage: async (key) => store.getMsg(key),

    // Suppress notifications on the phone while connected
    markOnlineOnConnect: false,
})
```

---

## Saving & Restoring Sessions

```js
const { useMultiFileAuthState } = require('@weaver/baileys')

const { state, saveCreds } = await useMultiFileAuthState('./auth')
// Pass state to makeWASocket, call saveCreds on creds.update
sock.ev.on('creds.update', saveCreds)
```

---

## Handling Events

### Messages

```js
// New or received messages
sock.ev.on('messages.upsert', ({ messages, type }) => { })
```

> **Prefer routing by text pattern instead of parsing `messages.upsert` by hand?**
> Every socket also comes with Telegraf/node-telegram-bot-api-style helpers — see
> [`onText` / `hears` / `command`](#text-routing-onText--hears--command) below.

```js
// Status updates (read receipts, delivery, edits, reactions)
sock.ev.on('messages.update', updates => { })

// Message deleted / cleared
sock.ev.on('messages.delete', ({ keys }) => { })

// Media decryption key update
sock.ev.on('messages.media-update', updates => { })

// Reaction on a message
sock.ev.on('messages.reaction', reactions => { })

// Comment on a message
sock.ev.on('message.comment', ({ message, comment }) => { })

// Message quarantined by WA
sock.ev.on('message.quarantined', ({ message }) => { })

// Poll — new option added
sock.ev.on('poll.add-option', ({ key, senderTimestampMs }) => { })
```

### Text Routing (`onText` / `hears` / `command`)

Every socket returned by `makeWASocket()` already has these — no wrapping or setup
needed. They're built on top of `messages.upsert` internally (one shared listener
regardless of how many routes you add), so you don't have to parse
`msg.message.conversation` / `extendedTextMessage.text` / captions by hand.

```js
// RegExp — handler gets (msg, match), match = pattern.exec(text)
sock.onText(/^ping$/i, (msg, match) => {
    sock.sendMessage(msg.key.remoteJid, { text: 'pong' }, { quoted: msg })
})

// Exact string match
sock.hears('menu', (msg) => {
    sock.sendMessage(msg.key.remoteJid, { text: '1. Foo\n2. Bar' })
})

// Slash commands — matches /start, /start@BotName, /start extra args
// match[1] is whatever comes after the command (or undefined)
sock.command('start', (msg, match) => {
    sock.sendMessage(msg.key.remoteJid, { text: `Started with: ${match[1] ?? '(no args)'}` })
})

// Multiple aliases for one command
sock.command(['help', 'h'], (msg) => {
    sock.sendMessage(msg.key.remoteJid, { text: 'Available commands: ...' })
})
```

All three (`onText`, `hears`, `command`) return an unsubscribe function:

```js
const stop = sock.onText(/^bye$/i, (msg) => { /* ... */ })
stop() // removes just this route
```

### Chats & Contacts

```js
sock.ev.on('chats.upsert', chats => { })
sock.ev.on('chats.update', chats => { })
sock.ev.on('chats.delete', ids => { })
sock.ev.on('chats.lock', ({ id, locked }) => { })

sock.ev.on('contacts.upsert', contacts => { })
sock.ev.on('contacts.update', contacts => { })

// Blocklist changed
sock.ev.on('blocklist.update', ({ blocklist, type }) => { })
```

### Groups

```js
sock.ev.on('groups.upsert', groups => { })
sock.ev.on('groups.update', updates => { })
sock.ev.on('group-participants.update', ({ id, participants, action }) => { })

// Someone requested to join
sock.ev.on('group.join-request', ({ id, participant, action }) => { })

// Member tag / mention update
sock.ev.on('group.member-tag.update', ({ id, participant }) => { })
```

### Newsletters

```js
sock.ev.on('newsletter-settings.update', update => { })
sock.ev.on('newsletter-participants.update', update => { })
sock.ev.on('newsletter.reaction', update => { })
sock.ev.on('newsletter.view', update => { })
sock.ev.on('newsletter.live-update', update => { })
sock.ev.on('newsletter.pin', update => { })
sock.ev.on('newsletter.invite', update => { })
```

### Connection & Auth

```js
sock.ev.on('connection.update', ({ connection, qr, lastDisconnect, isOnline, reachoutTimeLock }) => { })
sock.ev.on('creds.update', saveCreds)

// Security alert (e.g. linked device removed)
sock.ev.on('security.alert', data => { })

// Identity key change for a contact
sock.ev.on('identity.update', ({ jid }) => { })

// Server config received
sock.ev.on('server.config', config => { })
```

### Calls

```js
// `call` fires for both <call>-wrapped and top-level (<offer>/<terminate>) signalling
sock.ev.on('call', calls => { })
sock.ev.on('call.scheduled', ({ call }) => { })
sock.ev.on('call.schedule-cancelled', ({ call }) => { })

// Call links — create + toggle the link's waiting room
const token = await sock.createCallLink('audio')
await sock.toggleCallLinkWaitingRoom(token, true, 'audio')

// WA-Web coexistence (FB/IG) & business privacy-sync pushes
sock.ev.on('coexistence.update', u => { })  // { kind: 'onboarding' | 'offboarding', status?, productSurface? }
sock.ev.on('business.privacy-settings-sync', s => { })
```

### Labels

```js
sock.ev.on('labels.edit', ({ label }) => { })
sock.ev.on('labels.association', ({ association, type }) => { })
sock.ev.on('labels.reorder', ({ labelIds }) => { })
```

### Presence & Devices

```js
sock.ev.on('presence.update', ({ id, presences }) => { })
sock.ev.on('devices.update', ({ id, devices, isSelf }) => { })
```

### Bot / Meta AI

```js
sock.ev.on('bot.feedback', ({ message }) => { })
sock.ev.on('bot.stop-generation', ({ message }) => { })
sock.ev.on('bot.welcome-request', ({ message }) => { })
sock.ev.on('bot.psi-metadata', ({ message }) => { })
sock.ev.on('bot.query-fanout', ({ message }) => { })
sock.ev.on('bot.media-collection', ({ message }) => { })
sock.ev.on('bot.memu-onboarding', ({ message }) => { })
```

### Sync & Settings

```js
sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => { })
sock.ev.on('messaging-history.status', ({ progress, hasMore }) => { })
sock.ev.on('settings.update', ({ setting, value }) => { })
sock.ev.on('lid-mapping.update', ({ lid, pn }) => { })
sock.ev.on('status.psa', ({ message }) => { })
sock.ev.on('status.mention', ({ message }) => { })
sock.ev.on('media.notify', ({ message }) => { })
sock.ev.on('reminder.update', ({ message }) => { })
sock.ev.on('payment.split', ({ message }) => { })
sock.ev.on('payment.reminder', ({ message }) => { })
sock.ev.on('cloud.thread.control', ({ message }) => { })
sock.ev.on('galaxy.flow.completed', ({ message }) => { })
```

### Decrypt Poll Votes

```js
const { getAggregateVotesInPollMessage } = require('@weaver/baileys')

sock.ev.on('messages.update', async updates => {
    for (const { key, update } of updates) {
        if (update.pollUpdates) {
            const pollCreation = await getMessage(key)
            if (pollCreation) {
                const votes = getAggregateVotesInPollMessage({ message: pollCreation, pollUpdates: update.pollUpdates })
                console.log(votes)
            }
        }
    }
})
```

---

## Anti-Ban System

Import from `@weaver/baileys/src/antiban.js`:

```js
const {
    AntiBan, RateLimiter, WarmUp, HealthMonitor,
    TimelockGuard, ReplyRatioGuard, ContactGraphWarmer,
    PresenceChoreographer, PostReconnectThrottle,
    RetryReasonTracker, LidResolver, JidCanonicalizer,
    MessageQueue, Scheduler, wrapSocket
} = require('@weaver/baileys/src/antiban')
```

### RateLimiter — throttle outbound messages

```js
const limiter = new RateLimiter({
    maxPerMinute: 8,
    maxPerHour: 200,
    maxPerDay: 1500,
    minDelayMs: 1500,
    maxDelayMs: 5000,
    newChatDelayMs: 3000
})

const delay = await limiter.getDelay(jid, text)
if (delay === -1) return // blocked
if (delay > 0) await sleep(delay)

await sock.sendMessage(jid, { text })
limiter.record(jid, text)
```

### WarmUp — gradual daily limit increase for new numbers

```js
const warmup = new WarmUp({ warmUpDays: 7, day1Limit: 20, growthFactor: 1.8 })

if (!warmup.canSend()) return
await sock.sendMessage(jid, { text })
warmup.record()

console.log(warmup.getStatus())
// { phase: 'warming', day: 2, todayLimit: 36, todaySent: 12, progress: 28 }
```

### HealthMonitor — detect ban risk

```js
const health = new HealthMonitor({ autoPauseAt: 'high' })

sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') health.recordDisconnect(lastDisconnect?.error)
    if (connection === 'open') health.recordReconnect()
})

const status = health.getStatus()
// { risk: 'low'|'medium'|'high'|'critical', score, recommendation, stats }

if (health.isPaused()) return // auto-pauses at configured risk level
```

### TimelockGuard — handle WA 463 reachout blocks

```js
const guard = new TimelockGuard()

// Feed connection.update events
sock.ev.on('connection.update', ({ reachoutTimeLock }) => {
    if (reachoutTimeLock) guard.onTimelockUpdate(reachoutTimeLock)
})

// Check before sending to new contacts
const { allowed, reason } = guard.canSend(jid)
if (!allowed) return console.log(reason)
```

### PresenceChoreographer — human-like typing simulation

```js
const choreo = new PresenceChoreographer({
    enabled: true,
    typingWPM: 45,
    enableCircadianRhythm: true,
    timezone: 'Europe/Berlin'
})

const plan = choreo.computeTypingPlan(text.length)
await choreo.executeTypingPlan(sock, jid, plan)
await sock.sendMessage(jid, { text })
```

### wrapSocket — apply all anti-ban layers at once

```js
const { wrapSocket, resolveConfig, PRESETS } = require('@weaver/baileys/src/antiban')

const wrappedSock = wrapSocket(sock, resolveConfig(PRESETS.SAFE))
// All outbound sendMessage calls are now automatically rate-limited,
// presence-simulated, and timelock-aware.
```

---

## Sending Messages

### Text & Basic

```js
// Text
await sock.sendMessage(jid, { text: 'Hello!' })

// Quote
await sock.sendMessage(jid, { text: 'Reply' }, { quoted: msg })

// Mention
await sock.sendMessage(jid, { text: '@49123456789', mentions: ['49123456789@s.whatsapp.net'] })

// Forward
await sock.sendMessage(jid, { forward: msg })

// Location
await sock.sendMessage(jid, { location: { degreesLatitude: 52.5, degreesLongitude: 13.4 } })

// Live Location
await sock.sendMessage(jid, {
    liveLocation: { degreesLatitude: 52.5, degreesLongitude: 13.4 },
    accuracyInMeters: 10,
    speedInMps: 0,
    degreesClockwisefromMagneticNorth: 0,
    caption: 'Live',
    sequenceNumber: 1
})

// Contact
await sock.sendMessage(jid, { contacts: { displayName: 'Name', contacts: [{ vcard: '...' }] } })
```

### Rich Response (table / code / latex / images)

Renders as WhatsApp's native AI-assistant-style rich card (the same UI Meta AI uses
for search results). `table` accepts either a plain 2D array (first row = header) or
`{ rows: [...] }`.

```js
await sock.sendMessage(jid, {
    richResponse: {
        text: 'XazepysK',
        table: [
            ['header1', 'header2'],
            ['X1', 'X2']
        ],
        // code: 'console.log("hi")', language: 'javascript',
        // latex: 'x^2 + y^2 = z^2',
        // imageUrl: 'https://...', // or imageUrls: ['https://...', ...]
        // map: { latitude: 52.5, longitude: 13.4, zoom: 14, title: 'Berlin' }
    }
}, { /* opts */ })
```

```js
// Reaction
await sock.sendMessage(jid, { react: { text: '👍', key: msg.key } })

// Pin
await sock.sendMessage(jid, { pin: { type: 1, time: 86400, key: msg.key } })

// Poll
await sock.sendMessage(jid, {
    poll: { name: 'Vote?', values: ['Yes', 'No'], selectableCount: 1 }
})

// Call
await sock.sendMessage(jid, { call: { callId: '...', callType: 'audio' } })
```

### Buttons & Interactive

```js
// Reply buttons
await sock.sendMessage(jid, {
    buttonsMessage: {
        text: 'Choose:',
        buttons: [
            { buttonId: '1', buttonText: { displayText: 'Option A' } },
            { buttonId: '2', buttonText: { displayText: 'Option B' } }
        ]
    }
})

// List message
await sock.sendMessage(jid, {
    listMessage: {
        title: 'Menu',
        description: 'Pick one',
        buttonText: 'Open',
        listType: 1,
        sections: [{
            title: 'Section',
            rows: [{ title: 'Item 1', rowId: 'item1' }]
        }]
    }
})

// Template buttons
await sock.sendMessage(jid, {
    templateMessage: {
        hydratedTemplate: {
            hydratedContentText: 'Hello',
            hydratedButtons: [
                { quickReplyButton: { displayText: 'Yes', id: 'yes' } },
                { urlButton: { displayText: 'Visit', url: 'https://example.com' } }
            ]
        }
    }
})

// Interactive message
await sock.sendMessage(jid, {
    interactiveMessage: {
        body: { text: 'Choose' },
        footer: { text: 'Footer' },
        nativeFlowMessage: {
            buttons: [{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Yes', id: 'yes' }) }]
        }
    }
})
```

### Media

```js
// Image
await sock.sendMessage(jid, { image: { url: './image.jpg' }, caption: 'Caption' })

// Video
await sock.sendMessage(jid, { video: { url: './video.mp4' }, caption: 'Video' })

// Audio
await sock.sendMessage(jid, { audio: { url: './audio.mp3' }, mimetype: 'audio/mp4' })

// Voice note (PTT)
await sock.sendMessage(jid, { audio: { url: './audio.ogg' }, mimetype: 'audio/ogg; codecs=opus', ptt: true })

// GIF
await sock.sendMessage(jid, { video: { url: './anim.mp4' }, gifPlayback: true })

// PTV (video note)
await sock.sendMessage(jid, { video: { url: './clip.mp4' }, ptv: true })

// View once
await sock.sendMessage(jid, { image: { url: './secret.jpg' }, viewOnce: true })

// Album
await sock.sendAlbumMessage(jid, [
    { image: { url: './1.jpg' } },
    { image: { url: './2.jpg' } },
    { video: { url: './3.mp4' } }
], { caption: 'Album' })
```

### Meta AI / Rich Responses

```js
// Rich AI response helpers
await sock.sendTable(jid, 'Values', ['Name', 'Value'], [['Foo', '1'], ['Bar', '2']])
await sock.sendList(jid, 'Items', ['Item 1', 'Item 2', 'Item 3'])
await sock.sendCodeBlock(jid, 'console.log("hello")')
await sock.sendRichMessage(jid, [{ messageType: 'AI_RICH_RESPONSE_TEXT', messageText: 'Hello' }])

// Capture and resend a decoded unified response
const captured = sock.captureUnifiedResponse(metaAiMsg)
await sock.sendUnifiedResponse(jid, undefined, captured)
```

### Rich menu and Bloks widget helpers

The Weaver socket also exposes small builders for the fork's rich-menu and
`interactiveMessage.bloksWidget` structures. They relay through the normal
socket path and return the generated `WebMessageInfo`.

```js
await sock.richMenu(jid, {
    header: { title: 'Menu' },
    body: {
        title: 'Choose an option',
        buttons: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]
    },
    footer: { text: 'Open website', url: 'https://example.com' }
})

await sock.sendBloksWidget(jid, {
    data: JSON.stringify({ type: 'example' }),
    type: 'im_a2ui',
    fallback: 'This widget is unavailable on this client.'
}, { bodyText: 'Widget' })
```

`sock.bloksWidget` is an alias for `sock.sendBloksWidget`. Username methods
such as `checkUsername`, `setUsername`, `findUserByUsername`, and
`fetchContactUsernames` are already available on the socket.

### Status / Stories

```js
// Status with mentions
await sock.sendMessage('status@broadcast', {
    text: 'Hello @49123',
    mentions: ['49123@s.whatsapp.net'],
    statusMentionedJids: ['49123@s.whatsapp.net']
})

// Status sticker interaction
await sock.sendMessage('status@broadcast', {
    stickerInteraction: { sticker: { url: './sticker.webp' }, reactionKey: msg.key }
})

// Quote a status
await sock.sendMessage(jid, { text: 'Reply to status' }, { quoted: statusMsg })
```

---

## Modifying Messages

```js
// Delete for everyone
await sock.sendMessage(jid, { delete: msg.key })

// Edit
await sock.sendMessage(jid, { edit: msg.key, text: 'Updated text' })
```

---

## Manipulating Media

```js
const { downloadMediaMessage } = require('@weaver/baileys')

// Download
const buffer = await downloadMediaMessage(msg, 'buffer', {})

// Re-upload to WhatsApp
const { url } = await sock.waUploadToServer(buffer, { mimetype: 'image/jpeg' })
```

---

## Groups

```js
// Create
const group = await sock.groupCreate('Name', ['49123@s.whatsapp.net'])

// Add / Remove / Promote / Demote
await sock.groupParticipantsUpdate(jid, ['49123@s.whatsapp.net'], 'add')    // add | remove | promote | demote

// Change name
await sock.groupUpdateSubject(jid, 'New Name')

// Change description
await sock.groupUpdateDescription(jid, 'Description')

// Change settings
await sock.groupSettingUpdate(jid, 'announcement')  // announcement | not_announcement | locked | unlocked

// Leave
await sock.groupLeave(jid)

// Invite link
const code = await sock.groupInviteCode(jid)
await sock.groupRevokeInvite(jid)
await sock.groupAcceptInvite(code)

// Metadata (now also returns memberShareHistoryMode, memberLinkMode, limitSharing)
const meta = await sock.groupMetadata(jid)

// Join requests
const requests = await sock.groupRequestParticipantsList(jid)
await sock.groupRequestParticipantsUpdate(jid, ['49123@s.whatsapp.net'], 'approve')  // approve | reject

// All groups
const all = await sock.groupFetchAllParticipating()

// Ephemeral
await sock.groupToggleEphemeral(jid, 86400)  // seconds, 0 = off

// Acknowledge a group
await sock.groupAcknowledge(jid)

// Communities — linked/sub-group participants, join a sub-group, batch profile pictures
const linkedParts = await sock.groupGetLinkedParticipants(communityJid)
await sock.groupJoinLinked(communityJid, subGroupJid)
const pics = await sock.getGroupProfilePictures([jid1, jid2], 'preview')
```

---

## Privacy

```js
// Block / Unblock
await sock.updateBlockStatus(jid, 'block')  // block | unblock

// Get settings
const privacy = await sock.fetchPrivacySettings()
// { last: 'all', online: 'all', profile: 'contacts', groupadd: 'all', calladd: 'all', ... }

// Force fresh fetch (bypass cache)
const fresh = await sock.fetchPrivacySettings(true)

// Get blocklist
const list = await sock.fetchBlocklist()

// Update individual settings (IQ-based, lowercase values, works on all accounts)
await sock.updateLastSeenPrivacy('contacts')           // all | contacts | contact_blacklist | none
await sock.updateOnlinePrivacy('all')
await sock.updateProfilePicturePrivacy('contacts')
await sock.updateStatusPrivacy('contacts')
await sock.updateReadReceiptsPrivacy('all')
await sock.updateGroupsAddPrivacy('contacts')
await sock.updateCallPrivacy('all')
await sock.updateDefaultDisappearingMode(86400)        // seconds, 0 = off

// Set via MEX GraphQL (UPPERCASE values required)
await sock.setPrivacySetting('LAST_SEEN', 'CONTACTS')
await sock.setPrivacySetting('GROUPS', 'CONTACT_BLACKLIST')
await sock.setPrivacySetting('CALLS', 'NONE')

// Manage contact lists for CONTACT_BLACKLIST / CONTACTS settings
await sock.updatePrivacyContactList('groupadd', 'contact_blacklist', [jid1, jid2])
const current = await sock.getPrivacyContactList('groupadd', 'contact_blacklist')

// "Block messages from unknown accounts" toggle (WA Web w:comms:chat)
const blockStatus = await sock.getChatBlockingStatus()   // 'blocked' | 'unblocked'
await sock.updateChatBlockingStatus('block')             // block | unblock

// Pending TOS disclosures · feature opt-out list · push config
const notices = await sock.getUserDisclosures()
const optOut  = await sock.getOptOutList()
const push    = await sock.getPushConfig()
```

See [MEX.md](documentation/MEX.md) for full MEX usage and error handling.

---

## User Queries

```js
// Check if number exists on WA
const results = await sock.onWhatsApp('49123456789')
// results[0] === { jid: '49123456789@s.whatsapp.net', exists: true }

// Profile picture
const ppUrl = await sock.profilePictureUrl(jid, 'image')

// Status text (legacy)
const status = await sock.fetchStatus(jid)

// About text (MEX)
const abouts = await sock.getTextStatusList([jid])
// [{ jid, text: 'Hey there!', emoji: '👋', timestamp: 1234567890 }]

// Business profile
const biz = await sock.getBusinessProfile(jid)

// Presence (typing/online)
await sock.subscribePresence(jid)
sock.ev.on('presence.update', ({ id, presences }) => { })

// Chat history
await sock.fetchMessageHistory(50, oldestMsg.key, oldestMsg.messageTimestamp)

// Find user by @username
const user = await sock.findUserByUsername('someusername')
// { jid: '49123456789@s.whatsapp.net', contact: false } or null

// Verify a JID before opening a chat
const integrity = await sock.contactIntegrityQuery([jid])
```

---

## Change Profile

```js
// Status
await sock.updateProfileStatus('My status')

// Name
await sock.updateProfileName('New Name')

// Picture
await sock.updateProfilePicture(jid, { url: './photo.jpg' })

// Remove picture
await sock.removeProfilePicture(jid)
```

---

## Chat Modifiers

```js
// Archive
await sock.chatModify({ archive: true, lastMessages: [msg] }, jid)

// Mute (ms timestamp)
await sock.chatModify({ mute: Date.now() + 8 * 60 * 60 * 1000 }, jid)

// Mark read/unread
await sock.chatModify({ markRead: false, lastMessages: [msg] }, jid)

// Delete message for me
await sock.chatModify({ clear: { messages: [{ id: msg.key.id, fromMe: msg.key.fromMe }] } }, jid)

// Delete chat
await sock.chatModify({ delete: true, lastMessages: [msg] }, jid)

// Star / Unstar
await sock.chatModify({ star: { messages: [{ id: msg.key.id, fromMe: msg.key.fromMe }], star: true } }, jid)

// Disappearing messages
await sock.sendMessage(jid, { disappearingMessagesInChat: 86400 })
```

---

## Writing Custom Functionality

```js
// Enable debug logs
const sock = makeWASocket({ logger: pino({ level: 'debug' }) })

// Raw websocket events
sock.ws.on('CB:message', node => console.log(node))

// Register callback for specific WA nodes
sock.ws.on('CB:iq,,result', node => { })
```

---

## Extra Utilities

A handful of batteries-included helpers on top of stock Baileys, importable from the
main package (`require('@weaver/baileys')` / top-level `Utils` exports):

### Sticker Maker

```js
const { imageToWebpSticker, videoToWebpSticker } = require('@weaver/baileys')

const stickerBuf = await imageToWebpSticker(imageBuffer, {
	packName: 'My Pack',
	packPublisher: 'Me'
})
await sock.sendMessage(jid, { sticker: stickerBuf })

// animated stickers need ffmpeg on PATH
const animatedBuf = await videoToWebpSticker(videoBuffer, { packName: 'My Pack', packPublisher: 'Me' })
```

### Auto-Cache View-Once Media

Downloads and saves view-once photos/videos/voice notes to disk the moment they arrive,
before the sender's app can mark them as opened.

```js
const { autoCacheViewOnceMedia } = require('@weaver/baileys')

const stop = autoCacheViewOnceMedia(sock, { cacheDir: './viewonce-cache' })
// stop() to remove the listener later
```

### Folder-Based Command Loader

```js
const { createCommandHandler } = require('@weaver/baileys')

createCommandHandler(sock, { commandsDir: './commands', prefix: '.' })
```

```js
// ./commands/ping.js
module.exports = {
	name: 'ping',
	aliases: ['p'],
	async execute({ sock, jid }) {
		await sock.sendMessage(jid, { text: 'pong' })
	}
}
```

### Multi-Account Session Pool

Runs several accounts side by side and auto-reconnects any that drop (except on
logout) with exponential backoff + jitter, instead of hand-rolling a reconnect loop
per project.

```js
const { createSessionPool } = require('@weaver/baileys')

const pool = createSessionPool({
	makeSocket: async sessionId => {
		const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`)
		const sock = makeWASocket({ auth: state })
		sock.ev.on('creds.update', saveCreds)
		return sock
	},
	logger
})

await pool.add('account-1')
await pool.add('account-2')
```

### Store Auto-Save, Message Limits & Encryption

`makeInMemoryStore` now persists **everything** (`chats`, `contacts`, `messages`,
`labels`, `groupMetadata`, `presences`, `state`) instead of a subset, and supports:

```js
const store = makeInMemoryStore({
	socket: sock,
	maxMessagesPerChat: 500, // cap memory usage per chat
	encryptionKey: process.env.STORE_KEY // optional, AES-256-GCM at rest
})

store.readFromFile('./store.json')
const stopAutoSave = store.startAutoSave('./store.json', 30_000) // every 30s + on socket close
```

---



The native module lives at [7ucg/whatsapp-rust-bridge](https://github.com/7ucg/whatsapp-rust-bridge).  
Pre-built and bundled — **no Rust toolchain needed** to use this package.

Functions offloaded to Rust:

| Function | Description |
|---|---|
| `decodeNode` | WABinary protocol decoding |
| `NoiseSession` | Noise_XX_25519_AESGCM_SHA256 handshake + framing |
| `hkdf` | HKDF key derivation |
| `hmacSign` | HMAC-SHA256 signing |
| `sha256` | SHA-256 hashing |
| `aesEncrypt` / `aesDecrypt` | AES-256-CBC |
| `aesEncryptGCM` / `aesDecryptGCM` | AES-256-GCM |
| `aesEncryptCTR` / `aesDecryptCTR` | AES-256-CTR |

---

## License

MIT
