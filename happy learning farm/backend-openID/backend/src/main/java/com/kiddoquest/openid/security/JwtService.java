package com.kiddoquest.openid.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.kiddoquest.openid.config.AuthProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@Component
public class JwtService {

    private final AuthProperties properties;
    private final byte[] secret;

    public JwtService(AuthProperties properties) {
        this.properties = properties;
        String value = properties.getJwt().getSecret();
        this.secret = value == null ? new byte[0] : value.getBytes(StandardCharsets.UTF_8);
        if (this.secret.length < 32) {
            throw new IllegalStateException("AUTH_JWT_SECRET must be set to at least 32 bytes");
        }
        if (properties.getJwt().getIssuer() == null || properties.getJwt().getIssuer().isBlank()) {
            throw new IllegalStateException("AUTH_JWT_ISSUER must be set");
        }
    }

    public IssuedToken issue(String userId, String provider) {
        Instant now = Instant.now();
        Instant expires = now.plus(properties.getJwt().getTtl());
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(properties.getJwt().getIssuer())
                .subject(userId)
                .audience(properties.getJwt().getAudience())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expires))
                .jwtID(UUID.randomUUID().toString())
                .claim("provider", provider)
                .build();
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret));
            return new IssuedToken(jwt.serialize(), properties.getJwt().getTtl().toSeconds());
        } catch (JOSEException ex) {
            throw new IllegalStateException("Could not issue an access token");
        }
    }

    public record IssuedToken(String value, long expiresInSeconds) {
    }
}
