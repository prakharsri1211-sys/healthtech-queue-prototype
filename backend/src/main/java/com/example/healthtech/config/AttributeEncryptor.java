package com.example.healthtech.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.security.Key;

@Converter
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static final String AES = "AES";
    private static final String SECRET = "p2s5v8y/B?E(G+KbPeShVmYq3t6w9z$C"; 

    private final Key key;

    public AttributeEncryptor() {
        this.key = new SecretKeySpec(SECRET.getBytes(), AES);
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) return attribute;
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            return Base64.getEncoder().encodeToString(cipher.doFinal(attribute.getBytes()));
        } catch (Exception e) {
            // Log error but don't crash the transaction
            System.err.println("[VAULT] Encryption failed: " + e.getMessage());
            return attribute;
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) return dbData;
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, key);
            return new String(cipher.doFinal(Base64.getDecoder().decode(dbData)));
        } catch (Exception e) {
            // [SELF-HEALING] If decryption fails (e.g. legacy plain-text data), 
            // return raw data instead of crashing the app with JpaSystemException.
            System.err.println("[VAULT] Decryption failed for data (returning raw): " + e.getMessage());
            return dbData; 
        }
    }
}
