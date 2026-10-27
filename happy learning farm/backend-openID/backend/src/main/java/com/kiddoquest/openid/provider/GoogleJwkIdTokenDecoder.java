package com.kiddoquest.openid.provider;

import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.kiddoquest.openid.config.AuthProperties;

@Component
@ConditionalOnProperty(prefix = "auth.google", name = "enabled", havingValue = "true", matchIfMissing = true)
public class GoogleJwkIdTokenDecoder implements IdTokenDecoder {

    private static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final NimbusJwtDecoder decoder;

    public GoogleJwkIdTokenDecoder(AuthProperties properties) {
        decoder = NimbusJwtDecoder.withJwkSetUri(properties.getGoogle().getJwkSetUri()).build();
        OAuth2TokenValidator<Jwt> issuer = token -> {
            String value = token.getIssuer() == null ? "" : token.getIssuer().toString();
            if (ISSUERS.contains(value)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Google issuer was not recognized", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), issuer));
    }

    @Override
    public Jwt decode(String idToken) {
        return decoder.decode(idToken);
    }
}
