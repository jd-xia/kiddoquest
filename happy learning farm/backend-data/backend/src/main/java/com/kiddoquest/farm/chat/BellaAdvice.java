package com.kiddoquest.farm.chat;

import java.time.Instant;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.kiddoquest.farm.board.BoardRanks;

/** One next step for Ask Bella, from facts already saved on the farm. */
public final class BellaAdvice {

    private static final int LOW_COINS = 30;
    private static final long DAY_MS = 86_400_000L;
    private static final Map<String, Integer> CROP_MINUTES = Map.of(
            "carrot", 2,
            "tomato", 4,
            "sunflower", 5,
            "strawberry", 6,
            "corn", 8,
            "pumpkin", 15);

    private BellaAdvice() {
    }

    public static String reply(JsonNode player, Integer leftSeconds, Instant now) {
        if (leftSeconds != null && leftSeconds <= 120) {
            return "Play time is almost gone. Finish what you are holding and stop for today.";
        }
        String hint = freshHint(player, now);
        if (hint != null) {
            return hint;
        }
        if (ripe(player, now)) {
            if (BoardRanks.coins(player) < LOW_COINS) {
                return "A crop is ready. Harvest it and sell it at the market.";
            }
            return "A crop is ready. Harvest it, then plant the field again.";
        }
        if (emptyField(player)) {
            return "A field is empty. Plant a seed, then ask me again when it is ready.";
        }
        return "Try the next maths island in the school. A first-try answer earns a coin.";
    }

    private static String freshHint(JsonNode player, Instant now) {
        if (player == null || !player.path("miss").isObject()) {
            return null;
        }
        JsonNode miss = player.get("miss");
        long at = miss.path("at").asLong(0);
        if (at <= 0 || now.toEpochMilli() - at > DAY_MS) {
            return null;
        }
        String hint = ChatText.clean(miss.path("hint").asText(""));
        if (hint.isEmpty()) {
            return null;
        }
        String name = ChatText.clean(miss.path("name").asText(""));
        String line = (name.isEmpty() ? "Try this: " : "On " + name + ": ") + hint;
        if (line.length() > ChatText.MAX) {
            return line.substring(0, ChatText.MAX).trim();
        }
        return line;
    }

    private static boolean ripe(JsonNode player, Instant now) {
        JsonNode plots = player == null ? null : player.path("farm").path("plots");
        if (plots == null || !plots.isArray()) {
            return false;
        }
        long nowMs = now.toEpochMilli();
        for (JsonNode plot : plots) {
            Integer mins = CROP_MINUTES.get(plot.path("crop").asText(""));
            long planted = plot.path("planted").asLong(0);
            if (mins == null || planted <= 0) {
                continue;
            }
            double factor = plot.path("watered").asBoolean(false) ? 0.7 : 1;
            if (nowMs - planted >= (long) (mins * 60_000L * factor)) {
                return true;
            }
        }
        return false;
    }

    private static boolean emptyField(JsonNode player) {
        if (player == null) {
            return true;
        }
        int unlocked = player.path("farm").path("unlocked").asInt(6);
        JsonNode plots = player.path("farm").path("plots");
        for (int i = 0; i < unlocked; i++) {
            JsonNode plot = plots != null && plots.isArray() && i < plots.size() ? plots.get(i) : null;
            if (plot == null || plot.isNull() || plot.path("crop").asText("").isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
