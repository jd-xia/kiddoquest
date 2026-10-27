package com.kiddoquest.openid.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "openid_identity", uniqueConstraints = {
        @UniqueConstraint(name = "uk_provider_subject", columnNames = {"provider", "subject"}),
        @UniqueConstraint(name = "uk_identity_email", columnNames = {"email"})
})
public class ExternalIdentity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(length = 320)
    private String email;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Instant getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(Instant linkedAt) {
        this.linkedAt = linkedAt;
    }
}
