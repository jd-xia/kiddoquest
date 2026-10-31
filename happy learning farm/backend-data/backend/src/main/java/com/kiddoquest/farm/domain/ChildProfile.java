package com.kiddoquest.farm.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "farm_child", indexes = @Index(name = "ix_farm_child_owner", columnList = "owner_user_id"),
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_farm_child_username", columnNames = "username"),
                @UniqueConstraint(name = "uk_farm_child_email_name", columnNames = {"email", "display_name"})
        })
public class ChildProfile {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "owner_user_id", nullable = false, length = 36)
    private String ownerUserId;

    /** Google email of the account that owns this child. */
    @Column(length = 320)
    private String email;

    /** Public id, P plus 7 digits, starting at P0000001. Unique across every child. */
    @Column(nullable = false, length = 8)
    private String username;

    @Column(name = "display_name", nullable = false, length = 16)
    private String displayName;

    @Column(nullable = false, length = 8)
    private String grade;

    @Column(nullable = false, length = 24)
    private String look;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** The screen (one browser tab) that opened this farm last. Only that screen may sync; older ones stop. */
    @Column(name = "screen_id", length = 40)
    private String screenId;

    @Column(name = "screen_at")
    private Instant screenAt;

    /** What the screen said it is, for example "Chrome on Windows", and who was signed in there. */
    @Column(name = "screen_device", length = 80)
    private String screenDevice;

    @Column(name = "screen_email", length = 320)
    private String screenEmail;

    /** The network address that screen came from (the first X-Forwarded-For address behind nginx). */
    @Column(name = "screen_ip", length = 64)
    private String screenIp;

    public String getScreenIp() {
        return screenIp;
    }

    public void setScreenIp(String screenIp) {
        this.screenIp = screenIp;
    }

    /** Last time that screen synced or counted play time: shows whether it is still in use. */
    @Column(name = "screen_seen")
    private Instant screenSeen;

    public String getScreenDevice() {
        return screenDevice;
    }

    public void setScreenDevice(String screenDevice) {
        this.screenDevice = screenDevice;
    }

    public String getScreenEmail() {
        return screenEmail;
    }

    public void setScreenEmail(String screenEmail) {
        this.screenEmail = screenEmail;
    }

    public Instant getScreenSeen() {
        return screenSeen;
    }

    public void setScreenSeen(Instant screenSeen) {
        this.screenSeen = screenSeen;
    }

    /** The account's main farm (主账号): no time limit, and only the parent PIN opens it. */
    @Column(name = "is_main")
    private Boolean main;

    /** Play minutes a day; null means no limit. */
    @Column(name = "daily_minutes")
    private Integer dailyMinutes;

    /** The family's own date (yyyy-MM-dd) that playSeconds and bonusMinutes belong to. */
    @Column(name = "play_day", length = 10)
    private String playDay;

    @Column(name = "play_seconds")
    private Integer playSeconds;

    /** Extra minutes the parent added for playDay only. */
    @Column(name = "bonus_minutes")
    private Integer bonusMinutes;

    public boolean isMain() {
        return Boolean.TRUE.equals(main);
    }

    public void setMain(boolean main) {
        this.main = main;
    }

    public Integer getDailyMinutes() {
        return dailyMinutes;
    }

    public void setDailyMinutes(Integer dailyMinutes) {
        this.dailyMinutes = dailyMinutes;
    }

    public String getPlayDay() {
        return playDay;
    }

    public void setPlayDay(String playDay) {
        this.playDay = playDay;
    }

    public int getPlaySeconds() {
        return playSeconds == null ? 0 : playSeconds;
    }

    public void setPlaySeconds(int playSeconds) {
        this.playSeconds = playSeconds;
    }

    public int getBonusMinutes() {
        return bonusMinutes == null ? 0 : bonusMinutes;
    }

    public void setBonusMinutes(int bonusMinutes) {
        this.bonusMinutes = bonusMinutes;
    }

    public String getScreenId() {
        return screenId;
    }

    public void setScreenId(String screenId) {
        this.screenId = screenId;
    }

    public Instant getScreenAt() {
        return screenAt;
    }

    public void setScreenAt(Instant screenAt) {
        this.screenAt = screenAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(String ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public String getLook() {
        return look;
    }

    public void setLook(String look) {
        this.look = look;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
