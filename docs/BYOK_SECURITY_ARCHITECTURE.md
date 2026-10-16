# BYOK Credential Vault & Security Architecture

## Threat Model
The Bring Your Own API Key (BYOK) system must defend against:
1. **Database Compromise**: Attackers gaining read access to the database must not be able to steal plaintext API keys.
2. **Log/Tracing Leaks**: Development or operational logging must not inadvertently record plaintext secrets.
3. **SSRF**: Custom API endpoints could be exploited to ping internal network IPs (e.g. `localhost` or metadata servers).
4. **Client Exposure**: Keys must never return to the frontend UI once set.

## Encryption Architecture (Envelope Encryption)
- **Data Encryption Key (DEK)**: A unique 256-bit key is generated per API key.
- **Payload**: The user's plaintext API key is encrypted using `AES-256-GCM` with a random 12-byte IV using the DEK.
- **Key Encryption Key (KEK)**: The DEK is subsequently encrypted by a deployment-level KEK (from environment variables or KMS).
- **Storage**: We store the Ciphertext, IV, Auth Tag, and the wrapped (encrypted) DEK in the `user_api_keys` table.

## Rotation Strategy
- When a user rotates a key, a new DEK is generated and the old row data is overwritten completely.
- Soft-deleted keys (if configured) must immediately destroy the `wrapped_dek` and `key_ciphertext` to ensure cryptographic erasure.

## Incident Response
- In case of DB leak: Keys are safe as long as KEK is uncompromised.
- In case of KEK compromise: All API keys must be considered compromised. A KEK rotation script will need to decrypt all keys with the old KEK and re-encrypt with the new KEK.

## Custom Endpoints & SSRF
- Only HTTPS endpoints are accepted.
- Requests to custom endpoints must be routed through a server-side client that blocks private IPs.
