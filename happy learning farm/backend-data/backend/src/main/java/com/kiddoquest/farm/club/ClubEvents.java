package com.kiddoquest.farm.club;

import java.util.List;

/** Told to the chat socket after the database has the change, so club members see it at once. */
public final class ClubEvents {

    private ClubEvents() {
    }

    /** Someone made, joined or left a club. usernames: everyone whose club may have changed. */
    public record ClubChanged(String clubId, List<String> usernames) {
    }

    /** A child's saved farm changed. Club mates reload that child's fields and animals. */
    public record FarmSaved(String childId, String username) {
    }
}
