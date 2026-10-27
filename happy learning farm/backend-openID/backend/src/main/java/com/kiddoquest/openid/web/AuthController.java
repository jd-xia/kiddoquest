package com.kiddoquest.openid.web;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.openid.provider.IdentityProviderRegistry;
import com.kiddoquest.openid.service.AuthService;
import com.kiddoquest.openid.web.AuthDtos.LoginRequest;
import com.kiddoquest.openid.web.AuthDtos.LoginResponse;
import com.kiddoquest.openid.web.AuthDtos.UserResponse;
import com.kiddoquest.openid.web.AuthExceptions.InvalidTokenException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService auth;
    private final IdentityProviderRegistry providers;

    public AuthController(AuthService auth, IdentityProviderRegistry providers) {
        this.auth = auth;
        this.providers = providers;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Verify a provider identity token and issue a KiddoQuest access token")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.provider(), request.idToken());
    }

    @GetMapping("/providers")
    @SecurityRequirements
    @Operation(summary = "List identity providers this deployment can verify")
    public List<String> providers() {
        return providers.ids();
    }

    @GetMapping("/me")
    @Operation(summary = "Return the signed-in KiddoQuest user")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new InvalidTokenException("Sign in is required");
        }
        return auth.me(jwt.getSubject());
    }
}
