'use strict'

const crypto = require('crypto')
const { proto } = require('../../WAProto/index.js')
const {
	delay,
	generateMessageID,
	generateWAMessage,
	generateWAMessageContent,
	generateWAMessageFromContent,
	getUrlFromDirectPath,
	normalizeMessageContent,
	prepareWAMessageMedia
} = require('../Utils/index.js')
const { isJidGroup, isPnUser, jidNormalizedUser, STORIES_JID } = require('../WABinary/index.js')

class InteractiveMessageHandler {
	constructor(waUploadToServer, relayMessageFn, config, sock) {
		this.relayMessage = relayMessageFn
		this.waUploadToServer = waUploadToServer
		this.config = config
		this.sock = sock
	}
	detectType(content) {
		if (content.requestPaymentMessage) return 'PAYMENT'
		if (content.productMessage) return 'PRODUCT'
		if (content.interactiveMessage) return 'INTERACTIVE'
		if (content.albumMessage || content.album) return 'ALBUM'
		if (content.eventMessage) return 'EVENT'
		if (content.pollResultMessage) return 'POLL_RESULT'
		if (content.groupStatusMessage) return 'GROUP_STORY'
		if (content.orderMessage) return 'ORDER'
		if (content.groupLabel) return 'GROUP_LABEL'
		return null
	}
	async handlePayment(content, quoted) {
		const data = content.requestPaymentMessage
		let notes = {}
		if (data.sticker?.stickerMessage) {
			notes = {
				stickerMessage: {
					...data.sticker.stickerMessage,
					contextInfo: {
						stanzaId: quoted?.key?.id,
						participant: quoted?.key?.participant || content.sender,
						quotedMessage: quoted?.message
					}
				}
			}
		} else if (data.note) {
			notes = {
				extendedTextMessage: {
					text: data.note,
					contextInfo: {
						stanzaId: quoted?.key?.id,
						participant: quoted?.key?.participant || content.sender,
						quotedMessage: quoted?.message
					}
				}
			}
		}
		return {
			requestPaymentMessage: proto.Message.RequestPaymentMessage.fromObject({
				expiryTimestamp: data.expiry || 0,
				amount1000: data.amount || 0,
				currencyCodeIso4217: data.currency || 'IDR',
				requestFrom: data.from || '0@s.whatsapp.net',
				noteMessage: notes,
				background: data.background ?? {
					id: 'DEFAULT',
					placeholderArgb: 0xfff0f0f0
				}
			})
		}
	}
	async handleProduct(content, _jid, _quoted) {
		const {
			title,
			description,
			thumbnail,
			productId,
			retailerId,
			url,
			body = '',
			footer = '',
			buttons = [],
			priceAmount1000 = null,
			currencyCode = 'IDR'
		} = content.productMessage
		let productImage
		if (Buffer.isBuffer(thumbnail)) {
			const { imageMessage } = await generateWAMessageContent({ image: thumbnail }, { upload: this.waUploadToServer })
			productImage = imageMessage
		} else if (typeof thumbnail === 'object' && thumbnail.url) {
			const { imageMessage } = await generateWAMessageContent(
				{ image: { url: thumbnail.url } },
				{ upload: this.waUploadToServer }
			)
			productImage = imageMessage
		}
		return {
			viewOnceMessage: {
				message: {
					interactiveMessage: {
						body: { text: body },
						footer: { text: footer },
						header: {
							title,
							hasMediaAttachment: true,
							productMessage: {
								product: {
									productImage,
									productId,
									title,
									description,
									currencyCode,
									priceAmount1000,
									retailerId,
									url,
									productImageCount: 1
								},
								businessOwnerJid: '0@s.whatsapp.net'
							}
						},
						nativeFlowMessage: { buttons }
					}
				}
			}
		}
	}
	async handleInteractive(content, _jid, _quoted) {
		const {
			title,
			footer,
			thumbnail,
			image,
			video,
			document,
			mimetype,
			fileName,
			jpegThumbnail,
			contextInfo,
			externalAdReply,
			buttons = [],
			nativeFlowMessage,
			header
		} = content.interactiveMessage
		let media = null
		let _mediaType = null
		if (thumbnail) {
			media = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: this.waUploadToServer })
			_mediaType = 'image'
		} else if (image) {
			const src = typeof image === 'object' && image.url ? { image: { url: image.url } } : { image }
			media = await prepareWAMessageMedia(src, { upload: this.waUploadToServer })
			_mediaType = 'image'
		} else if (video) {
			const src = typeof video === 'object' && video.url ? { video: { url: video.url } } : { video }
			media = await prepareWAMessageMedia(src, { upload: this.waUploadToServer })
			_mediaType = 'video'
		} else if (document) {
			const docPayload = { document }
			if (jpegThumbnail) {
				docPayload.jpegThumbnail =
					typeof jpegThumbnail === 'object' && jpegThumbnail.url ? { url: jpegThumbnail.url } : jpegThumbnail
			}
			media = await prepareWAMessageMedia(docPayload, { upload: this.waUploadToServer })
			if (fileName) media.documentMessage.fileName = fileName
			if (mimetype) media.documentMessage.mimetype = mimetype
			_mediaType = 'document'
		}
		const interactiveMessage = {
			body: { text: title || '' },
			footer: { text: footer || '' }
		}
		if (buttons && buttons.length > 0) {
			interactiveMessage.nativeFlowMessage = { buttons }
			if (nativeFlowMessage) {
				interactiveMessage.nativeFlowMessage = {
					...interactiveMessage.nativeFlowMessage,
					...nativeFlowMessage
				}
			}
		} else if (nativeFlowMessage) {
			interactiveMessage.nativeFlowMessage = nativeFlowMessage
		}
		if (media) {
			interactiveMessage.header = {
				title: header || '',
				hasMediaAttachment: true,
				...media
			}
		} else {
			interactiveMessage.header = {
				title: header || '',
				hasMediaAttachment: false
			}
		}
		const finalContextInfo = {}
		if (contextInfo) {
			Object.assign(finalContextInfo, {
				mentionedJid: contextInfo.mentionedJid || [],
				forwardingScore: contextInfo.forwardingScore || 0,
				isForwarded: contextInfo.isForwarded || false,
				...contextInfo
			})
		}
		if (externalAdReply) {
			finalContextInfo.externalAdReply = {
				title: externalAdReply.title || '',
				body: externalAdReply.body || '',
				mediaType: externalAdReply.mediaType || 1,
				thumbnailUrl: externalAdReply.thumbnailUrl || '',
				mediaUrl: externalAdReply.mediaUrl || '',
				sourceUrl: externalAdReply.sourceUrl || '',
				showAdAttribution: externalAdReply.showAdAttribution || false,
				renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,
				...externalAdReply
			}
		}
		if (Object.keys(finalContextInfo).length > 0) {
			interactiveMessage.contextInfo = finalContextInfo
		}
		return { interactiveMessage }
	}
	async handleAlbum(content, jid, quoted) {
		const array = content.albumMessage || content.album
		const ctxInfo = content.contextInfo || {}
		const album = await generateWAMessageFromContent(
			jid,
			{
				messageContextInfo: {
					messageSecret: crypto.randomBytes(32)
				},
				albumMessage: {
					expectedImageCount: array.filter(a => 'image' in a).length,
					expectedVideoCount: array.filter(a => 'video' in a).length
				}
			},
			{ userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || ''), browser: this.config?.browser }
		)
		await this.relayMessage(jid, album.message, {
			messageId: album.key.id
		})
		for (let item of array) {
			if (ctxInfo && Object.keys(ctxInfo).length > 0 && !item.contextInfo) {
				item = { ...item, contextInfo: ctxInfo }
			}
			const img = await generateWAMessage(jid, item, {
				upload: this.waUploadToServer,
				userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || '')
			})
			img.message.messageContextInfo = {
				messageSecret: crypto.randomBytes(32),
				messageAssociation: {
					associationType: 1,
					parentMessageKey: album.key
				}
			}
			await this.relayMessage(jid, img.message, {
				messageId: img.key.id
			})
		}
		return album
	}
	async handleEvent(content, jid, quoted) {
		const eventData = content.eventMessage
		const msg = await generateWAMessageFromContent(
			jid,
			{
				viewOnceMessage: {
					message: {
						messageContextInfo: {
							deviceListMetadata: {},
							deviceListMetadataVersion: 2,
							messageSecret: crypto.randomBytes(32)
						},
						eventMessage: {
							isCanceled: eventData.isCanceled || false,
							name: eventData.name,
							description: eventData.description,
							location: eventData.location || {
								degreesLatitude: 0,
								degreesLongitude: 0,
								name: 'Location'
							},
							joinLink: eventData.joinLink || '',
							startTime:
								typeof eventData.startTime === 'string'
									? parseInt(eventData.startTime)
									: eventData.startTime || Date.now(),
							endTime:
								typeof eventData.endTime === 'string'
									? parseInt(eventData.endTime)
									: eventData.endTime || Date.now() + 3600000,
							extraGuestsAllowed: eventData.extraGuestsAllowed !== false
						}
					}
				}
			},
			{ quoted, userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || ''), browser: this.config?.browser }
		)
		await this.relayMessage(jid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}
	async handlePollResult(content, jid, quoted) {
		const pollData = content.pollResultMessage
		const msg = await generateWAMessageFromContent(
			jid,
			{
				pollResultSnapshotMessage: {
					name: pollData.name,
					pollVotes: pollData.pollVotes.map(vote => ({
						optionName: vote.optionName,
						optionVoteCount:
							typeof vote.optionVoteCount === 'number' ? vote.optionVoteCount.toString() : vote.optionVoteCount
					}))
				}
			},
			{ quoted, userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || ''), browser: this.config?.browser }
		)
		await this.relayMessage(jid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}
	async handleGroupStory(content, jid, _quoted) {
		const storyData = content.groupStatusMessage
		let waMsgContent
		if (storyData.message) {
			waMsgContent = storyData
		} else {
			waMsgContent = await generateWAMessageContent(storyData, {
				upload: this.waUploadToServer
			})
		}
		const msg = {
			message: {
				groupStatusMessageV2: {
					message: waMsgContent.message || waMsgContent
				}
			}
		}
		return await this.relayMessage(jid, msg.message, {
			messageId: generateMessageID()
		})
	}
	async handleOrderMessage(content, jid, quoted) {
		const orderData = content.orderMessage
		const orderMsg = await generateWAMessageFromContent(jid, {
			orderMessage: {
				orderId: orderData.orderId || 'ORDER' + generateMessageID(),
				thumbnail: orderData.thumbnail || null,
				itemCount: orderData.itemCount || 0,
				status: orderData.status || 'ACCEPTED',
				surface: orderData.surface || 'CATALOG',
				message: orderData.message,
				orderTitle: orderData.orderTitle,
				sellerJid: orderData.sellerJid || jid,
				token: orderData.token || generateMessageID(),
				totalAmount1000: orderData.totalAmount1000 || 0,
				totalCurrencyCode: orderData.totalCurrencyCode || 'IDR',
				messageVersion: 2
			}
		}, { quoted, browser: this.config?.browser })
		await this.relayMessage(jid, orderMsg.message, {
			messageId: orderMsg.key.id
		})
		return orderMsg
	}
	async handleGbLabel(content, jid) {
		const labelData = content.groupLabel
		if (!isJidGroup(jid)) {
			throw new Error('handleGbLabel requires a group jid')
		}
		const msg = await generateWAMessageFromContent(jid, {
			protocolMessage: {
				type: 'GROUP_MEMBER_LABEL_CHANGE',
				memberLabel: {
					label: labelData.labelText.slice(0, 30)
				}
			}
		}, { browser: this.config?.browser })
		return await this.relayMessage(jid, msg.message, {
			additionalNodes: [
				{
					tag: 'meta',
					attrs: {
						tag_reason: 'user_update',
						appdata: 'member_tag'
					},
					content: undefined
				}
			]
		})
	}
	async sendStatusWhatsApp(content, jids = []) {
		const userJid = jidNormalizedUser(this.sock.authState.creds.me.id)
		const allUsers = new Set()
		allUsers.add(userJid)
		for (const id of jids) {
			if (isJidGroup(id)) {
				try {
					const metadata = await this.sock.groupMetadata(id)
					metadata.participants.forEach(p => allUsers.add(jidNormalizedUser(p.id)))
				} catch (error) {
					this.config.logger.error(`Error getting metadata for group ${id}: ${error}`)
				}
			} else if (isPnUser(id)) {
				allUsers.add(jidNormalizedUser(id))
			}
		}
		const uniqueUsers = Array.from(allUsers)
		const getRandomHexColor = () =>
			'#' +
			Math.floor(Math.random() * 16777215)
				.toString(16)
				.padStart(6, '0')
		const isMedia = content.image || content.video || content.audio
		const isAudio = !!content.audio
		const messageContent = { ...content }
		if (isMedia && !isAudio) {
			if (messageContent.text) {
				messageContent.caption = messageContent.text
				delete messageContent.text
			}
			delete messageContent.ptt
			delete messageContent.font
			delete messageContent.backgroundColor
			delete messageContent.textColor
		}
		if (isAudio) {
			delete messageContent.text
			delete messageContent.caption
			delete messageContent.font
			delete messageContent.textColor
		}
		const font = !isMedia ? content.font || Math.floor(Math.random() * 9) : undefined
		const textColor = !isMedia ? content.textColor || getRandomHexColor() : undefined
		const backgroundColor = !isMedia || isAudio ? content.backgroundColor || getRandomHexColor() : undefined
		const ptt = isAudio ? (typeof content.ptt === 'boolean' ? content.ptt : true) : undefined
		const { getUrlInfo } = require('../Utils/link-preview.js')
		const msg = await generateWAMessage(STORIES_JID, messageContent, {
			logger: this.config.logger,
			userJid,
			getUrlInfo: text =>
				getUrlInfo(text, {
					thumbnailWidth: this.config.linkPreviewImageThumbnailWidth,
					fetchOpts: { timeout: 3000, ...(this.config.options || {}) },
					logger: this.config.logger,
					uploadImage: this.config.generateHighQualityLinkPreview ? this.waUploadToServer : undefined
				}),
			upload: this.waUploadToServer,
			mediaCache: this.config.mediaCache,
			options: this.config.options,
			font,
			textColor,
			backgroundColor,
			ptt
		})
		await this.relayMessage(STORIES_JID, msg.message, {
			messageId: msg.key.id,
			statusJidList: uniqueUsers,
			additionalNodes: [
				{
					tag: 'meta',
					attrs: {},
					content: [
						{
							tag: 'mentioned_users',
							attrs: {},
							content: jids.map(jid => ({
								tag: 'to',
								attrs: { jid: jidNormalizedUser(jid) }
							}))
						}
					]
				}
			]
		})
		for (const id of jids) {
			try {
				const normalizedId = jidNormalizedUser(id)
				const isPrivate = isPnUser(normalizedId)
				const type = isPrivate ? 'statusMentionMessage' : 'groupStatusMentionMessage'
				const protocolMessage = {
					[type]: {
						message: {
							protocolMessage: {
								key: msg.key,
								type: 25
							}
						}
					},
					messageContextInfo: {
						messageSecret: crypto.randomBytes(32)
					}
				}
				const statusMsg = await generateWAMessageFromContent(normalizedId, protocolMessage, {
					userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || ''),
					browser: this.config?.browser
				})
				await this.relayMessage(normalizedId, statusMsg.message, {
					additionalNodes: [
						{
							tag: 'meta',
							attrs: isPrivate ? { is_status_mention: 'true' } : { is_group_status_mention: 'true' }
						}
					]
				})
				await delay(2000)
			} catch (error) {
				this.config.logger.error(`Error sending to ${id}: ${error}`)
			}
		}
		return msg
	}
}

module.exports = { InteractiveMessageHandler }
