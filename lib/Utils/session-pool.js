'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.createSessionPool = void 0

const DISCONNECT_REASON_LOGGED_OUT = 401

/**
 * Manages multiple Baileys socket instances (one per account/session), automatically
 * restarting any session that disconnects -- except when it was logged out -- using
 * exponential backoff with jitter, instead of every project re-implementing its own
 * reconnect loop.
 *
 * @param {{
 *   makeSocket: (sessionId: string) => Promise<any> | any,
 *   logger?: any,
 *   maxBackoffMs?: number,
 *   onSessionUpdate?: (sessionId: string, sock: any) => void,
 *   onLoggedOut?: (sessionId: string) => void
 * }} options
 * @returns {{
 *   add: (sessionId: string) => Promise<void>,
 *   remove: (sessionId: string) => void,
 *   get: (sessionId: string) => any,
 *   list: () => string[]
 * }}
 */
const createSessionPool = options => {
	const logger = options.logger
	const maxBackoffMs = options.maxBackoffMs ?? 60000
	const sessions = new Map() // sessionId -> { sock, attempts, stopped }

	const computeBackoffMs = attempts => {
		const base = Math.min(1000 * 2 ** attempts, maxBackoffMs)
		return base + Math.floor(Math.random() * (base * 0.2))
	}

	const start = async sessionId => {
		const entry = sessions.get(sessionId) || { attempts: 0, stopped: false }
		sessions.set(sessionId, entry)
		if (entry.stopped) return
		try {
			const sock = await options.makeSocket(sessionId)
			entry.sock = sock
			options.onSessionUpdate?.(sessionId, sock)
			sock.ev.on('connection.update', update => {
				if (update.connection === 'open') {
					entry.attempts = 0
				}
				if (update.connection === 'close') {
					const statusCode = update.lastDisconnect?.error?.output?.statusCode
					if (statusCode === DISCONNECT_REASON_LOGGED_OUT) {
						logger?.info?.({ sessionId }, 'session logged out, removing from pool')
						sessions.delete(sessionId)
						options.onLoggedOut?.(sessionId)
						return
					}
					if (entry.stopped) return
					entry.attempts += 1
					const backoffMs = computeBackoffMs(entry.attempts)
					logger?.warn?.(
						{ sessionId, attempt: entry.attempts, backoffMs },
						'session disconnected, reconnecting with backoff'
					)
					setTimeout(() => start(sessionId), backoffMs)
				}
			})
		} catch (error) {
			entry.attempts += 1
			const backoffMs = computeBackoffMs(entry.attempts)
			logger?.error?.({ error, sessionId, backoffMs }, 'failed to start session, retrying with backoff')
			if (!entry.stopped) {
				setTimeout(() => start(sessionId), backoffMs)
			}
		}
	}

	const add = sessionId => start(sessionId)
	const remove = sessionId => {
		const entry = sessions.get(sessionId)
		if (!entry) return
		entry.stopped = true
		if (entry.sock?.end) {
			try {
				entry.sock.end(undefined)
			} catch {}
		}
		sessions.delete(sessionId)
	}
	const get = sessionId => sessions.get(sessionId)?.sock
	const list = () => [...sessions.keys()]

	return { add, remove, get, list }
}
exports.createSessionPool = createSessionPool
