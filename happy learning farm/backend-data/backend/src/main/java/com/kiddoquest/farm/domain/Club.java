package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** A shared farm. Members walk the same map; each one still owns only their own fields and animals. */
@Entity
@Table(name = "farm_club", uniqueConstraints = @UniqueConstraint(name = "uk_farm_club_name_key", columnNames = "name_key"))
public class Club {

    @Id
    @Column(length = 36)
    private String id;

    /** As the child typed it, tidied. */
    @Column(nullable = false, length = 20)
    private String name;

    /** Lower case with single spaces, so "Sunny Farm" and "sunny  farm" are the same name. */
    @Column(name = "name_key", nullable = false, length = 20)
    private String nameKey;

    @Column(name = "created_by", nullable = false, length = 36)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameKey() {
        return nameKey;
    }

    public void setNameKey(String nameKey) {
        this.nameKey = nameKey;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
