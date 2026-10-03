import { File } from 'expo-file-system'

// Expo SDK 57 installs expo/fetch as the global fetch. It rejects React Native's
// `{ uri, name, type }` FormData parts ("Unsupported FormDataPart implementation")
// and only accepts strings, Blobs, or objects exposing `bytes()`. Convert local
// file parts so every existing upload keeps its field name, filename and MIME type.
const isLocalFilePart = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.uri === 'string' &&
  !(typeof Blob !== 'undefined' && value instanceof Blob) &&
  typeof value.bytes !== 'function'

const toBytesPart = ({ uri, name, type }) => ({
  name: name || uri.split('/').pop() || 'file',
  type: type || 'application/octet-stream',
  bytes: async () => new Uint8Array(await new File(uri).arrayBuffer()),
})

for (const method of ['append', 'set']) {
  const original = FormData.prototype[method]
  if (typeof original !== 'function') continue
  FormData.prototype[method] = function (name, value, ...rest) {
    return original.call(this, name, isLocalFilePart(value) ? toBytesPart(value) : value, ...rest)
  }
}
