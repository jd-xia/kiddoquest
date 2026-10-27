package com.kiddoquest.farm.sync;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
public class GameStateMerger {

    private final ObjectMapper mapper;

    public GameStateMerger(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public MergeResult merge(JsonNode local, JsonNode server) {
        ObjectNode out = server != null && server.isObject()
                ? (ObjectNode) server.deepCopy()
                : mapper.createObjectNode();
        List<String> notes = new ArrayList<>();
        copyText(out, local, "id", "name", "grade", "look", "avatar");
        maxNumber(out, local, "gems", "Kept the higher coin total.", notes);
        maxNumber(out, local, "time", null, notes);
        mergeFlags(out, local, "seen");
        mergeLevels(out, local, notes);
        mergeSessions(out, local);
        mergeDaily(out, local, notes);
        mergeStreak(out, local, notes);
        mergeStringArray(out, local, "owned");
        if (local != null && local.has("avatar3d")) {
            out.set("avatar3d", local.get("avatar3d"));
        }
        out.set("farm", mergeFarm(out.get("farm"), local == null ? null : local.get("farm"), notes));
        if (notes.isEmpty()) {
            notes.add("Combined both farms.");
        }
        if (notes.size() > 8) {
            notes = new ArrayList<>(notes.subList(0, 8));
        }
        return new MergeResult(out, List.copyOf(notes));
    }

    private ObjectNode mergeFarm(JsonNode serverFarm, JsonNode localFarm, List<String> notes) {
        ObjectNode farm = serverFarm != null && serverFarm.isObject()
                ? (ObjectNode) serverFarm.deepCopy()
                : mapper.createObjectNode();
        if ((serverFarm == null || serverFarm.isNull()) && localFarm != null && localFarm.isObject()) {
            farm = (ObjectNode) localFarm.deepCopy();
        }
        if (localFarm != null && localFarm.isObject()) {
            if (localFarm.path("xp").asLong(0) > farm.path("xp").asLong(0)) {
                farm.put("xp", localFarm.path("xp").asLong(0));
                notes.add("Kept the higher farm XP.");
            }
            farm.put("unlocked", Math.max(farm.path("unlocked").asInt(6), localFarm.path("unlocked").asInt(6)));
            if (localFarm.hasNonNull("shirt")) {
                farm.put("shirt", localFarm.path("shirt").asText(farm.path("shirt").asText("red")));
            }
            if (localFarm.hasNonNull("hat")) {
                farm.put("hat", localFarm.path("hat").asText(farm.path("hat").asText("straw")));
            }
            mergeStringArray(farm, localFarm, "owned");
            mergeStringArray(farm, localFarm, "decor");
            mergeBarn(farm, localFarm, notes);
            farm.set("animals", mergeAnimals(farm.get("animals"), localFarm.get("animals"), notes));
            farm.set("plots", mergePlots(farm.get("plots"), localFarm.get("plots"), notes));
        }
        return farm;
    }

    private void mergeLevels(ObjectNode out, JsonNode local, List<String> notes) {
        ObjectNode levels = object(out.get("lv"));
        ObjectNode theirs = object(local == null ? null : local.get("lv"));
        boolean stars = false;
        theirs.fieldNames().forEachRemaining(name -> {
            ObjectNode base = levels.has(name) && levels.get(name).isObject()
                    ? (ObjectNode) levels.get(name)
                    : levels.putObject(name);
            JsonNode extra = theirs.get(name);
            if (extra.path("stars").asInt(0) > base.path("stars").asInt(0)) {
                base.put("stars", extra.path("stars").asInt(0));
            }
            for (String field : List.of("plays", "clears", "qs", "first")) {
                if (extra.path(field).asLong(0) > base.path(field).asLong(0)) {
                    base.put(field, extra.path(field).asLong(0));
                }
            }
            if (extra.path("last").asLong(0) > base.path("last").asLong(0)) {
                base.put("last", extra.path("last").asLong(0));
            }
        });
        var names = levels.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            int localStars = theirs.path(name).path("stars").asInt(0);
            int serverStars = serverStars(out, name);
            if (localStars != serverStars) {
                stars = true;
                break;
            }
        }
        out.set("lv", levels);
        if (stars) {
            notes.add("Kept the better star score on each level.");
        }
    }

    private int serverStars(ObjectNode original, String name) {
        JsonNode lv = original.get("lv");
        if (lv == null || !lv.has(name)) {
            return 0;
        }
        return lv.path(name).path("stars").asInt(0);
    }

