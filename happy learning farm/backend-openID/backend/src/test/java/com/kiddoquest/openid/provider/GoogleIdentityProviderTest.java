package com.kiddoquest.openid.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;

import com.kiddoquest.openid.config.AuthProperties;
import com.kiddoquest.openid.web.AuthExceptions.AuthUnavailableException;
import com.kiddoquest.openid.web.AuthExceptions.InvalidTokenException;

class GoogleIdentityProviderTest {

    @Test
    void keepsVerifiedEmailAndRejectsUnverifiedEmail() {
        assertEquals("alex@example.com", provider().verify("good").email());

        IdTokenDecoder decoder = mock(IdTokenDecoder.class);
        when(decoder.decode("unverified")).thenReturn(jwt("unverified", false));
        VerifiedIdentity identity = new GoogleIdentityProvider(properties(), decoder).verify("unverified");
        assertNull(identity.email());
        assertEquals("google-sub", identity.subject());
    }

    @Test
    void rejectsATokenTheDecoderRefuses() {
        IdTokenDecoder decoder = mock(IdTokenDecoder.class);
        when(decoder.decode("bad")).thenThrow(new JwtException("nope"));
        assertThrows(InvalidTokenException.class, () -> new GoogleIdentityProvider(properties(), decoder).verify("bad"));
    }

    @Test
    void rejectsTheWrongAudience() {
        IdTokenDecoder decoder = mock(IdTokenDecoder.class);
        when(decoder.decode("other")).thenReturn(Jwt.withTokenValue("other")
                .header("alg", "RS256")
                .subject("google-sub")
                .audience(List.of("someone-else"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build());
        assertThrows(InvalidTokenException.class, () -> new GoogleIdentityProvider(properties(), decoder).verify("other"));
    }

    @Test
    void refusesToRunWhenTheClientIdIsMissing() {
        AuthProperties properties = properties();
        properties.getGoogle().setClientId(" ");
        assertThrows(AuthUnavailableException.class,
                () -> new GoogleIdentityProvider(properties, mock(IdTokenDecoder.class)).verify("good"));
    }

    private static GoogleIdentityProvider provider() {
        IdTokenDecoder decoder = mock(IdTokenDecoder.class);
        when(decoder.decode("good")).thenReturn(jwt("good", true));
        return new GoogleIdentityProvider(properties(), decoder);
    }

    private static Jwt jwt(String token, boolean verified) {
        return Jwt.withTokenValue(token)
                .header("alg", "RS256")
                .subject("google-sub")
                .audience(List.of("test-client-id"))
                .claim("name", "Alex")
                .claim("email", "alex@example.com")
                .claim("email_verified", verified)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build();
    }

    private static AuthProperties properties() {
        AuthProperties properties = new AuthProperties();
        properties.getGoogle().setClientId("test-client-id");
        return properties;
    }
}
