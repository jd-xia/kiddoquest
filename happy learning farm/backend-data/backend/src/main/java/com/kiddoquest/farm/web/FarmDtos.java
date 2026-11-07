package com.kiddoquest.farm.web;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class FarmDtos {

    private FarmDtos() {
    }

    public record ChildWrite(
            @NotBlank @Size(max = 16) String displayName,
            @NotBlank @Size(max = 8) String grade,
            @Size(max = 24) String look,
            JsonNode player) {
    }

    public record ChildPatch(
            @Size(max = 16) String displayName,
            @Size(max = 8) String grade,
            @Size(max = 24) String look) {
    }

    public record ChildSummary(String id, String username, String email, String displayName, String grade, String look,
            long revision, Instant updatedAt, boolean main) {
    }

    public record ChildState(String id, String username, String email, String displayName, String grade, String look,
            long revision, Instant updatedAt, JsonNode player, String contentHash, String updatedBy) {
    }

    public record SyncRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_.:-]{8,80}") String idempotencyKey,
            @NotNull @Min(0) @Max(1_000_000_000) Long baseRevision,
            @NotBlank @Pattern(regexp = "upload|keep_local|keep_server|merge") String policy,
            @NotNull JsonNode player,
            @Pattern(regexp = SCREEN) String screen) {
    }

    /** One browser tab. Pages without it (older pages) still sync, but cannot stop other screens. */
    static final String SCREEN = "[A-Za-z0-9_-]{8,40}";

    public record ScreenClaim(@NotBlank @Pattern(regexp = SCREEN) String screen, @Size(max = 80) String device) {
    }

    /** seen: the last sync or play-time count from that screen, so the page can say whether it is in use. */
    public record ScreenState(String screen, Instant at, String device, String email, Instant seen, String ip) {
    }

    /** The family's own date, so a day of play time starts at the family's midnight. */
    static final String DAY = "\\d{4}-\\d{2}-\\d{2}";
    static final String PIN = "\\d{4}";

    /** One heartbeat while a farm is on screen: seconds played since the last one (at most 60 count). */
    public record PlayBeat(@NotBlank @Pattern(regexp = DAY) String day, @NotNull @Min(0) @Max(600) Integer seconds,
            @Pattern(regexp = SCREEN) String screen) {
    }

    /** limitMinutes null: no limit (the main farm, or no limit set). leftSeconds is then null too. */
    public record PlayTime(String day, boolean main, Integer limitMinutes, int bonusMinutes, int usedSeconds,
            Integer leftSeconds) {
    }

    /** coins: what the saved farm has now; null when the farm was never saved. */
    public record KidTime(String id, String username, String displayName, String look, boolean main, Integer dailyMinutes,
            int bonusMinutes, int usedSeconds, Long coins) {
    }

    /** A parent gives (add > 0) or takes away (add < 0) coins. */
    public record CoinWrite(
            @NotBlank @Pattern(regexp = PIN) String pin,
            @NotBlank @Pattern(regexp = DAY) String day,
            @NotNull @Min(-100_000) @Max(100_000) Integer add) {
    }

    public record Family(boolean pinSet, List<KidTime> kids) {
    }

    /** Sets the PIN the first time; changing it needs the old one. */
    public record PinSet(@Pattern(regexp = PIN) String oldPin, @NotBlank @Pattern(regexp = PIN) String pin) {
    }

    public record PinCheck(@NotBlank @Pattern(regexp = PIN) String pin) {
    }

    /** Parent changes for one child. dailyMinutes 0 means no limit; null leaves it as it is. */
    public record KidTimeWrite(
            @NotBlank @Pattern(regexp = PIN) String pin,
            @NotBlank @Pattern(regexp = DAY) String day,
            Boolean main,
            @Min(0) @Max(600) Integer dailyMinutes,
            @Min(-600) @Max(600) Integer addMinutes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SyncResponse(String status, long revision, String childId, JsonNode player, JsonNode serverPlayer,
            List<String> notes, Instant updatedAt, String updatedBy, String contentHash) {
    }

    public record BoardEntry(String username, String name, String grade, String look, int cleared,
            int questions, int firstTry, Integer accuracy, int stars, int score, boolean online, int level, long coins) {
    }

    public record ChatLine(String id, String from, String name, String look, String text, Instant at, String kind,
            String voice, String mime) {
    }

    public record ChatTicket(String ticket) {
    }

    public record VoiceSend(
            @NotBlank String as,
            @NotBlank String to,
            @NotBlank String voice,
            @Size(max = 80) String mime) {
    }

    /** picture is a data URL; model is the base64 of a .glb or .gltf, or empty for a picture only. */
    public record GalleryShare(
            @NotBlank String as,
            @NotBlank @Size(max = 48) String key,
            @NotBlank String picture,
            @Size(max = 12) String style,
            String model,
            @Size(max = 200) String modelName) {
    }

    public record GalleryItem(String id, String key, String from, String name, String picture, String style,
            boolean model, long modelBytes, String modelName, Instant at, boolean mine) {
    }
}