    private void mergeSessions(ObjectNode out, JsonNode local) {
        Map<String, ObjectNode> rows = new LinkedHashMap<>();
        addSessions(rows, out.get("sessions"));
        addSessions(rows, local == null ? null : local.get("sessions"));
        List<ObjectNode> ordered = new ArrayList<>(rows.values());
        ordered.sort(Comparator.comparingLong((ObjectNode row) -> row.path("t").asLong(0)).reversed());
        ArrayNode sessions = mapper.createArrayNode();
        for (int i = 0; i < Math.min(60, ordered.size()); i++) {
            sessions.add(ordered.get(i));
        }
        out.set("sessions", sessions);
    }

    private void addSessions(Map<String, ObjectNode> rows, JsonNode source) {
        if (source == null || !source.isArray()) {
            return;
        }
        for (JsonNode item : source) {
            if (!item.isObject()) {
                continue;
            }
            String key = item.path("t").asText() + "|" + item.path("lv").asText() + "|" + item.path("secs").asText()
                    + "|" + item.path("ok").asText();
            rows.putIfAbsent(key, (ObjectNode) item.deepCopy());
        }
    }

    private void mergeDaily(ObjectNode out, JsonNode local, List<String> notes) {
        JsonNode left = local == null ? null : local.get("daily");
        JsonNode right = out.get("daily");
        if (left == null || !left.isObject()) {
            return;
        }
        if (right == null || !right.isObject()) {
            out.set("daily", left.deepCopy());
            return;
        }
        if (!left.path("d").asText().equals(right.path("d").asText())) {
            if (left.path("d").asText().compareTo(right.path("d").asText()) > 0) {
                out.set("daily", left.deepCopy());
                notes.add("Kept today's task list.");
            }
            return;
        }
        ObjectNode daily = (ObjectNode) right.deepCopy();
        daily.put("coins", Math.max(left.path("coins").asInt(0), right.path("coins").asInt(0)));
        daily.put("chest", left.path("chest").asBoolean(false) || right.path("chest").asBoolean(false));
        daily.set("n", maxObject(right.get("n"), left.get("n")));
        daily.set("levels", orObject(right.get("levels"), left.get("levels")));
        out.set("daily", daily);
    }

    private void mergeStreak(ObjectNode out, JsonNode local, List<String> notes) {
        JsonNode left = local == null ? null : local.get("streak");
        JsonNode right = out.get("streak");
        if (left == null || !left.isObject()) {
            return;
        }
        if (right == null || !right.isObject()) {
            out.set("streak", left.deepCopy());
            return;
        }
        ObjectNode streak = mapper.createObjectNode();
        String later = left.path("last").asText().compareTo(right.path("last").asText()) >= 0
                ? left.path("last").asText()
                : right.path("last").asText();
        JsonNode chosen = later.equals(left.path("last").asText()) ? left : right;
        long days = chosen.path("days").asLong(0);
        long best = Math.max(left.path("best").asLong(0), right.path("best").asLong(0));
        streak.put("last", later);
        streak.put("days", days);
        streak.put("best", Math.max(best, days));
        out.set("streak", streak);
        if (best > right.path("best").asLong(0)) {
            notes.add("Kept the longer streak.");
        }
    }

    private void mergeBarn(ObjectNode farm, JsonNode localFarm, List<String> notes) {
        ObjectNode barn = object(farm.get("barn"));
        JsonNode extra = localFarm.get("barn");
        boolean changed = false;
        if (extra != null && extra.isObject()) {
            var fields = extra.fields();
            while (fields.hasNext()) {
                var entry = fields.next();
                long value = entry.getValue().asLong(0);
                if (value > barn.path(entry.getKey()).asLong(0)) {
                    barn.put(entry.getKey(), value);
                    changed = true;
                }
            }
        }
        farm.set("barn", barn);
        if (changed) {
            notes.add("Kept the larger barn stacks.");
        }
    }

    private ArrayNode mergeAnimals(JsonNode server, JsonNode local, List<String> notes) {
        Map<String, JsonNode> kept = new LinkedHashMap<>();
        addAnimals(kept, server);
        int before = kept.size();
        addAnimals(kept, local);
        Map<String, Integer> counts = new LinkedHashMap<>();
        ArrayNode animals = mapper.createArrayNode();
        List<JsonNode> ordered = new ArrayList<>(kept.values());
        ordered.sort(Comparator.comparingLong(item -> item.path("last").asLong(0)));
        for (JsonNode animal : ordered) {
            String type = animal.path("type").asText("");
            int count = counts.getOrDefault(type, 0);
            if (type.isEmpty() || count >= 3) {
                continue;
            }
            counts.put(type, count + 1);
            animals.add(animal.deepCopy());
        }
        if (kept.size() > before) {
            notes.add("Kept animals from both farms, up to 3 of each.");
        }
        return animals;
    }

