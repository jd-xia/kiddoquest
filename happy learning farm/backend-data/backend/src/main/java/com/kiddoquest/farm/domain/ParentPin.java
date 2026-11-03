package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The parent PIN of one Google account (BCrypt hash). It guards the main farm and the kids' play time. */
@Entity
@Table(name = "farm_parent")
public class ParentPin {

    @Id
    @Column(name = "owner_user_id", length = 36)
    private String ownerUserId;

    @Column(name = "pin_hash", nullable = false, length = 72)
    private String pinHash;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public String getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(String ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getPinHash() {
        return pinHash;
    }

    public void setPinHash(String pinHash) {
        this.pinHash = pinHash;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
