package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** A child's best result on one Brain Boost level. Every finished or stopped try is also kept in bb_attempt. */
@Entity
@Table(name = "bb_progress", indexes = @Index(name = "ix_bb_progress_child", columnList = "child_id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_bb_progress_level", columnNames = {"child_id", "topic_id", "level_id"}))
public class BrainProgress {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "child_id", nullable = false, length = 36)
    private String childId;

    @Column(name = "topic_id", nullable = false, length = 40)
    private String topicId;

    @Column(name = "level_id", nullable = false, length = 40)
    private String levelId;

    /** Best stars (0 to 3). A level counts as cleared once it has a star. */
    @Column(nullable = false)
    private int stars;

    /** Most questions right first try in one go, out of bestTotal. */
    @Column(name = "best_correct", nullable = false)
    private int bestCorrect;

    @Column(name = "best_total", nullable = false)
    private int bestTotal;

    @Column(nullable = false)
    private int plays;

    @Column(nullable = false)
    private int clears;

    @Column(name = "first_at", nullable = false)
    private Instant firstAt;

    @Column(name = "last_at", nullable = false)
    private Instant lastAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getChildId() {
        return childId;
    }

    public void setChildId(String childId) {
        this.childId = childId;
    }

    public String getTopicId() {
        return topicId;
    }

    public void setTopicId(String topicId) {
        this.topicId = topicId;
    }

    public String getLevelId() {
        return levelId;
    }

    public void setLevelId(String levelId) {
        this.levelId = levelId;
    }

    public int getStars() {
        return stars;
    }

    public void setStars(int stars) {
        this.stars = stars;
    }

    public int getBestCorrect() {
        return bestCorrect;
    }

    public void setBestCorrect(int bestCorrect) {
        this.bestCorrect = bestCorrect;
    }

    public int getBestTotal() {
        return bestTotal;
    }

    public void setBestTotal(int bestTotal) {
        this.bestTotal = bestTotal;
    }

    public int getPlays() {
        return plays;
    }

    public void setPlays(int plays) {
        this.plays = plays;
    }

    public int getClears() {
        return clears;
    }

    public void setClears(int clears) {
        this.clears = clears;
    }

    public Instant getFirstAt() {
        return firstAt;
    }

    public void setFirstAt(Instant firstAt) {
        this.firstAt = firstAt;
    }

    public Instant getLastAt() {
        return lastAt;
    }

    public void setLastAt(Instant lastAt) {
        this.lastAt = lastAt;
    }
}
