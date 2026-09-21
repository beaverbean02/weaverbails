'use strict'

const crypto = require('crypto')
const { generateWAMessageFromContent } = require('./Utils')

function patchRichResponseMessage(message) {
	const wrapRich = value => {
		const richResponse = value?.botForwardedMessage?.message?.richResponseMessage || value?.richResponseMessage
		if (!richResponse) return value

		richResponse.contextInfo = {
			...(richResponse.contextInfo || {}),
			isForwarded: true,
			forwardOrigin: 4
		}

		return value?.botForwardedMessage ? value : { botForwardedMessage: { message: value } }
	}

	if (message?.deviceSentMessage?.message) {
		message.deviceSentMessage.message = wrapRich(message.deviceSentMessage.message)
		return message
	}

	return wrapRich(message)
}

function patchConnectionConfig(config = {}) {
	const originalPatch = config.patchMessageBeforeSending

	return {
		...config,
		patchMessageBeforeSending: async (message, ...args) => {
			const patched = typeof originalPatch === 'function' ? await originalPatch(message, ...args) : message

			if (Array.isArray(patched)) {
				return patched.map(entry => ({
					...entry,
					message: patchRichResponseMessage(entry.message)
				}))
			}

			return patchRichResponseMessage(patched)
		}
	}
}

function richSection(primitive, viewModel = 'GenAISingleLayoutViewModel') {
	return {
		__typename: 'GenAIUnifiedResponseSection',
		view_model: {
			__typename: viewModel,
			primitive
		}
	}
}

function buildRichMenuMessage(content = {}) {
	const sections = []
	const header = content.header
	const body = content.body
	const footer = content.footer
	let contextWrapper = {}

	if (header?.disclaimer) {
		contextWrapper = {
			messageContextInfo: {
				botMetadata: {
					messageDisclaimerText: header.disclaimerText || ' '
				}
			}
		}
	}

	if (header?.title) {
		sections.push(
			richSection({
				__typename: 'FOATextPrimitive',
				text: `# ${String(header.title)}`
			})
		)
	}

	if (header?.image?.url) {
		const image = header.image
		if (image.inline) {
			sections.push({
				__typename: 'GenAIUnifiedResponseSection',
				view_model: {
					__typename: 'GenAISingleLayoutViewModel',
					primitive: {
						__typename: 'GenAIMarkdownTextUXPrimitive',
						text: '{{header}}.{{/header}}',
						inline_entities: [{
							__typename: 'GenAITextInlineEntity',
							key: 'header',
							metadata: {
								__typename: 'GenAILatexItem',
								latex_expression: '.',
								font_height: 24,
								padding: 4,
								latex_image: {
									__typename: 'GenAIMediaItem',
									mime_type: image.mime_type || 'image/png',
									url: image.url,
									url_fallback: image.url,
									width: image.width || 500,
									height: image.height || 500,
									expiration_timestamp_ms: Date.now() + 86400000
								}
							}
						}]
					}
				}
			})
		} else {
			sections.push({
				__typename: 'GenAIUnifiedResponseSection',
				view_model: {
					__typename: 'GenAISingleLayoutViewModel',
					primitive: {
						__typename: 'GenAIImagePrimitive',
						preview_image: {
							__typename: 'GenAIMediaItem',
							mime_type: image.mime_type || 'image/png',
							url: image.url
						},
						full_image: {
							__typename: 'GenAIMediaItem',
							mime_type: image.mime_type || 'image/png',
							url: image.url
						}
					}
				}
			})
		}
	}

	if (body && (body.carousel || body.row) && body.cards?.length) {
		sections.push({
			__typename: 'GenAIUnifiedResponseSection',
			view_model: {
				primitives: body.cards.map((card, cardIndex) => ({
					__typename: 'GenAI3PExtWidgetPrimitive',
					header: {
						__typename: 'GenAI3PExtWidgetStandardHeader',
						title: card?.title || ''
					},
					body: {
						__typename: 'GenAI3PExtCalendarEventList',
						ctas: (card?.buttons || []).map((button, buttonIndex) => {
							const item = typeof button === 'object' ? button : { label: button }
							return {
								label: item.label || item.id || '',
								state: 'PENDING',
								kind: 'OTHER',
								tool_call_id: `${cardIndex}${buttonIndex}`,
								toast: { label: card?.toast || '', __typename: 'GenAI3PExtWidgetToast' },
								__typename: 'GenAI3PExtWidgetCTA'
							}
						}),
						sections: []
					}
				})),
				__typename: body.carousel ? 'GenAIHScrollLayoutViewModel' : 'GenAIActionRowLayoutViewModel'
			}
		})
	} else if (body && (body.title || body.buttons?.length)) {
		const buttons = Array.isArray(body.buttons) ? body.buttons : []
		sections.push(
			richSection({
				__typename: 'GenAI3PExtWidgetPrimitive',
				header: {
					__typename: 'GenAI3PExtWidgetStandardHeader',
					title: String(body.title || '')
				},
				body: {
					__typename: 'GenAI3PExtCalendarEventList',
					ctas: buttons.map((button, index) => {
						const item = typeof button === 'object' ? button : { label: button }
						return {
							label: String(item.label || item.id || ''),
							state: 'PENDING',
							kind: 'OTHER',
							tool_call_id: String(item.id || index),
							toast: { label: String(body.toast || ''), __typename: 'GenAI3PExtWidgetToast' },
							__typename: 'GenAI3PExtWidgetCTA'
						}
					}),
					sections: []
				}
			}
		))
	}

	if (footer?.text || footer?.url || footer?.image?.url) {
		const footerPrimitives = []
		if (footer.image?.url) {
			footerPrimitives.push({
				__typename: 'GenAIMarkdownTextUXPrimitive',
				text: '{{header}}.{{/header}}',
				inline_entities: [{
					__typename: 'GenAITextInlineEntity',
					key: 'header',
					metadata: {
						__typename: 'GenAILatexItem',
						latex_expression: '.',
						font_height: 24,
						padding: -5,
						latex_image: {
							__typename: 'GenAIMediaItem',
							mime_type: footer.image.mime_type || 'image/png',
							url: footer.image.url,
							url_fallback: footer.image.url,
							width: footer.image.width || 100,
							height: footer.image.height || 100,
							expiration_timestamp_ms: Date.now() + 86400000
						}
					}
				}]
			})
		}
		sections.push({
			view_model: {
				primitives: [{
					cta_text: footer.text || 'Tg',
					cta_type: 'OPEN_URL',
					cta_url: footer.url || 'https://t.me/kenzki_01',
					__typename: 'GenAIFooterActionPrimitive'
				}, ...footerPrimitives],
				__typename: 'GenAIActionRowLayoutViewModel'
			}
		})
	}

	return {
		...contextWrapper,
		botForwardedMessage: {
			message: {
				richResponseMessage: {
					unifiedResponse: {
						data: Buffer.from(JSON.stringify({ sections })).toString('base64')
					},
					contextInfo: {
						isForwarded: true,
						forwardOrigin: 4,
						...(content.contextInfo || {})
					}
				}
			}
		}
	}
}

