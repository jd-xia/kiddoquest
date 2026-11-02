package com.kiddoquest.farm.brain;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.domain.BrainAttempt;
import com.kiddoquest.farm.domain.BrainProfile;
import com.kiddoquest.farm.domain.BrainProgress;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.family.FamilyService;
import com.kiddoquest.farm.repo.BrainAttemptRepository;
import com.kiddoquest.farm.repo.BrainProfileRepository;
import com.kiddoquest.farm.repo.BrainProgressRepository;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.web.BrainDtos.BrainState;
import com.kiddoquest.farm.web.BrainDtos.LevelProgress;
import com.kiddoquest.farm.web.BrainDtos.ResultSaved;
import com.kiddoquest.farm.web.BrainDtos.ResultWrite;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

/**
 * Brain Boost: each child has their own profile (which topics and levels they play, in what order, with the
 * grown-up's own names, rules and questions) and their own progress. The topic and level modules themselves are
 * files in the frontend (brain-boost/topics); the server keeps only each child's choices and results, always under
 * the child's own account. Only a grown-up with the parent PIN saves a draft or publishes it.
 *
 * <p>Progress is kept per level module ("calculation-tricks/level-01", or "custom/c-…" for a grown-up's own quiz),
 * not per place in the profile, so moving, renaming or removing a level never loses its stars.
 */
@Service
public class BrainBoostService {

    static final int MAX_TOPICS = 30;
    static final int MAX_LEVELS = 60;
    static final int MAX_QUESTIONS = 60;
    static final int MAX_BYTES = 400_000;
    static final String ITEM = "[a-z0-9][a-z0-9-]{0,39}";

    private final ChildProfileRepository children;
    private final BrainProfileRepository profiles;
    private final BrainProgressRepository progress;
    private final BrainAttemptRepository attempts;
    private final FamilyService family;
    private final ObjectMapper mapper;
    private final Clock clock;

