package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "farm_message", indexes = @Index(name = "ix_farm_message_room", columnList = "room, created_at"))
public class FarmMessage {

    @Id
    @Column(length = 36)
    private String id;

    /** "hall", or the two public ids joined in alphabetical order. */
    @Column(nullable = false, length = 32)
    private String room;

    @Column(name = "from_username", nullable = false, length = 8)
    private String fromUsername;

    @Column(name = "from_name", nullable = false, length = 16)
    private String fromName;

    @Column(name = "from_look", nullable = false, length = 24)
    private String fromLook;

    @Column(nullable = false, length = 180)
    private String body;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getFromUsername() {
        return fromUsername;
    }

    public void setFromUsername(String fromUsername) {
        this.fromUsername = fromUsername;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public String getFromLook() {
        return fromLook;
    }

    public void setFromLook(String fromLook) {
        this.fromLook = fromLook;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
