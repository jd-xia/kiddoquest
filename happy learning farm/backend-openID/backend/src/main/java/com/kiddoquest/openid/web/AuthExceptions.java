package com.kiddoquest.openid.web;

public class AuthExceptions {

    private AuthExceptions() {
    }

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) {
            super(message);
        }
    }

    public static class AuthUnavailableException extends RuntimeException {
        public AuthUnavailableException(String message) {
            super(message);
        }
    }

    public static class UnknownProviderException extends RuntimeException {
        public UnknownProviderException(String message) {
            super(message);
        }
    }

    public static class EmailLinkedException extends RuntimeException {
        public EmailLinkedException(String message) {
            super(message);
        }
    }
}
