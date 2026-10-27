package com.kiddoquest.farm.sync;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Component
public class GameStateValidator {

    static final Set<String> SEEDS = Set.of("carrot", "tomato", "sunflower", "strawberry", "corn", "pumpkin");
    static final Set<String> BARN = Set.of("carrot", "tomato", "sunflower", "strawberry", "corn", "pumpkin", "egg", "wool", "milk");
    static final Set<String> ANIMALS = Set.of("chicken", "sheep", "cow");
    static final Set<String> DECOR = Set.of("flowers", "lanterns", "scarecrow", "apples", "pond", "windmill");
    static final Set<String> SHIRTS = Set.of("red", "blue", "green", "yellow", "purple", "pink");
    static final Set<String> HATS = Set.of("none", "straw", "cap", "flowers", "crown");
    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9_.:-]{1,40}");
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");
    private static final Pattern DAY = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private final ObjectMapper mapper;

    public GameStateValidator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public ObjectNode sanitize(JsonNode raw, String fallbackName, String fallbackGrade, String fallbackLook, Instant now) {
        if (raw == null || !raw.isObject()) {
            throw new SyncRejectedException("Farm data could not be read. This device was not changed.");
        }
        try {
            if (mapper.writeValueAsBytes(raw).length > 512_000) {
                throw new SyncRejectedException("Farm data is too large. This device was not changed.");
            }
        } catch (SyncRejectedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new SyncRejectedException("Farm data could not be read. This device was not changed.");
        }
        long nowMs = now.toEpochMilli();
        ObjectNode out = mapper.createObjectNode();
        String id = raw.path("id").asText("");
        out.put("id", ID.matcher(id).matches() ? id : "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        out.put("name", cleanName(raw.path("name").asText(""), fallbackName));
        out.put("grade", cleanGrade(raw.path("grade").asText(""), fallbackGrade));
        out.put("look", cleanLook(text(raw, "look", fallbackLook)));
        out.put("avatar", keyOr(raw.path("avatar").asText(""), "chick"));
        out.set("owned", stringList(raw.get("owned"), 40, true));
        out.put("gems", coins(raw.get("gems")));
        out.set("seen", flags(raw.get("seen"), 200));
        out.set("lv", levels(raw.get("lv"), nowMs));
        out.set("sessions", sessions(raw.get("sessions"), nowMs));
        out.put("time", clamp(number(raw.get("time")), 0, 315_360_000));
        if (raw.has("daily")) {
            ObjectNode daily = daily(raw.get("daily"));
            if (daily != null) {
                out.set("daily", daily);
            }
        }
        if (raw.has("streak") && raw.get("streak").isObject()) {
            out.set("streak", streak(raw.get("streak")));
        }
        if (raw.has("avatar3d") && raw.get("avatar3d").isObject()) {
            try {
                if (mapper.writeValueAsBytes(raw.get("avatar3d")).length <= 100_000) {
                    out.set("avatar3d", raw.get("avatar3d"));
                }
            } catch (Exception ignored) {
                // Drop a portrait that cannot be stored. The rest of the farm still syncs.
            }
        }
        out.set("farm", farm(raw.get("farm"), nowMs));
        return out;
    }

    public void checkCoins(long previous, Instant previousAt, long next, String policy, Instant now) {
        long cap;
        if (previousAt == null || "keep_local".equals(policy)) {
            cap = Math.max(previous, 20_000L);
        } else {
            long days = Math.max(1, ChronoUnit.DAYS.between(previousAt, now) + 1);
            days = Math.min(days, 400);
            cap = previous + 40L * days + 40L;
        }
        if (next > cap) {
            throw new SyncRejectedException("Coin total is too far ahead of the saved farm. This device was not changed.");
        }
    }

    public String cleanName(String raw, String fallback) {
        String trimmed = raw == null ? "" : raw.replaceAll("\\p{Cntrl}", "").trim();
        if (trimmed.length() > 16) {
            trimmed = trimmed.substring(0, 16).trim();
        }
        if (trimmed.isEmpty()) {
            trimmed = fallback == null ? "" : fallback.replaceAll("\\p{Cntrl}", "").trim();
        }
        if (trimmed.isEmpty()) {
            return "Farmer";
        }
        return trimmed.length() > 16 ? trimmed.substring(0, 16).trim() : trimmed;
    }

    public String cleanGrade(String grade, String fallback) {
        if ("p1".equals(grade) || "p3".equals(grade)) {
            return grade;
        }
        if ("p1".equals(fallback) || "p3".equals(fallback)) {
            return fallback;
        }
        return "p3";
    }

    public String cleanLook(String look) {
        if (look == null) {
            return "boy";
        }
        String cleaned = look.replaceAll("[^A-Za-z0-9]", "");
        if (cleaned.isEmpty() || cleaned.length() > 24) {
            return "boy";
        }
        return cleaned;
    }

    private ObjectNode farm(JsonNode raw, long nowMs) {
        ObjectNode farm = mapper.createObjectNode();
        JsonNode in = raw != null && raw.isObject() ? raw : mapper.createObjectNode();
        int unlocked = (int) clamp(number(in.get("unlocked"), 6), 6, 12);
        farm.put("unlocked", unlocked);
        farm.put("xp", clamp(number(in.get("xp")), 0, 1_000_000));
        String shirt = SHIRTS.contains(in.path("shirt").asText("")) ? in.path("shirt").asText() : "red";
        String hat = HATS.contains(in.path("hat").asText("")) ? in.path("hat").asText() : "straw";
        farm.put("shirt", shirt);
        farm.put("hat", hat);
        farm.set("owned", clothes(in.get("owned"), shirt, hat));
        farm.set("decor", decor(in.get("decor")));
        farm.set("animals", animals(in.get("animals"), nowMs));
        farm.set("barn", barn(in.get("barn")));
        farm.set("plots", plots(in.get("plots"), nowMs));
        return farm;
    }

    private ArrayNode plots(JsonNode raw, long nowMs) {
        ArrayNode plots = mapper.createArrayNode();
        if (raw == null || !raw.isArray()) {
            return plots;
        }
        long min = nowMs - 7L * 24 * 60 * 60 * 1000;
        int limit = Math.min(12, raw.size());
        for (int i = 0; i < limit; i++) {
            JsonNode plot = raw.get(i);
            if (plot == null || !plot.isObject() || !SEEDS.contains(plot.path("crop").asText(""))) {
                plots.addNull();
                continue;
            }
            long planted = number(plot.get("planted"), nowMs);
            if (planted < min) {
                planted = min;
            }
            if (planted > nowMs) {
                planted = nowMs;
            }
            ObjectNode kept = plots.addObject();
            kept.put("crop", plot.path("crop").asText());
            kept.put("planted", planted);
            kept.put("watered", plot.path("watered").asBoolean(false));
        }
        return plots;
    }

    private ArrayNode animals(JsonNode raw, long nowMs) {
        ArrayNode animals = mapper.createArrayNode();
        if (raw == null || !raw.isArray()) {
            return animals;
        }
        long min = nowMs - 30L * 24 * 60 * 60 * 1000;
        int[] counts = new int[3];
        for (JsonNode animal : raw) {
            if (!animal.isObject()) {
                continue;
            }
            String type = animal.path("type").asText("");
            int slot = type.equals("chicken") ? 0 : type.equals("sheep") ? 1 : type.equals("cow") ? 2 : -1;
            if (slot < 0 || counts[slot] >= 3) {
                continue;
            }
            counts[slot]++;
            long last = number(animal.get("last"), nowMs);
            if (last < min) {
                last = min;
            }
            if (last > nowMs) {
                last = nowMs;
            }
            ObjectNode kept = animals.addObject();
            kept.put("type", type);
            kept.put("last", last);
            if (animals.size() >= 9) {
                break;
            }
        }
        return animals;
    }

    private ArrayNode decor(JsonNode raw) {
        ArrayNode decor = mapper.createArrayNode();
        if (raw == null || !raw.isArray()) {
            return decor;
        }
        Set<String> seen = new LinkedHashSet<>();
        for (JsonNode item : raw) {
            String id = item.asText("");
            if (DECOR.contains(id) && seen.add(id)) {
                decor.add(id);
            }
        }
        return decor;
    }

    private ArrayNode clothes(JsonNode raw, String shirt, String hat) {
        Set<String> owned = new LinkedHashSet<>();
        owned.add("shirt:" + shirt);
        owned.add("hat:" + hat);
        if (raw != null && raw.isArray()) {
            for (JsonNode item : raw) {
                String id = item.asText("");
                int cut = id.indexOf(':');
                if (cut < 1) {
                    continue;
                }
                String kind = id.substring(0, cut);
                String value = id.substring(cut + 1);
                if (("shirt".equals(kind) && SHIRTS.contains(value)) || ("hat".equals(kind) && HATS.contains(value))) {
                    owned.add(id);
                }
                if (owned.size() >= 24) {
                    break;
                }
            }
        }
        ArrayNode out = mapper.createArrayNode();
        owned.forEach(out::add);
        return out;
    }

    private ObjectNode barn(JsonNode raw) {
        ObjectNode barn = mapper.createObjectNode();
        if (raw == null || !raw.isObject()) {
            return barn;
        }
        raw.fields().forEachRemaining(entry -> {
            if (BARN.contains(entry.getKey())) {
                barn.put(entry.getKey(), clamp(number(entry.getValue()), 0, 9999));
            }
        });
        return barn;
    }

    private ObjectNode levels(JsonNode raw, long nowMs) {
        ObjectNode lv = mapper.createObjectNode();
        if (raw == null || !raw.isObject()) {
            return lv;
        }
        int count = 0;
        var fields = raw.fields();
        while (fields.hasNext() && count < 200) {
            var entry = fields.next();
            if (!KEY.matcher(entry.getKey()).matches() || !entry.getValue().isObject()) {
                continue;
            }
            JsonNode rec = entry.getValue();
            ObjectNode kept = lv.putObject(entry.getKey());
            kept.put("stars", clamp(number(rec.get("stars")), 0, 3));
            kept.put("plays", clamp(number(rec.get("plays")), 0, 100_000));
            kept.put("clears", clamp(number(rec.get("clears")), 0, 100_000));
            kept.put("qs", clamp(number(rec.get("qs")), 0, 1_000_000));
            kept.put("first", clamp(number(rec.get("first")), 0, 1_000_000));
            kept.put("last", clamp(number(rec.get("last")), 0, nowMs + 60_000));
            count++;
        }
        return lv;
    }

    private ArrayNode sessions(JsonNode raw, long nowMs) {
        ArrayNode sessions = mapper.createArrayNode();
        if (raw == null || !raw.isArray()) {
            return sessions;
        }
        int added = 0;
        for (JsonNode item : raw) {
            if (added >= 60 || !item.isObject()) {
                continue;
            }
            ObjectNode row = sessions.addObject();
            row.put("t", clamp(number(item.get("t")), 0, nowMs + 60_000));
            row.put("d", keyOr(item.path("d").asText(""), ""));
            row.put("lv", keyOr(item.path("lv").asText(""), ""));
            row.put("stars", clamp(number(item.get("stars")), 0, 3));
            row.put("qs", clamp(number(item.get("qs")), 0, 100));
            row.put("first", clamp(number(item.get("first")), 0, 100));
            row.put("secs", clamp(number(item.get("secs")), 0, 36_000));
            row.put("ok", item.path("ok").asBoolean(false));
            added++;
        }
        return sessions;
    }

    private ObjectNode daily(JsonNode raw) {
        if (raw == null || !raw.isObject() || !DAY.matcher(raw.path("d").asText("")).matches()) {
            return null;
        }
        ObjectNode daily = mapper.createObjectNode();
        daily.put("d", raw.path("d").asText());
        daily.put("coins", clamp(number(raw.get("coins")), 0, 40));
        daily.put("chest", raw.path("chest").asBoolean(false));
        ObjectNode counts = daily.putObject("n");
        JsonNode n = raw.get("n");
        if (n != null && n.isObject()) {
            int count = 0;
            var fields = n.fields();
            while (fields.hasNext() && count < 20) {
                var entry = fields.next();
                if (KEY.matcher(entry.getKey()).matches()) {
                    counts.put(entry.getKey(), clamp(number(entry.getValue()), 0, 20));
                    count++;
                }
            }
        }
        ObjectNode levels = daily.putObject("levels");
        JsonNode days = raw.get("levels");
        if (days != null && days.isObject()) {
            int count = 0;
            var fields = days.fields();
            while (fields.hasNext() && count < 40) {
                var entry = fields.next();
                if (KEY.matcher(entry.getKey()).matches()) {
                    levels.put(entry.getKey(), entry.getValue().asBoolean(false));
                    count++;
                }
            }
        }
        return daily;
    }

    private ObjectNode streak(JsonNode raw) {
        ObjectNode streak = mapper.createObjectNode();
        String last = raw.path("last").asText("");
        streak.put("last", DAY.matcher(last).matches() ? last : "");
        long days = clamp(number(raw.get("days")), 0, 10_000);
        long best = Math.max(days, clamp(number(raw.get("best")), 0, 10_000));
        streak.put("days", days);
        streak.put("best", best);
        return streak;
    }

    private ObjectNode flags(JsonNode raw, int max) {
        ObjectNode seen = mapper.createObjectNode();
        if (raw == null || !raw.isObject()) {
            return seen;
        }
        int count = 0;
        var fields = raw.fields();
        while (fields.hasNext() && count < max) {
            var entry = fields.next();
            if (KEY.matcher(entry.getKey()).matches()) {
                seen.put(entry.getKey(), entry.getValue().asBoolean(false));
                count++;
            }
        }
        return seen;
    }

    private ArrayNode stringList(JsonNode raw, int max, boolean ensureChick) {
        Set<String> values = new LinkedHashSet<>();
        if (raw != null && raw.isArray()) {
            for (JsonNode item : raw) {
                String key = keyOr(item.asText(""), "");
                if (!key.isEmpty()) {
                    values.add(key);
                }
                if (values.size() >= max) {
                    break;
                }
            }
        }
        if (ensureChick) {
            values.add("chick");
        }
        ArrayNode out = mapper.createArrayNode();
        values.forEach(out::add);
        return out;
    }

    private static long coins(JsonNode node) {
        if (node == null || !node.isNumber()) {
            return 0;
        }
        double value = node.asDouble();
        if (value > 20_000_000d) {
            return 20_000_001L;
        }
        if (value <= 0) {
            return 0;
        }
        return (long) value;
    }

    private static long number(JsonNode node) {
        return number(node, 0);
    }

    private static long number(JsonNode node, long fallback) {
        if (node == null || !node.isNumber()) {
            return fallback;
        }
        double value = node.asDouble();
        if (value > Long.MAX_VALUE / 4d) {
            return Long.MAX_VALUE / 4;
        }
        if (value < 0) {
            return 0;
        }
        return (long) value;
    }

    private static long clamp(long value, long min, long max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String keyOr(String value, String fallback) {
        return value != null && KEY.matcher(value).matches() ? value : fallback;
    }

    private static String text(JsonNode raw, String field, String fallback) {
        String value = raw.path(field).asText("");
        return value.isBlank() ? fallback : value;
    }
}
