const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.warn(
    `\n⚠️  WARNING: This package recommends Node.js 20+ for optimal performance.\n` +
    `   You are using Node.js ${process.versions.node}.\n` +
    `   Consider upgrading to Node.js 20+ for better compatibility.\n`
  );
  // Don't exit - make it optional
}
