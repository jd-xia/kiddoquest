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

    public record ChildSummary(String id, String displayName, String grade, String look, long revision, Instant updatedAt) {
    }

    public record ChildState(String id, String displayName, String grade, String look, long revision, Instant updatedAt,
            JsonNode player) {
    }

    public record SyncRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_.:-]{8,80}") String idempotencyKey,
            @NotNull @Min(0) @Max(1_000_000_000) Long baseRevision,
            @NotBlank @Pattern(regexp = "upload|keep_local|keep_server|merge") String policy,
            @NotNull JsonNode player) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SyncResponse(String status, long revision, String childId, JsonNode player, JsonNode serverPlayer,
            List<String> notes) {
    }
}
