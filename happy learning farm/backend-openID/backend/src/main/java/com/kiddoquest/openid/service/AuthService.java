package com.kiddoquest.openid.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kiddoquest.openid.domain.ExternalIdentity;
import com.kiddoquest.openid.domain.UserAccount;
import com.kiddoquest.openid.provider.IdentityProvider;
import com.kiddoquest.openid.provider.IdentityProviderRegistry;
import com.kiddoquest.openid.provider.VerifiedIdentity;
import com.kiddoquest.openid.repo.ExternalIdentityRepository;
import com.kiddoquest.openid.repo.UserAccountRepository;
import com.kiddoquest.openid.security.JwtService;
import com.kiddoquest.openid.web.AuthDtos.LoginResponse;
import com.kiddoquest.openid.web.AuthDtos.UserResponse;
import com.kiddoquest.openid.web.AuthExceptions.EmailLinkedException;
import com.kiddoquest.openid.web.AuthExceptions.InvalidTokenException;
import com.kiddoquest.openid.web.AuthExceptions.UnknownProviderException;

@Service
public class AuthService {

    private final IdentityProviderRegistry providers;
    private final UserAccountRepository users;
    private final ExternalIdentityRepository identities;
    private final JwtService tokens;

    public AuthService(IdentityProviderRegistry providers, UserAccountRepository users,
            ExternalIdentityRepository identities, JwtService tokens) {
        this.providers = providers;
        this.users = users;
        this.identities = identities;
        this.tokens = tokens;
    }

    @Transactional
    public LoginResponse login(String providerId, String idToken) {
        IdentityProvider provider = providers.require(providerId);
        if (provider == null) {
            throw new UnknownProviderException("That sign-in provider is not available");
        }
        VerifiedIdentity identity = provider.verify(idToken);
        UserAccount user = identities.findByProviderAndSubject(identity.provider(), identity.subject())
                .map(link -> updateLink(link, identity))
                .orElseGet(() -> create(identity));
        JwtService.IssuedToken token = tokens.issue(user.getId(), identity.provider());
        return new LoginResponse(token.value(), "Bearer", token.expiresInSeconds(),
                new UserResponse(user.getId(), user.getDisplayName(), emailOf(user.getId())));
    }

    @Transactional(readOnly = true)
    public UserResponse me(String userId) {
        UserAccount user = users.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("Sign in is required"));
        return new UserResponse(user.getId(), user.getDisplayName(), emailOf(user.getId()));
    }

    private UserAccount updateLink(ExternalIdentity link, VerifiedIdentity identity) {
        UserAccount user = users.findById(link.getUserId())
                .orElseThrow(() -> new InvalidTokenException("Sign in is required"));
        if (identity.displayName() != null && !identity.displayName().equals(user.getDisplayName())) {
            user.setDisplayName(identity.displayName());
            users.save(user);
        }
        String email = normalizeEmail(identity.email());
        String stored = normalizeEmail(link.getEmail());
        if (email != null && stored == null) {
            claimEmail(link, email);
            link.setEmail(email);
            identities.save(link);
        } else if (email != null && stored != null && !email.equals(stored)) {
            throw new EmailLinkedException("This email is already linked to an account and cannot be changed.");
        }
        return user;
    }

    private UserAccount create(VerifiedIdentity identity) {
        String email = normalizeEmail(identity.email());
        if (email != null && identities.findByEmail(email).isPresent()) {
            throw new EmailLinkedException("This email is already linked to an account.");
        }
        try {
            UserAccount user = new UserAccount();
            user.setId(UUID.randomUUID().toString());
            user.setDisplayName(identity.displayName());
            user.setCreatedAt(Instant.now());
            users.saveAndFlush(user);

            ExternalIdentity link = new ExternalIdentity();
            link.setId(UUID.randomUUID().toString());
            link.setProvider(identity.provider());
            link.setSubject(identity.subject());
            link.setUserId(user.getId());
            link.setEmail(email);
            link.setLinkedAt(Instant.now());
            identities.saveAndFlush(link);
            return user;
        } catch (DataIntegrityViolationException ex) {
            return identities.findByProviderAndSubject(identity.provider(), identity.subject())
                    .flatMap(link -> users.findById(link.getUserId()))
                    .orElseThrow(() -> email != null && identities.findByEmail(email).isPresent()
                            ? new EmailLinkedException("This email is already linked to an account.")
                            : ex);
        }
    }

    private void claimEmail(ExternalIdentity link, String email) {
        identities.findByEmail(email).filter(other -> !other.getId().equals(link.getId())).ifPresent(other -> {
            throw new EmailLinkedException("This email is already linked to an account.");
        });
    }

    private String emailOf(String userId) {
        return identities.findFirstByUserId(userId).map(ExternalIdentity::getEmail).orElse(null);
    }

    private static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