    public BrainBoostService(ChildProfileRepository children, BrainProfileRepository profiles,
            BrainProgressRepository progress, BrainAttemptRepository attempts, FamilyService family, ObjectMapper mapper,
            Clock clock) {
        this.children = children;
        this.profiles = profiles;
        this.progress = progress;
        this.attempts = attempts;
        this.family = family;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public BrainState state(String ownerId, String childId) {
        ChildProfile child = requireMine(ownerId, childId);
        return state(child.getId());
    }

    /** Publishes: the child sees this profile from their next visit. The draft, if any, is done with. */
    @Transactional
    public BrainState writeProfile(String ownerId, String childId, String pin, JsonNode raw) {
        ChildProfile child = requireMine(ownerId, childId);
        family.unlock(ownerId, pin);
        BrainProfile row = profiles.findById(child.getId()).orElseGet(BrainProfile::new);
        row.setChildId(child.getId());
        row.setProfileJson(raw == null || raw.isNull() ? null : text(clean(raw)));
        row.setUpdatedAt(clock.instant());
        row.setDraftJson(null);
        row.setDraftUpdatedAt(null);
        keep(row);
        return state(child.getId());
    }

    /** Saves a grown-up's unfinished work. The child keeps playing the published profile. */
    @Transactional
    public BrainState writeDraft(String ownerId, String childId, String pin, JsonNode raw) {
        ChildProfile child = requireMine(ownerId, childId);
        family.unlock(ownerId, pin);
        BrainProfile row = profiles.findById(child.getId()).orElseGet(BrainProfile::new);
        row.setChildId(child.getId());
        boolean drop = raw == null || raw.isNull();
        row.setDraftJson(drop ? null : text(clean(raw)));
        row.setDraftUpdatedAt(drop ? null : clock.instant());
        keep(row);
        return state(child.getId());
    }

    @Transactional
    public ResultSaved record(String ownerId, String childId, ResultWrite result) {
        ChildProfile child = requireMine(ownerId, childId);
        BrainAttempt before = attempts.findById(result.attemptId()).orElse(null);
        if (before != null) {
            if (!before.getChildId().equals(child.getId())) {
                throw new SyncRejectedException("That result id is already used. Send the result again.");
            }
            BrainProgress row = progress.findByChildIdAndTopicIdAndLevelId(child.getId(), before.getTopicId(), before.getLevelId())
                    .orElseThrow(NotFoundException::new);
            return new ResultSaved(view(row), true);
        }
        boolean cleared = result.cleared();
        int total = result.total();
        int correct = Math.min(result.correct(), total);
        int stars = cleared ? Math.max(1, result.stars()) : 0;   // a cleared level always has at least one star
        Instant now = clock.instant();

        BrainAttempt attempt = new BrainAttempt();
        attempt.setId(result.attemptId());
        attempt.setChildId(child.getId());
        attempt.setTopicId(result.topic());
        attempt.setLevelId(result.level());
        attempt.setCleared(cleared);
        attempt.setStars(stars);
        attempt.setCorrect(correct);
        attempt.setTotal(total);
        attempt.setSecs(result.secs());
        attempt.setPlayedAt(now);
        attempts.save(attempt);

        BrainProgress row = progress.findByChildIdAndTopicIdAndLevelId(child.getId(), result.topic(), result.level())
                .orElseGet(() -> {
                    BrainProgress fresh = new BrainProgress();
                    fresh.setId(UUID.randomUUID().toString());
                    fresh.setChildId(child.getId());
                    fresh.setTopicId(result.topic());
                    fresh.setLevelId(result.level());
                    fresh.setFirstAt(now);
                    return fresh;
                });
        row.setPlays(row.getPlays() + 1);
        if (cleared) {
            row.setClears(row.getClears() + 1);
        }
        row.setStars(Math.max(row.getStars(), stars));
        if (total > 0 && (row.getBestTotal() == 0 || (double) correct / total > (double) row.getBestCorrect() / row.getBestTotal())) {
            row.setBestCorrect(correct);
            row.setBestTotal(total);
        }
        row.setLastAt(now);
        progress.saveAndFlush(row);
        return new ResultSaved(view(row), false);
    }

    /** Closing a child removes its Brain Boost profile and results too. */
    @Transactional
    public void clearChild(String childId) {
        attempts.deleteByChildId(childId);
        progress.deleteByChildId(childId);
        profiles.findById(childId).ifPresent(profiles::delete);
    }

    private void keep(BrainProfile row) {
        if (row.getProfileJson() == null && row.getDraftJson() == null) {
            if (profiles.existsById(row.getChildId())) {
                profiles.deleteById(row.getChildId());
                profiles.flush();
            }
            return;
        }
        profiles.saveAndFlush(row);
    }

    private BrainState state(String childId) {
        BrainProfile row = profiles.findById(childId).orElse(null);
        List<LevelProgress> rows = progress.findByChildIdOrderByTopicIdAscLevelIdAsc(childId).stream().map(BrainBoostService::view).toList();
        if (row == null) {
            return new BrainState(null, null, null, null, rows);
        }
        return new BrainState(read(row.getProfileJson()), row.getProfileJson() == null ? null : row.getUpdatedAt(),
                read(row.getDraftJson()), row.getDraftUpdatedAt(), rows);
    }

    private JsonNode read(String json) {
        if (json == null) {
            return null;
        }
        try {
            return mapper.readTree(json);
        } catch (Exception ignored) {
            return null;   // an unreadable profile falls back to the default for the child's grade
        }
    }

    private String text(JsonNode node) {
        try {
            return mapper.writeValueAsString(node);
        } catch (Exception ex) {
            throw new SyncRejectedException("The Brain Boost profile could not be read.");
        }
    }

    private static LevelProgress view(BrainProgress row) {
        return new LevelProgress(row.getTopicId(), row.getLevelId(), row.getStars(), row.getBestCorrect(), row.getBestTotal(),
                row.getPlays(), row.getClears(), row.getFirstAt(), row.getLastAt());
    }

    /**
     * Keeps only what a profile is:
     * <pre>
     * {"topics":[{"id","custom","enabled","name","description","icon","color",
     *   "levels":[{"from":"topic/level","custom","enabled","name","description","difficulty",
     *     "rules":{"questions","hearts","seconds","pass","shuffle"},
     *     "questions":[{"text","options":[…],"answer","hint","difficulty"}]}]}]}
     * </pre>
     * A level module is in one place only, so its progress always has one home. Older profiles that name a level
     * by "id" alone mean the level of that topic.
     */
    ObjectNode clean(JsonNode raw) {
        try {
            if (mapper.writeValueAsBytes(raw).length > MAX_BYTES) {
                throw new SyncRejectedException("This Brain Boost profile is too big. Use fewer questions.");
            }
        } catch (SyncRejectedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new SyncRejectedException("The Brain Boost profile could not be read.");
        }
        if (!raw.isObject() || !raw.path("topics").isArray()) {
            throw new SyncRejectedException("A Brain Boost profile needs a list of topics.");
        }
        if (raw.path("topics").size() > MAX_TOPICS) {
            throw new SyncRejectedException("A Brain Boost profile has up to " + MAX_TOPICS + " topics.");
        }
        ObjectNode out = mapper.createObjectNode();
        ArrayNode topics = out.putArray("topics");
        Set<String> seenTopics = new HashSet<>();
        Set<String> seenLevels = new HashSet<>();
        for (JsonNode t : raw.get("topics")) {
            String id = t.path("id").asText("");
            if (!id.matches(ITEM) || !seenTopics.add(id)) {
                throw new SyncRejectedException("Each topic needs its own id, like calculation-tricks.");
            }
            ObjectNode topic = topics.addObject();
            topic.put("id", id);
            if (t.path("custom").asBoolean(false)) {
                topic.put("custom", true);
            }
            topic.put("enabled", t.path("enabled").asBoolean(true));
            words(topic, "name", t, 40);
            words(topic, "description", t, 160);
            words(topic, "icon", t, 8);
            String color = t.path("color").asText("");
            if (color.matches("#[0-9A-Fa-f]{6}")) {
                topic.put("color", color);
            }
            ArrayNode levels = topic.putArray("levels");
            JsonNode rawLevels = t.path("levels");
            if (rawLevels.size() > MAX_LEVELS) {
                throw new SyncRejectedException("A topic has up to " + MAX_LEVELS + " levels.");
            }
            for (JsonNode l : rawLevels) {
                String from = l.path("from").asText("");
                if (from.isEmpty() && l.path("id").isTextual()) {
                    from = id + "/" + l.path("id").asText();
                }
                String[] parts = from.split("/", -1);
                if (parts.length != 2 || !parts[0].matches(ITEM) || !parts[1].matches(ITEM)) {
                    throw new SyncRejectedException("Each level in " + id + " needs to say where it comes from, like calculation-tricks/level-01.");
                }
                boolean custom = "custom".equals(parts[0]);
                if (!seenLevels.add(from)) {
                    throw new SyncRejectedException("A level can be in one place only: " + from + " is used twice.");
                }
                ObjectNode level = levels.addObject();
                level.put("from", from);
                if (custom) {
                    level.put("custom", true);
                }
                level.put("enabled", l.path("enabled").asBoolean(true));
                words(level, "name", l, 40);
                words(level, "description", l, 160);
                if (l.path("difficulty").isNumber()) {
                    level.put("difficulty", Math.max(1, Math.min(5, l.path("difficulty").asInt())));
                }
                rules(level, l.path("rules"));
                if (l.has("questions") || custom) {
                    questions(level, l.path("questions"), from);
                }
            }
        }
        return out;
    }

    /** The rules a level page reads; anything else is dropped. */
    private void rules(ObjectNode level, JsonNode raw) {
        if (!raw.isObject()) {
            return;
        }
        ObjectNode rules = mapper.createObjectNode();
        number(rules, raw, "questions", 1, 50);
        number(rules, raw, "hearts", 1, 5);
        number(rules, raw, "seconds", 10, 1800);
        number(rules, raw, "pass", 0, 50);
        if (raw.path("shuffle").isBoolean()) {
            rules.put("shuffle", raw.path("shuffle").asBoolean());
        }
        if (!rules.isEmpty()) {
            level.set("rules", rules);
        }
    }

    private static void number(ObjectNode out, JsonNode raw, String field, int min, int max) {
        if (raw.path(field).isNumber()) {
            out.put(field, Math.max(min, Math.min(max, raw.path(field).asInt())));
        }
    }

    /** A grown-up's own questions: a question, two to six choices (or none, to type the answer), the answer, a hint. */
    private void questions(ObjectNode level, JsonNode raw, String from) {
        ArrayNode out = level.putArray("questions");
        if (!raw.isArray()) {
            return;
        }
        if (raw.size() > MAX_QUESTIONS) {
            throw new SyncRejectedException("A level has up to " + MAX_QUESTIONS + " questions.");
        }
        int n = 0;
        for (JsonNode q : raw) {
            n++;
            String text = clip(q.path("text").asText(""), 240);
            String answer = clip(q.path("answer").asText(""), 80);
            if (text.isEmpty() || answer.isEmpty()) {
                throw new SyncRejectedException("Question " + n + " in " + from + " needs a question and an answer.");
            }
            ObjectNode item = out.addObject();
            item.put("text", text);
            JsonNode options = q.path("options");
            if (options.isArray() && options.size() > 0) {
                ArrayNode kept = item.putArray("options");
                Set<String> seen = new HashSet<>();
                for (JsonNode o : options) {
                    String choice = clip(o.asText(""), 80);
                    if (!choice.isEmpty() && seen.add(choice)) {
                        kept.add(choice);
                    }
                }
                if (kept.size() < 2 || kept.size() > 6) {
                    throw new SyncRejectedException("Question " + n + " in " + from + " needs 2 to 6 different choices.");
                }
                if (!seen.contains(answer)) {
                    throw new SyncRejectedException("The answer to question " + n + " in " + from + " must be one of its choices.");
                }
            }
            item.put("answer", answer);
            String hint = clip(q.path("hint").asText(""), 240);
            if (!hint.isEmpty()) {
                item.put("hint", hint);
            }
            if (q.path("difficulty").isNumber()) {
                item.put("difficulty", Math.max(1, Math.min(5, q.path("difficulty").asInt())));
            }
        }
    }

    private static String clip(String raw, int max) {
        String text = raw.replaceAll("\\p{Cntrl}", " ").trim().replaceAll("\\s+", " ");
        return text.length() > max ? text.substring(0, max).trim() : text;
    }

    /** A grown-up's own title or description, if they wrote one; otherwise the module's own text is shown. */
    private static void words(ObjectNode out, String field, JsonNode raw, int max) {
        String text = clip(raw.path(field).asText(""), max);
        if (!text.isEmpty()) {
            out.put(field, text);
        }
    }

    private ChildProfile requireMine(String ownerId, String childId) {
        if (ownerId == null || ownerId.isBlank() || !ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        return children.findByIdAndOwnerUserId(childId, ownerId).orElseThrow(NotFoundException::new);
    }
}
