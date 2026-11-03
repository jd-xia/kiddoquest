package com.kiddoquest.farm.domain;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One child's Brain Boost Profile: which topics are on, in what order, which levels each topic holds, and the
 * grown-up's own names, rules and questions. A child with no published profile plays the default for their
 * grade (brain-boost/profiles/&lt;grade&gt;.json). A grown-up works on a draft; the child only ever sees what
 * was published.
 */
@Entity
@Table(name = "bb_profile")
public class BrainProfile {

    @Id
    @Column(name = "child_id", length = 36)
    private String childId;

    /** The published profile, or null while there is only a draft. See BrainBoostService.clean for the shape. */
    @JdbcTypeCode(SqlTypes.LONG32VARCHAR)
    @Column(name = "profile_json")
    private String profileJson;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Work in progress, not shown to the child until it is published. */
    @JdbcTypeCode(SqlTypes.LONG32VARCHAR)
    @Column(name = "draft_json")
    private String draftJson;

    @Column(name = "draft_updated_at")
    private Instant draftUpdatedAt;

    public String getDraftJson() {
        return draftJson;
    }

    public void setDraftJson(String draftJson) {
        this.draftJson = draftJson;
    }

    public Instant getDraftUpdatedAt() {
        return draftUpdatedAt;
    }

    public void setDraftUpdatedAt(Instant draftUpdatedAt) {
        this.draftUpdatedAt = draftUpdatedAt;
    }

    public String getChildId() {
        return childId;
    }

    public void setChildId(String childId) {
        this.childId = childId;
    }

    public String getProfileJson() {
        return profileJson;
    }

    public void setProfileJson(String profileJson) {
        this.profileJson = profileJson;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
