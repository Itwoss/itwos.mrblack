const crypto = require('crypto');
const forge = require('node-forge');

// Generate key pair for E2EE
const generateKeyPair = () => {
  try {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    
    return {
      success: true,
      publicKey: publicKeyPem,
      privateKey: privateKeyPem
    };
  } catch (error) {
    console.error('Key pair generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate key pair'
    };
  }
};

// Generate Ed25519 key pair (alternative to RSA)
const generateEd25519KeyPair = () => {
  try {
    const keyPair = forge.pki.ed25519.generateKeyPair();
    
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    
    return {
      success: true,
      publicKey: publicKeyPem,
      privateKey: privateKeyPem
    };
  } catch (error) {
    console.error('Ed25519 key pair generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate Ed25519 key pair'
    };
  }
};

// Encrypt message with AES-GCM
const encryptMessage = (message, key, iv = null) => {
  try {
    // Generate random IV if not provided
    if (!iv) {
      iv = crypto.randomBytes(12); // 96-bit IV for GCM
    } else if (typeof iv === 'string') {
      iv = Buffer.from(iv, 'hex');
    }

    // Ensure key is 32 bytes (256-bit)
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('Key must be 32 bytes (256-bit)');
    }

    // Create cipher
    const cipher = crypto.createCipher('aes-256-gcm', keyBuffer);
    cipher.setAAD(Buffer.from('itwos-ai-e2ee', 'utf8')); // Additional authenticated data

    // Encrypt message
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    return {
      success: true,
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  } catch (error) {
    console.error('Message encryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to encrypt message'
    };
  }
};

// Decrypt message with AES-GCM
const decryptMessage = (ciphertext, key, iv, tag) => {
  try {
    // Convert inputs to buffers
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
    const ivBuffer = Buffer.isBuffer(iv) ? iv : Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.isBuffer(tag) ? tag : Buffer.from(tag, 'hex');

    // Ensure key is 32 bytes
    if (keyBuffer.length !== 32) {
      throw new Error('Key must be 32 bytes (256-bit)');
    }

    // Create decipher
    const decipher = crypto.createDecipher('aes-256-gcm', keyBuffer);
    decipher.setAAD(Buffer.from('itwos-ai-e2ee', 'utf8')); // Same AAD as encryption
    decipher.setAuthTag(tagBuffer);

    // Decrypt message
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return {
      success: true,
      message: decrypted
    };
  } catch (error) {
    console.error('Message decryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to decrypt message'
    };
  }
};

// Generate shared secret using ECDH
const generateSharedSecret = (privateKeyPem, publicKeyPem) => {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    // Perform ECDH key agreement
    const sharedSecret = privateKey.derive(publicKey);
    
    // Convert to hex string
    const sharedSecretHex = forge.util.bytesToHex(sharedSecret);
    
    // Derive a 32-byte key using HKDF
    const key = crypto.pbkdf2Sync(sharedSecretHex, 'itwos-ai-salt', 100000, 32, 'sha256');

    return {
      success: true,
      sharedSecret: key.toString('hex')
    };
  } catch (error) {
    console.error('Shared secret generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate shared secret'
    };
  }
};

// Encrypt message for specific recipient
const encryptForRecipient = (message, senderPrivateKey, recipientPublicKey) => {
  try {
    // Generate shared secret
    const sharedSecretResult = generateSharedSecret(senderPrivateKey, recipientPublicKey);
    if (!sharedSecretResult.success) {
      return sharedSecretResult;
    }

    // Encrypt message with shared secret
    const encryptResult = encryptMessage(message, sharedSecretResult.sharedSecret);
    if (!encryptResult.success) {
      return encryptResult;
    }

    return {
      success: true,
      ciphertext: encryptResult.ciphertext,
      iv: encryptResult.iv,
      tag: encryptResult.tag
    };
  } catch (error) {
    console.error('Recipient encryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to encrypt for recipient'
    };
  }
};

