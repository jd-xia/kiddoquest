package com.kiddoquest.openid.provider;

import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Verifies one identity provider's ID token. Register another Spring bean to add a provider.
 */
public interface IdTokenDecoder {

    Jwt decode(String idToken);
}
