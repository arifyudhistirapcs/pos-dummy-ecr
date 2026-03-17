# ECR Link AES Encryption Documentation

## Overview

ECR Link menggunakan enkripsi **AES/ECB/PKCS5Padding** untuk mengamankan payload JSON yang dikirim ke EDC.

## Algoritma Enkripsi

```
1. SHA-1 hash secret key
2. Ambil 16 bytes pertama (32 hex chars) sebagai AES key
3. Encrypt payload dengan AES/ECB/PKCS5Padding
4. Encode hasil ke Base64
```

## Secret Key

- **Default**: `ECR2022secretKey`
- Dapat dikonfigurasi di menu Settings

## Implementasi JavaScript (CryptoJS)

```javascript
const ECREncryption = {
    generateToken: function(payload) {
        const secret = 'ECR2022secretKey';
        const jsonString = JSON.stringify(payload);
        
        // SHA-1 hash dan ambil 16 bytes pertama
        const hashedKey = CryptoJS.SHA1(secret).toString();
        const keyHex = hashedKey.substring(0, 32);
        
        // AES-ECB encryption dengan PKCS7 padding
        const encrypted = CryptoJS.AES.encrypt(jsonString, 
            CryptoJS.enc.Hex.parse(keyHex), {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7  // PKCS7 = PKCS5 untuk block size 8 bytes
            });
        
        return encrypted.toString(); // Base64 encoded
    }
};
```

## Implementasi Java (Reference)

```java
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;

public class ECREncryption {
    public static String generateToken(String payload, String secret) throws Exception {
        // SHA-1 hash secret
        MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
        byte[] hashedBytes = sha1.digest(secret.getBytes("UTF-8"));
        
        // Convert to hex dan ambil 16 bytes pertama
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashedBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        String keyHex = hexString.substring(0, 32);
        
        // Create AES key
        byte[] keyBytes = hexToBytes(keyHex);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
        
        // Encrypt dengan AES/ECB/PKCS5Padding
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        byte[] encryptedBytes = cipher.doFinal(payload.getBytes("UTF-8"));
        
        // Base64 encode
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }
    
    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}
```

## Perbandingan Implementasi

| Step | Java | JavaScript (CryptoJS) |
|------|------|----------------------|
| SHA-1 Hash | `MessageDigest.getInstance("SHA-1")` | `CryptoJS.SHA1(secret).toString()` |
| Key Derivation | First 16 bytes of SHA-1 hex | `hashedKey.substring(0, 32)` |
| AES Mode | `AES/ECB/PKCS5Padding` | `CryptoJS.mode.ECB` |
| Padding | PKCS5Padding | `CryptoJS.pad.Pkcs7` |
| Output | Base64 | `encrypted.toString()` (Base64) |

## Catatan Penting

### PKCS5 vs PKCS7 Padding
- **PKCS5Padding** (Java): Untuk block size 8 bytes (DES)
- **PKCS7** (CryptoJS): Generic padding untuk block size 1-255 bytes
- **Untuk AES**: Block size adalah 16 bytes, sehingga PKCS5Padding di Java sebenarnya menggunakan PKCS7 internally
- CryptoJS menggunakan `Pkcs7` yang compatible dengan `PKCS5Padding` untuk AES

### Verifikasi
Untuk memverifikasi hasil enkripsi sama:
1. Gunakan secret key yang sama
2. Gunakan payload yang sama
3. Hasil Base64 harus identik antara Java dan JavaScript

## Contoh Hasil Enkripsi

**Payload**:
```json
{"amount":10000,"action":"Sale","trx_id":"TX123456","pos_address":"172.0.0.1","time_stamp":"20240315143000","method":"purchase"}
```

**Secret**: `ECR2022secretKey`

**Hasil** (contoh, akan berbeda tiap timestamp):
```
U2FsdGVkX1+xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
```

## Testing

Gunakan file `AESExample.java` untuk testing:

```bash
javac AESExample.java
java AESExample
```

Bandingkan hasilnya dengan console log di browser (buka Developer Tools → Console).
