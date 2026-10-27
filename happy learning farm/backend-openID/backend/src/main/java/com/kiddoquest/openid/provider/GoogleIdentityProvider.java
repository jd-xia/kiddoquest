package com.kiddoquest.openid.provider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import com.kiddoquest.openid.config.AuthProperties;
import com.kiddoquest.openid.web.AuthExceptions.AuthUnavailableException;
import com.kiddoquest.openid.web.AuthExceptions.InvalidTokenException;

@Component
@ConditionalOnProperty(prefix = "auth.google", name = "enabled", havingValue = "true", matchIfMissing = true)
public class GoogleIdentityProvider implements IdentityProvider {

    private final AuthProperties properties;
    private final IdTokenDecoder decoder;

    public GoogleIdentityProvider(AuthProperties properties, IdTokenDecoder decoder) {
        this.properties = properties;
        this.decoder = decoder;
    }

    @Override
    public String providerId() {
        return "google";
    }

    @Override
    public VerifiedIdentity verify(String idToken) {
        String clientId = properties.getGoogle().getClientId();
        if (clientId == null || clientId.isBlank()) {
            throw new AuthUnavailableException("Google login is not configured");
        }
        if (idToken == null || idToken.isBlank()) {
            throw new InvalidTokenException("Google identity token was rejected");
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException ex) {
            throw new InvalidTokenException("Google identity token was rejected");
        }
        if (jwt.getSubject() == null || jwt.getSubject().isBlank() || jwt.getAudience() == null
                || !jwt.getAudience().contains(clientId)) {
            throw new InvalidTokenException("Google identity token was rejected");
        }
        String email = null;
        if (Boolean.TRUE.equals(jwt.getClaim("email_verified"))) {
            email = blankToNull(jwt.getClaimAsString("email"));
        }
        return new VerifiedIdentity("google", jwt.getSubject(), email, displayName(jwt));
    }

    private static String displayName(Jwt jwt) {
        String name = blankToNull(jwt.getClaimAsString("name"));
        if (name == null) {
            name = blankToNull(jwt.getClaimAsString("given_name"));
        }
        if (name == null) {
            return "Player";
        }
        String cleaned = name.replaceAll("\\p{Cntrl}", "").trim();
        if (cleaned.isEmpty()) {
            return "Player";
        }
        return cleaned.length() > 80 ? cleaned.substring(0, 80) : cleaned;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
