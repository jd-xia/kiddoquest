package com.kiddoquest.openid.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.openid.domain.ExternalIdentity;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, String> {

    Optional<ExternalIdentity> findByProviderAndSubject(String provider, String subject);

    Optional<ExternalIdentity> findByEmail(String email);

    Optional<ExternalIdentity> findFirstByUserId(String userId);
}