// Decrypt message from specific sender
const decryptFromSender = (ciphertext, iv, tag, recipientPrivateKey, senderPublicKey) => {
  try {
    // Generate shared secret
    const sharedSecretResult = generateSharedSecret(recipientPrivateKey, senderPublicKey);
    if (!sharedSecretResult.success) {
      return sharedSecretResult;
    }

    // Decrypt message with shared secret
    const decryptResult = decryptMessage(ciphertext, sharedSecretResult.sharedSecret, iv, tag);
    if (!decryptResult.success) {
      return decryptResult;
    }

    return {
      success: true,
      message: decryptResult.message
    };
  } catch (error) {
    console.error('Sender decryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to decrypt from sender'
    };
  }
};

// Generate group key for group chat
const generateGroupKey = () => {
  try {
    const groupKey = crypto.randomBytes(32); // 256-bit key
    
    return {
      success: true,
      groupKey: groupKey.toString('hex')
    };
  } catch (error) {
    console.error('Group key generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate group key'
    };
  }
};

// Encrypt group key for each participant
const encryptGroupKeyForParticipant = (groupKey, participantPublicKey) => {
  try {
    const publicKey = forge.pki.publicKeyFromPem(participantPublicKey);
    
    // Encrypt group key with participant's public key
    const encryptedGroupKey = publicKey.encrypt(groupKey, 'RSA-OAEP');
    
    return {
      success: true,
      encryptedGroupKey: forge.util.encode64(encryptedGroupKey)
    };
  } catch (error) {
    console.error('Group key encryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to encrypt group key for participant'
    };
  }
};

// Decrypt group key for participant
const decryptGroupKeyForParticipant = (encryptedGroupKey, participantPrivateKey) => {
  try {
    const privateKey = forge.pki.privateKeyFromPem(participantPrivateKey);
    
    // Decrypt group key with participant's private key
    const decryptedGroupKey = privateKey.decrypt(forge.util.decode64(encryptedGroupKey), 'RSA-OAEP');
    
    return {
      success: true,
      groupKey: decryptedGroupKey
    };
  } catch (error) {
    console.error('Group key decryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to decrypt group key for participant'
    };
  }
};

// Encrypt message with group key
const encryptGroupMessage = (message, groupKey) => {
  try {
    const keyBuffer = Buffer.isBuffer(groupKey) ? groupKey : Buffer.from(groupKey, 'hex');
    
    return encryptMessage(message, keyBuffer);
  } catch (error) {
    console.error('Group message encryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to encrypt group message'
    };
  }
};

// Decrypt message with group key
const decryptGroupMessage = (ciphertext, groupKey, iv, tag) => {
  try {
    const keyBuffer = Buffer.isBuffer(groupKey) ? groupKey : Buffer.from(groupKey, 'hex');
    
    return decryptMessage(ciphertext, keyBuffer, iv, tag);
  } catch (error) {
    console.error('Group message decryption error:', error);
    return {
      success: false,
      error: error.message || 'Failed to decrypt group message'
    };
  }
};

// Generate message hash for integrity verification
const generateMessageHash = (message) => {
  try {
    const hash = crypto.createHash('sha256');
    hash.update(message);
    
    return {
      success: true,
      hash: hash.digest('hex')
    };
  } catch (error) {
    console.error('Message hash generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate message hash'
    };
  }
};

// Verify message integrity
const verifyMessageIntegrity = (message, expectedHash) => {
  try {
    const hashResult = generateMessageHash(message);
    if (!hashResult.success) {
      return hashResult;
    }

    const isValid = hashResult.hash === expectedHash;
    
    return {
      success: true,
      isValid: isValid
    };
  } catch (error) {
    console.error('Message integrity verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify message integrity'
    };
  }
};

module.exports = {
  generateKeyPair,
  generateEd25519KeyPair,
  encryptMessage,
  decryptMessage,
  generateSharedSecret,
  encryptForRecipient,
  decryptFromSender,
  generateGroupKey,
  encryptGroupKeyForParticipant,
  decryptGroupKeyForParticipant,
  encryptGroupMessage,
  decryptGroupMessage,
  generateMessageHash,
  verifyMessageIntegrity
};
