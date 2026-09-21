'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.autoCacheViewOnceMedia = void 0
const path = require('path')
const fs = require('fs')
const Messages_1 = require('./messages')
const MessagesMedia_1 = require('./messages-media')

const VIEW_ONCE_WRAPPER_KEYS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']
const VIEW_ONCE_INNER_KEYS = ['imageMessage', 'videoMessage', 'audioMessage']

/**
 * Unwraps a message and returns the inner view-once media content if present, otherwise null.
 * Handles both the wrapper style (viewOnceMessage[V2/V2Extension] -> message -> ...)
 * and the inline style (imageMessage/videoMessage with viewOnce: true set directly).
 */
const getViewOnceContent = message => {
	if (!message) return null
	const content = (0, Messages_1.extractMessageContent)(message)
	if (!content) return null
	for (const wrapperKey of VIEW_ONCE_WRAPPER_KEYS) {
		const wrapper = content[wrapperKey]
		if (wrapper?.message) {
			const inner = (0, Messages_1.extractMessageContent)(wrapper.message)
			if (inner) return inner
		}
	}
	for (const key of VIEW_ONCE_INNER_KEYS) {
		if (content[key]?.viewOnce) {
			return { [key]: content[key] }
		}
	}
	return null
}

/**
 * Registers a `messages.upsert` listener on the given socket that automatically
 * downloads and saves view-once media (image/video/audio) to `cacheDir` as soon
 * as it arrives, before the sender's app can mark it as opened/consumed.
 *
 * @param {ReturnType<typeof import('../Socket').default>} sock - an active Baileys socket
 * @param {{ cacheDir?: string, logger?: any, onCached?: (info: { id: string, jid: string, filePath: string, type: string }) => void }} [options]
 * @returns {() => void} a function that removes the listener
 */
const autoCacheViewOnceMedia = (sock, options = {}) => {
	const cacheDir = options.cacheDir || './viewonce-cache'
	const logger = options.logger || sock.logger
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true })
	}
	const handler = async ({ messages, type }) => {
		if (type !== 'notify' && type !== 'append') return
		for (const msg of messages) {
			try {
				const viewOnceContent = getViewOnceContent(msg.message)
				if (!viewOnceContent) continue
				const mediaType = Object.keys(viewOnceContent)[0]
				const buffer = await (0, Messages_1.downloadMediaMessage)(
					msg,
					'buffer',
					{},
					{ logger, reuploadRequest: sock.updateMediaMessage }
				)
				const extension = (0, MessagesMedia_1.extensionForMediaMessage)(viewOnceContent) || 'bin'
				const fileName = `${msg.key.id}.${extension}`
				const filePath = path.join(cacheDir, fileName)
				fs.writeFileSync(filePath, buffer)
				logger?.debug?.({ id: msg.key.id, filePath, mediaType }, 'cached view-once media')
				options.onCached?.({ id: msg.key.id, jid: msg.key.remoteJid, filePath, type: mediaType })
			} catch (error) {
				logger?.warn?.({ error, id: msg.key?.id }, 'failed to cache view-once media')
			}
		}
	}
	sock.ev.on('messages.upsert', handler)
	return () => sock.ev.off('messages.upsert', handler)
}
exports.autoCacheViewOnceMedia = autoCacheViewOnceMedia
exports.getViewOnceContent = getViewOnceContent
