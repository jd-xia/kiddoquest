package com.kiddoquest.farm.board;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Leaderboard math. Rank is levels cleared times first-try accuracy.
 * Accuracy needs at least five answered questions, matching the progress board.
 * Stars only break a tie. Coins are not part of the rank.
 */
public final class BoardRanks {

    public static final int MIN_ANSWERS = 5;

    private BoardRanks() {
    }

    public record Stats(int cleared, int questions, int firstTry, Integer accuracy, int stars, int score) {
    }

    public static Stats empty() {
        return new Stats(0, 0, 0, null, 0, 0);
    }

    public static Stats from(JsonNode levels) {
        if (levels == null || !levels.isObject()) {
            return empty();
        }
        int cleared = 0;
        int questions = 0;
        int first = 0;
        int stars = 0;
        var fields = levels.fields();
        while (fields.hasNext()) {
            JsonNode row = fields.next().getValue();
            if (row == null || !row.isObject()) {
                continue;
            }
            int star = clamp(row.path("stars").asInt(0));
            int qs = clamp(row.path("qs").asInt(0));
            int ok = clamp(row.path("first").asInt(0));
            if (ok > qs) {
                ok = qs;
            }
            stars += star;
            questions += qs;
            first += ok;
            if (star > 0) {
                cleared++;
            }
        }
        Integer accuracy = questions >= MIN_ANSWERS ? (int) Math.round(first * 100.0 / questions) : null;
        int score = accuracy == null ? 0 : cleared * accuracy;
        return new Stats(cleared, questions, first, accuracy, stars, score);
    }

    /** Negative when {@code a} should stand above {@code b}. */
    public static int compare(Stats a, String nameA, Stats b, String nameB) {
        int score = Integer.compare(b.score(), a.score());
        if (score != 0) {
            return score;
        }
        int cleared = Integer.compare(b.cleared(), a.cleared());
        if (cleared != 0) {
            return cleared;
        }
        int accuracy = Integer.compare(shown(b.accuracy()), shown(a.accuracy()));
        if (accuracy != 0) {
            return accuracy;
        }
        int stars = Integer.compare(b.stars(), a.stars());
        if (stars != 0) {
            return stars;
        }
        return safe(nameA).compareToIgnoreCase(safe(nameB));
    }

    /** Same steps as farmLevel() in the game: 20 XP, then 40, then 60, and so on. */
    public static int farmLevel(int xp) {
        int left = Math.max(0, xp);
        int level = 1;
        int need = 20;
        while (left >= need && level < 200) {
            left -= need;
            level++;
            need = 20 * level;
        }
        return level;
    }

    public static long coins(JsonNode player) {
        if (player == null || !player.isObject()) {
            return 0;
        }
        long gems = player.path("gems").asLong(0);
        if (gems < 0) {
            return 0;
        }
        return Math.min(gems, 1_000_000_000L);
    }

    private static int shown(Integer accuracy) {
        return accuracy == null ? -1 : accuracy;
    }

    private static int clamp(int value) {
        return Math.max(0, value);
    }

    private static String safe(String name) {
        return name == null ? "" : name;
    }
}
