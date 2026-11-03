package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** One child in one club. A child is in at most one club, so the child id is the key. */
@Entity
@Table(name = "farm_club_member", indexes = @Index(name = "ix_farm_club_member_club", columnList = "club_id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_farm_club_member_slot", columnNames = {"club_id", "slot"}))
public class ClubMember {

    @Id
    @Column(name = "child_id", length = 36)
    private String childId;

    @Column(name = "club_id", nullable = false, length = 36)
    private String clubId;

    /** Where this member's fields sit on the shared map (0 to ClubService.MAX_MEMBERS - 1). */
    @Column(nullable = false)
    private int slot;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    public String getChildId() {
        return childId;
    }

    public void setChildId(String childId) {
        this.childId = childId;
    }

    public String getClubId() {
        return clubId;
    }

    public void setClubId(String clubId) {
        this.clubId = clubId;
    }

    public int getSlot() {
        return slot;
    }

    public void setSlot(int slot) {
        this.slot = slot;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }
}
