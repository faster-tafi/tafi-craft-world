'use strict';

const crypto = require('crypto');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const ROOT = __dirname;
const RUNTIME_DIR = path.join(ROOT, 'runtime');
const RUNTIME_SALT = "craft-world-shared-runtime-v1";
const manifest = JSON.parse(
  fs.readFileSync(path.join(RUNTIME_DIR, 'runtime-manifest.json'), 'utf8')
);
const publicKey = fs.readFileSync(path.join(ROOT, 'device-public.pem'), 'utf8');

function fail(message) {
  throw new Error('Protected runtime verification failed: ' + message);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function deriveRuntimeKey() {
  return crypto
    .createHash('sha256')
    .update(publicKey, 'utf8')
    .update('\0', 'utf8')
    .update(RUNTIME_SALT, 'utf8')
    .digest();
}

const actualPublicKeyFingerprint = crypto
  .createHash('sha256')
  .update(publicKey, 'utf8')
  .digest('hex');
if (actualPublicKeyFingerprint !== manifest.payload.publicKeyFingerprint) {
  fail('the public verification key was changed');
}

if (!crypto.verify(
  null,
  Buffer.from(JSON.stringify(manifest.payload), 'utf8'),
  publicKey,
  Buffer.from(manifest.signature, 'base64')
)) {
  fail('the runtime manifest signature is invalid');
}

const cache = new Map();

function loadEncrypted(fileName) {
  if (cache.has(fileName)) return cache.get(fileName).exports;
  const metadata = manifest.payload.files[fileName];
  if (!metadata) fail('runtime file is not listed: ' + fileName);

  const encryptedPath = path.join(RUNTIME_DIR, metadata.file);
  const encryptedText = fs.readFileSync(encryptedPath, 'utf8');
  if (sha256(encryptedText) !== metadata.sha256) {
    fail('runtime file was modified: ' + fileName);
  }

  let envelope;
  try {
    envelope = JSON.parse(encryptedText);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      deriveRuntimeKey(),
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const source = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64')),
      decipher.final()
    ]).toString('utf8');

    const runtimePath = path.join(ROOT, 'runtime-' + fileName);
    const runtimeModule = new Module(runtimePath, module);
    runtimeModule.filename = runtimePath;
    runtimeModule.paths = Module._nodeModulePaths(ROOT);
    cache.set(fileName, runtimeModule);
    runtimeModule._compile(source, runtimePath);
    return runtimeModule.exports;
  } catch (error) {
    fail('unable to decrypt ' + fileName + ': ' + error.message);
  }
}

module.exports = { loadEncrypted };
