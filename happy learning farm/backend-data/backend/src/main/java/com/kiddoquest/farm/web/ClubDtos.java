package com.kiddoquest.farm.web;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ClubDtos {

    private ClubDtos() {
    }

    /** as: the child (of this account) who makes the club and joins it first. */
    public record ClubCreate(@NotBlank @Size(max = 64) String as, @NotBlank @Size(max = 40) String name) {
    }

    public record ClubJoin(@NotBlank @Size(max = 64) String as) {
    }

    public record ClubInfo(String id, String name, int members, int max) {
    }

    /**
     * One member as everyone in the club sees them. farm holds only what the shared map draws: unlocked, shirt,
     * hat, plots, animals and lands. Nobody but the owner can change any of it.
     */
    public record ClubMate(String username, String name, String look, int slot, boolean me, boolean online, JsonNode farm) {
    }

    /** club is null when the child is not in a club. */
    public record MyClub(ClubInfo club, List<ClubMate> members) {
    }
}
