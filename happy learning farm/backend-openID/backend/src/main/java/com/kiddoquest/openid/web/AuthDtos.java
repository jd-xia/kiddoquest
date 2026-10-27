package com.kiddoquest.openid.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank @Pattern(regexp = "[a-z][a-z0-9_-]{1,31}") String provider,
            @NotBlank @Size(max = 8192) String idToken) {
    }

    public record UserResponse(String id, String displayName, String email) {
    }

    public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {
    }
}