    private void addAnimals(Map<String, JsonNode> kept, JsonNode source) {
        if (source == null || !source.isArray()) {
            return;
        }
        for (JsonNode animal : source) {
            if (!animal.isObject()) {
                continue;
            }
            String key = animal.path("type").asText("") + "|" + animal.path("last").asText();
            kept.putIfAbsent(key, animal);
        }
    }

    private ArrayNode mergePlots(JsonNode server, JsonNode local, List<String> notes) {
        ArrayNode left = array(local);
        ArrayNode right = array(server);
        int size = Math.min(12, Math.max(left.size(), right.size()));
        ArrayNode plots = mapper.createArrayNode();
        for (int i = 0; i < size; i++) {
            JsonNode a = i < left.size() ? left.get(i) : null;
            JsonNode b = i < right.size() ? right.get(i) : null;
            plots.add(choosePlot(a, b, notes));
        }
        return plots;
    }

    private JsonNode choosePlot(JsonNode local, JsonNode server, List<String> notes) {
        boolean localOk = local != null && local.isObject();
        boolean serverOk = server != null && server.isObject();
        if (!localOk) {
            return serverOk ? server.deepCopy() : mapper.nullNode();
        }
        if (!serverOk) {
            return local.deepCopy();
        }
        String cropA = local.path("crop").asText("");
        String cropB = server.path("crop").asText("");
        if (!cropA.equals(cropB)) {
            notes.add("A field kept the crop growing on this device.");
            return local.deepCopy();
        }
        ObjectNode plot = mapper.createObjectNode();
        plot.put("crop", cropA);
        plot.put("planted", Math.min(local.path("planted").asLong(Long.MAX_VALUE), server.path("planted").asLong(Long.MAX_VALUE)));
        plot.put("watered", local.path("watered").asBoolean(false) || server.path("watered").asBoolean(false));
        return plot;
    }

    private void mergeFlags(ObjectNode out, JsonNode local, String field) {
        ObjectNode flags = object(out.get(field));
        JsonNode extra = local == null ? null : local.get(field);
        if (extra != null && extra.isObject()) {
            extra.fields().forEachRemaining(entry -> flags.put(entry.getKey(), flags.path(entry.getKey()).asBoolean(false) || entry.getValue().asBoolean(false)));
        }
        out.set(field, flags);
    }

    private void mergeStringArray(ObjectNode out, JsonNode local, String field) {
        LinkedHashMap<String, Boolean> values = new LinkedHashMap<>();
        addStrings(values, out.get(field));
        addStrings(values, local == null ? null : local.get(field));
        ArrayNode array = mapper.createArrayNode();
        values.keySet().forEach(array::add);
        out.set(field, array);
    }

    private void addStrings(Map<String, Boolean> values, JsonNode source) {
        if (source == null || !source.isArray()) {
            return;
        }
        for (JsonNode item : source) {
            if (item.isTextual()) {
                values.put(item.asText(), true);
            }
        }
    }

    private ObjectNode maxObject(JsonNode left, JsonNode right) {
        ObjectNode out = object(left);
        if (right != null && right.isObject()) {
            right.fields().forEachRemaining(entry -> {
                if (entry.getValue().asLong(0) > out.path(entry.getKey()).asLong(0)) {
                    out.put(entry.getKey(), entry.getValue().asLong(0));
                }
            });
        }
        return out;
    }

    private ObjectNode orObject(JsonNode left, JsonNode right) {
        ObjectNode out = object(left);
        if (right != null && right.isObject()) {
            right.fields().forEachRemaining(entry -> out.put(entry.getKey(), out.path(entry.getKey()).asBoolean(false) || entry.getValue().asBoolean(false)));
        }
        return out;
    }

    private void copyText(ObjectNode out, JsonNode local, String... fields) {
        if (local == null) {
            return;
        }
        for (String field : fields) {
            String value = local.path(field).asText("");
            if (!value.isBlank()) {
                out.put(field, value);
            }
        }
    }

    private void maxNumber(ObjectNode out, JsonNode local, String field, String note, List<String> notes) {
        long server = out.path(field).asLong(0);
        long value = local == null ? 0 : local.path(field).asLong(0);
        if (value > server) {
            out.put(field, value);
            if (note != null) {
                notes.add(note);
            }
        }
    }

    private ObjectNode object(JsonNode node) {
        return node != null && node.isObject() ? (ObjectNode) node.deepCopy() : mapper.createObjectNode();
    }

    private ArrayNode array(JsonNode node) {
        return node != null && node.isArray() ? (ArrayNode) node : mapper.createArrayNode();
    }

    public record MergeResult(ObjectNode node, List<String> notes) {
    }
}
