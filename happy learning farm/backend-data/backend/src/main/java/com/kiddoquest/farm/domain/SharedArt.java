package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** A picture (and maybe a 3D model) a child shared from the Art Studio for everyone to pick. */
@Entity
@Table(name = "shared_art", indexes = {
        @Index(name = "ix_shared_art_key", columnList = "item_key, created_at"),
        @Index(name = "ix_shared_art_child", columnList = "child_id")})
public class SharedArt {

    @Id
    @Column(length = 36)
    private String id;

    /** The Art Studio item, for example "animal:sheep" or "building:barn". */
    @Column(name = "item_key", nullable = false, length = 48)
    private String itemKey;

    @Column(name = "owner_user_id", nullable = false, length = 36)
    private String ownerUserId;

    @Column(name = "child_id", nullable = false, length = 36)
    private String childId;

    @Column(name = "from_username", nullable = false, length = 8)
    private String fromUsername;

    @Column(name = "from_name", nullable = false, length = 16)
    private String fromName;

    /** "sticker", "cartoon", "pixel" or "3d". */
    @Column(length = 12)
    private String style;

    /** The picture as a data URL (a small PNG or WebP). For a 3D model it is the model's snapshot. */
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String picture;

    /** The 3D model lives in shared_model under the same id, so lists never load it. */
    @Column(name = "model_bytes", nullable = false)
    private long modelBytes;

    @Column(name = "model_name", length = 80)
    private String modelName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getItemKey() {
        return itemKey;
    }

    public void setItemKey(String itemKey) {
        this.itemKey = itemKey;
    }

    public String getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(String ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getChildId() {
        return childId;
    }

    public void setChildId(String childId) {
        this.childId = childId;
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

    public String getStyle() {
        return style;
    }

    public void setStyle(String style) {
        this.style = style;
    }

    public String getPicture() {
        return picture;
    }

    public void setPicture(String picture) {
        this.picture = picture;
    }

    public long getModelBytes() {
        return modelBytes;
    }

    public void setModelBytes(long modelBytes) {
        this.modelBytes = modelBytes;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
