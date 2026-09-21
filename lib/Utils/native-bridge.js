'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.loadRustBridge = void 0
const fs = require('fs')
const Module = require('module')
const path = require('path')

const BRIDGE_NAME = 'whatsapp-rust-bridge'
let cached
let attempted = false

/**
 * Finds the installed package directory for `pkgName` by walking the same
 * node_modules search path Node itself would use, without going through
 * Node's package "exports" resolution gate.
 */
const findPackageDir = pkgName => {
	let searchPaths
	try {
		searchPaths = require.resolve.paths(pkgName) || []
	} catch {
		searchPaths = []
	}
	for (const dir of searchPaths) {
		const candidate = path.join(dir, pkgName)
		if (fs.existsSync(path.join(candidate, 'package.json'))) {
			return candidate
		}
	}
	return null
}

const loadEsmBridgeAsCommonJs = file => {
	const source = fs.readFileSync(file, 'utf8')
	const exportMatch = source.match(/\nexport\s*\{([\s\S]*?)\};?\s*$/)
	if (!exportMatch) {
		throw new Error(`Unsupported ESM bridge entry: ${file}`)
	}

	const exportedNames = exportMatch[1]
		.split(',')
		.map(name => name.trim())
		.filter(Boolean)
		.map(name => {
			const [local, exported] = name.split(/\s+as\s+/)
			return `${JSON.stringify(exported || local)}: ${local}`
		})

	const commonJsSource = source.replace(
		exportMatch[0],
		`\nmodule.exports = { ${exportedNames.join(', ')} }\n`
	)
	const bridgeModule = new Module.Module(file, module)
	bridgeModule.filename = file
	bridgeModule.paths = Module.Module._nodeModulePaths(path.dirname(file))
	bridgeModule._compile(commonJsSource, file)
	return bridgeModule.exports
}

/**
 * Loads whatsapp-rust-bridge, tolerating published versions/forks whose
 * package.json ships an "exports" map with no "." entry (or an otherwise
 * broken one) -- which makes a plain `require('whatsapp-rust-bridge')` throw
 * ERR_PACKAGE_PATH_NOT_EXPORTED even though the module's files are present
 * and perfectly usable. In that case, we locate the package directory
 * ourselves and require its real entry file directly, bypassing the broken
 * "exports" gate. Returns the loaded module, or null if it's unavailable.
 */
const loadRustBridge = () => {
	if (attempted) return cached
	attempted = true
	let loadError
	try {
		cached = require(BRIDGE_NAME)
		return cached
	} catch (error) {
		loadError = error
		const recoverableCodes = new Set(['ERR_PACKAGE_PATH_NOT_EXPORTED', 'ERR_PACKAGE_IMPORT_NOT_DEFINED'])
		if (!recoverableCodes.has(error?.code) && error?.code !== 'ERR_REQUIRE_ESM') {
			cached = null
			loadRustBridge.error = error
			return null
		}
		try {
			const dir = findPackageDir(BRIDGE_NAME)
			if (!dir) {
				cached = null
				return null
			}
			const pkgJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
			const candidates = [
				pkgJson.main,
				'index.js',
				'index.node',
				'dist/index.js',
				'lib/index.js',
				'build/index.js'
			].filter(Boolean)
			for (const rel of candidates) {
				const fullPath = path.join(dir, rel)
				if (fs.existsSync(fullPath)) {
					try {
						cached = require(fullPath)
					} catch (entryError) {
						if (entryError?.code !== 'ERR_REQUIRE_ESM') throw entryError
						cached = loadEsmBridgeAsCommonJs(fullPath)
					}
					return cached
				}
			}
		} catch (fallbackError) {
			loadError = fallbackError
			// fall through to returning null below
		}
		cached = null
		loadRustBridge.error = loadError
		return null
	}
}
exports.loadRustBridge = loadRustBridge
