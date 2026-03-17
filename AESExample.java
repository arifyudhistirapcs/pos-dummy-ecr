import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Java AES/ECB/PKCS5Padding Implementation
 * Reference for ECR Link Encryption
 * 
 * Algoritma:
 * 1. SHA-1 hash secret key
 * 2. Ambil 16 bytes pertama (32 hex chars) sebagai key AES
 * 3. Encrypt dengan AES/ECB/PKCS5Padding
 * 4. Encode hasil ke Base64
 */
public class AESExample {
    
    public static void main(String[] args) throws Exception {
        // Secret key (default: ECR2022secretKey)
        String secret = "ECR2022secretKey";
        
        // Sample payload
        String payload = "{\"amount\":10000,\"action\":\"Sale\",\"trx_id\":\"TX123\",\"pos_address\":\"172.0.0.1\",\"time_stamp\":\"20240315143000\",\"method\":\"purchase\"}";
        
        System.out.println("========================================");
        System.out.println("ECR Link AES Encryption (Java)");
        System.out.println("========================================");
        System.out.println("Secret: " + secret);
        System.out.println("Payload: " + payload);
        System.out.println();
        
        // Step 1: SHA-1 hash secret
        MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
        byte[] hashedBytes = sha1.digest(secret.getBytes("UTF-8"));
        
        // Step 2: Convert to hex and take first 16 bytes (32 hex chars)
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashedBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        String keyHex = hexString.substring(0, 32);
        System.out.println("SHA-1 Hash (hex): " + hexString.toString());
        System.out.println("Key (first 16 bytes): " + keyHex);
        System.out.println();
        
        // Step 3: Create AES key from hex
        byte[] keyBytes = hexToBytes(keyHex);
        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
        
        // Step 4: Encrypt with AES/ECB/PKCS5Padding
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        byte[] encryptedBytes = cipher.doFinal(payload.getBytes("UTF-8"));
        
        // Step 5: Base64 encode
        String encryptedBase64 = Base64.getEncoder().encodeToString(encryptedBytes);
        System.out.println("Encrypted (Base64):");
        System.out.println(encryptedBase64);
        System.out.println();
        
        // Decrypt to verify
        cipher.init(Cipher.DECRYPT_MODE, secretKey);
        byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedBase64));
        String decrypted = new String(decryptedBytes, "UTF-8");
        System.out.println("Decrypted (verify): " + decrypted);
        System.out.println("========================================");
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
