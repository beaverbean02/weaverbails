'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.attachTextRouter = void 0

const extractText = message => {
	if (!message) return ''
	return (
		message.conversation ||
		message.extendedTextMessage?.text ||
		message.imageMessage?.caption ||
		message.videoMessage?.caption ||
		message.documentMessage?.caption ||
		''
	)
}

const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Attaches Telegraf text routing to a socket:
 * `sock.onText(pattern, handler)`, `sock.hears(pattern, handler)` (alias), and
 * `sock.command(name, handler)`, instead of manually parsing every
 * `messages.upsert` event by hand.
 *
 * - `pattern` as a RegExp: handler gets called as `handler(msg, match)` where
 *   `match` is the result of `pattern.exec(text)` (or null if only testing).
 * - `pattern` as a string: matched literally (exact match) against the message
 *   text; `handler(msg, [text])` is called on match.
 * - `sock.command('start', handler)`: matches `/start`, `/start@BotName`, and
 *   `/start extra args`, calling `handler(msg, match)` where `match[1]` is the
 *   text after the command (or undefined).
 *
 * All three return an unsubscribe function. Only one `messages.upsert`
 * listener is registered regardless of how many routes are added.
 */
const attachTextRouter = sock => {
	const routes = []

	const addRoute = (pattern, handler) => {
		const route = { pattern, handler }
		routes.push(route)
		return () => {
			const idx = routes.indexOf(route)
			if (idx !== -1) routes.splice(idx, 1)
		}
	}

	const dispatch = async ({ messages, type }) => {
		if (type !== 'notify' && type !== 'append') return
		for (const msg of messages) {
			if (!msg.message || msg.key.fromMe) continue
			const text = extractText(msg.message)
			if (!text) continue
			for (const route of routes.slice()) {
				let match = null
				if (route.pattern instanceof RegExp) {
					route.pattern.lastIndex = 0
					match = route.pattern.exec(text)
				} else if (typeof route.pattern === 'string') {
					match = text === route.pattern ? [text] : null
				}
				if (!match) continue
				try {
					await route.handler(msg, match)
				} catch (error) {
					sock.logger?.error?.({ error, text }, 'onText/hears handler threw')
				}
			}
		}
	}
	sock.ev.on('messages.upsert', dispatch)

	sock.onText = addRoute
	sock.hears = addRoute
	sock.command = (name, handler) => {
		const names = (Array.isArray(name) ? name : [name]).map(escapeRegExp)
		const pattern = new RegExp(`^/(?:${names.join('|')})(?:@\\S+)?(?:\\s+([\\s\\S]*))?$`, 'i')
		return addRoute(pattern, handler)
	}

	return sock
}
exports.attachTextRouter = attachTextRouter
