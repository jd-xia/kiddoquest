package com.kiddoquest.openid.provider;

import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class IdentityProviderRegistry {

    private final List<IdentityProvider> providers;

    public IdentityProviderRegistry(List<IdentityProvider> providers) {
        this.providers = List.copyOf(providers);
    }

    public List<String> ids() {
        return providers.stream().map(IdentityProvider::providerId).sorted().toList();
    }

    public IdentityProvider require(String providerId) {
        return providers.stream()
                .filter(provider -> provider.providerId().equals(providerId))
                .findFirst()
                .orElse(null);
    }
}
