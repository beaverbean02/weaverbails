'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.LT_HASH_ANTI_TAMPERING = void 0
const crypto_1 = require('./crypto')

/**
 * LT Hash ("lthash16") is a summation-based homomorphic hash algorithm that
 * maintains the integrity of a piece of data over a series of mutations. You
 * can add/remove mutations and it'll return a hash equal to if the same
 * series of mutations was made sequentially.
 *
 * WhatsApp expands each element to 128 bytes via HKDF (info = "WhatsApp Patch
 * Integrity"), treats that as 64 little-endian uint16 lanes, and combines
 * elements by adding/subtracting lane-wise mod 2^16 -- this is a pure HKDF +
 * integer-arithmetic algorithm, no elliptic-curve math involved. Pure-JS,
 * built on the already-validated `hkdf` implementation.
 */
const LTHASH_INFO = 'WhatsApp Patch Integrity'
const LTHASH_SIZE = 128 // bytes = 64 uint16 lanes

const expand = element => (0, crypto_1.hkdf)(element, LTHASH_SIZE, { info: LTHASH_INFO })

const applyDelta = (result, element, sign) => {
	const expanded = expand(element)
	for (let i = 0; i < LTHASH_SIZE; i += 2) {
		const lane = result.readUInt16LE(i)
		const delta = expanded.readUInt16LE(i)
		result.writeUInt16LE((lane + sign * delta) & 0xffff, i)
	}
}

exports.LT_HASH_ANTI_TAMPERING = {
	subtractThenAdd: (base, subtract = [], add = []) => {
		const result = Buffer.from(base)
		for (const element of subtract) applyDelta(result, element, -1)
		for (const element of add) applyDelta(result, element, 1)
		return result
	}
}
