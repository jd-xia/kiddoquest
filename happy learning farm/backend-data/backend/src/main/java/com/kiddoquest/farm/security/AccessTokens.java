package com.kiddoquest.farm.security;

import java.nio.charset.StandardCharsets;
import java.util.Collection;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

public final class AccessTokens {

    private AccessTokens() {
    }

    public static JwtDecoder decoder(String secret, String issuer, String audience) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("AUTH_JWT_SECRET must be set to at least 32 bytes");
        }
        SecretKey key = new SecretKeySpec(bytes, "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(issuer),
                new JwtClaimValidator<Object>("aud", value -> audienceMatches(value, audience)));
        decoder.setJwtValidator(validator);
        return decoder;
    }

    static boolean audienceMatches(Object audience, String expected) {
        if (expected == null || expected.isBlank()) {
            return false;
        }
        if (audience instanceof String value) {
            return expected.equals(value);
        }
        if (audience instanceof Collection<?> values) {
            return values.contains(expected);
        }
        return false;
    }
}
