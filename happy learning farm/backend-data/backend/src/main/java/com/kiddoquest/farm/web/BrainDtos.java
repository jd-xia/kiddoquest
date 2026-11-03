package com.kiddoquest.farm.web;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class BrainDtos {

    private BrainDtos() {
    }

    /** Topic and level ids are folder names under brain-boost/topics: calculation-tricks, level-01. */
    static final String ITEM = "[a-z0-9][a-z0-9-]{0,39}";

    /** profile: what the child plays (null: the default for their grade). draft: a grown-up's unpublished work. */
    public record BrainState(JsonNode profile, Instant profileUpdatedAt, JsonNode draft, Instant draftUpdatedAt,
            List<LevelProgress> progress) {
    }

    public record LevelProgress(String topic, String level, int stars, int bestCorrect, int bestTotal, int plays,
            int clears, Instant firstAt, Instant lastAt) {
    }

    /**
     * A grown-up's change to one child's profile. Publishing with profile null goes back to the default for the
     * child's grade; saving a null draft throws the draft away.
     */
    public record ProfileWrite(@NotBlank @Pattern(regexp = FarmDtos.PIN) String pin, JsonNode profile) {
    }

    /** One finished (cleared true) or stopped try. stars counts only when cleared. */
    public record ResultWrite(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_.:-]{8,80}") String attemptId,
            @NotBlank @Pattern(regexp = ITEM) String topic,
            @NotBlank @Pattern(regexp = ITEM) String level,
            @NotNull Boolean cleared,
            @NotNull @Min(0) @Max(3) Integer stars,
            @NotNull @Min(0) @Max(500) Integer correct,
            @NotNull @Min(0) @Max(500) Integer total,
            @NotNull @Min(0) @Max(36_000) Integer secs) {
    }

    /** repeat: this attempt was already counted (the page sent it again). */
    public record ResultSaved(LevelProgress progress, boolean repeat) {
    }
}
