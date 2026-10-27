package com.kiddoquest.openid.provider;

public interface IdentityProvider {

    String providerId();

    VerifiedIdentity verify(String idToken);
}