async function richMenu(sock, target, content = {}, relayOptions = {}) {
	const message = generateWAMessageFromContent(target, buildRichMenuMessage(content), {
		userJid: sock.user?.id
	})

	await sock.relayMessage(target, message.message, {
		messageId: message.key.id,
		...relayOptions
	})

	return message
}

function buildBloksWidgetMessage(widget = {}, options = {}) {
	const {
		bodyText = '',
		header,
		nativeFlowMessage,
		contextInfo
	} = options

	return {
		interactiveMessage: {
			...(header ? { header } : {}),
			body: { text: String(bodyText) },
			...(nativeFlowMessage ? { nativeFlowMessage } : {}),
			...(contextInfo ? { contextInfo } : {}),
			bloksWidget: {
				uuid: String(widget.uuid || crypto.randomUUID()),
				data: String(widget.data || ''),
				type: String(widget.type || 'im_a2ui'),
				fallback: String(widget.fallback || '')
			}
		}
	}
}

async function sendBloksWidget(sock, target, widget = {}, options = {}) {
	const { quoted, relayOptions = {}, ...messageOptions } = options
	const message = generateWAMessageFromContent(target, buildBloksWidgetMessage(widget, messageOptions), {
		quoted,
		userJid: sock.user?.id
	})

	await sock.relayMessage(target, message.message, {
		messageId: message.key.id,
		...relayOptions
	})

	return message
}

function attachWeaverFeatures(sock) {
	if (!sock.richMenu) sock.richMenu = (target, content, options) => richMenu(sock, target, content, options)
	if (!sock.sendBloksWidget) {
		sock.sendBloksWidget = (target, widget, options) => sendBloksWidget(sock, target, widget, options)
	}
	if (!sock.bloksWidget) sock.bloksWidget = sock.sendBloksWidget
	return sock
}

module.exports = {
	attachWeaverFeatures,
	buildBloksWidgetMessage,
	buildRichMenuMessage,
	patchConnectionConfig,
	patchRichResponseMessage,
	richMenu,
	sendBloksWidget
}
