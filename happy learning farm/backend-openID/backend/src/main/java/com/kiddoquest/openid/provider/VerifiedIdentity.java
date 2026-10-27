package com.kiddoquest.openid.provider;

/**
 * A verified identity. Email is present only when the provider says it is verified.
 * Games map {@code subject} to their own accounts through this service, not by trusting the browser.
 */
public record VerifiedIdentity(String provider, String subject, String email, String displayName) {
}
