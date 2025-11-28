import crypto from 'crypto';

// AES-256-GCM implementacion para cifrado autenticado
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'ENC:'; //marcador para saber que el campo está cifrado

function getKey() {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!secret) {
    console.warn('WARNING: MESSAGE_ENCRYPTION_KEY no está configurado. Usando clave predeterminada insegura. Establezca la variable de entorno a un secreto fuerte.');
  }
  // derivar una clave de 32 bytes a partir del secreto
  return crypto.createHash('sha256').update(String(secret || 'default-change-me')).digest();
}

export function encryptText(plaintext) {
  if (plaintext == null) return plaintext;
  if (typeof plaintext !== 'string') plaintext = String(plaintext);
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
    return PREFIX + payload;
  } catch (err) {
    console.error('encryptText error', err);
    return plaintext; // fallo abierto para evitar bloquear operaciones
  }
}

export function decryptText(value) {
  if (value == null) return value;
  if (typeof value !== 'string') value = String(value);
  if (!value.startsWith(PREFIX)) return value; // not encrypted
  try {
    const payload = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = payload.slice(0, IV_LENGTH);
    const tag = payload.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = payload.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('decryptText error', err);
    return value; // devolver original si la desencriptación falla
  }
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
