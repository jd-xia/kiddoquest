package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * One try at a Brain Boost level. The id comes from the page, so a result sent twice (a retry after the network
 * dropped) is counted once.
 */
@Entity
@Table(name = "bb_attempt", indexes = @Index(name = "ix_bb_attempt_child", columnList = "child_id"))
public class BrainAttempt {

    @Id
    @Column(length = 80)
    private String id;

    @Column(name = "child_id", nullable = false, length = 36)
    private String childId;

    @Column(name = "topic_id", nullable = false, length = 40)
    private String topicId;

    @Column(name = "level_id", nullable = false, length = 40)
    private String levelId;

    @Column(name = "cleared", nullable = false)
    private boolean cleared;

    @Column(nullable = false)
    private int stars;

    @Column(nullable = false)
    private int correct;

    @Column(nullable = false)
    private int total;

    @Column(nullable = false)
    private int secs;

    @Column(name = "played_at", nullable = false)
    private Instant playedAt;

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

    public boolean isCleared() {
        return cleared;
    }

    public void setCleared(boolean cleared) {
        this.cleared = cleared;
    }

    public int getStars() {
        return stars;
    }

    public void setStars(int stars) {
        this.stars = stars;
    }

    public int getCorrect() {
        return correct;
    }

    public void setCorrect(int correct) {
        this.correct = correct;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getSecs() {
        return secs;
    }

    public void setSecs(int secs) {
        this.secs = secs;
    }

    public Instant getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(Instant playedAt) {
        this.playedAt = playedAt;
    }
}
