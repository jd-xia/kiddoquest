package com.kiddoquest.farm.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.GameSnapshot;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.sync.ContentHash;
import com.kiddoquest.farm.sync.GameStateValidator;
import com.kiddoquest.farm.web.FarmDtos.ChildPatch;
import com.kiddoquest.farm.web.FarmDtos.ChildState;
import com.kiddoquest.farm.web.FarmDtos.ChildSummary;
import com.kiddoquest.farm.web.FarmDtos.ChildWrite;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Service
public class ChildService {

    static final int MAX_CHILDREN = 5;

    private final ChildProfileRepository children;
    private final GameSnapshotRepository snapshots;
    private final SyncReceiptRepository receipts;
    private final GameStateValidator validator;
    private final ObjectMapper mapper;
    private final Clock clock;

    public ChildService(ChildProfileRepository children, GameSnapshotRepository snapshots, SyncReceiptRepository receipts,
            GameStateValidator validator, ObjectMapper mapper, Clock clock) {
        this.children = children;
        this.snapshots = snapshots;
        this.receipts = receipts;
        this.validator = validator;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ChildSummary> list(String ownerId) {
        return children.findByOwnerUserIdOrderByCreatedAtAsc(ownerId).stream().map(child -> {
            GameSnapshot snap = snapshots.findById(child.getId()).orElse(null);
            return new ChildSummary(child.getId(), child.getUsername(), child.getEmail(), child.getDisplayName(),
                    child.getGrade(), child.getLook(), snap == null ? 0 : snap.getRevision(), child.getUpdatedAt());
        }).toList();
    }

    @Transactional(readOnly = true)
    public ChildState get(String ownerId, String childId) {
        ChildProfile child = require(ownerId, childId);
        return state(child, snapshots.findById(child.getId()).orElse(null));
    }

    @Transactional
    public ChildState create(String ownerId, String email, ChildWrite request) {
        if (children.countByOwnerUserId(ownerId) >= MAX_CHILDREN) {
            throw new SyncRejectedException("This account already has " + MAX_CHILDREN + " kids.");
        }
        Instant now = clock.instant();
        ChildProfile child = new ChildProfile();
        child.setId(UUID.randomUUID().toString());
        child.setOwnerUserId(ownerId);
        child.setEmail(cleanEmail(email));
        child.setUsername(nextUsername());
        child.setDisplayName(validator.cleanName(request.displayName(), "Farmer"));
        child.setGrade(validator.cleanGrade(request.grade(), "p3"));
        child.setLook(validator.cleanLook(request.look()));
        child.setCreatedAt(now);
        child.setUpdatedAt(now);
        children.save(child);

        JsonNode raw = request.player() == null || request.player().isNull() ? blank(child) : request.player();
        ObjectNode player = validator.sanitize(raw, child.getDisplayName(), child.getGrade(), child.getLook(), now);
        validator.checkCoins(0, null, player.path("gems").asLong(0), "keep_local", now);
        GameSnapshot snap = store(child, null, player, now);
        return state(child, snap);
    }

    @Transactional
    public ChildState patch(String ownerId, String childId, ChildPatch request) {
        ChildProfile child = children.lockByIdAndOwner(childId, ownerId).orElseThrow(NotFoundException::new);
        if (!ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        boolean changed = false;
        if (request.displayName() != null) {
            child.setDisplayName(validator.cleanName(request.displayName(), child.getDisplayName()));
            changed = true;
        }
        if (request.grade() != null) {
            child.setGrade(validator.cleanGrade(request.grade(), child.getGrade()));
            changed = true;
        }
        if (request.look() != null) {
            child.setLook(validator.cleanLook(request.look()));
            changed = true;
        }
        Instant now = clock.instant();
        child.setUpdatedAt(now);
        children.save(child);
        GameSnapshot snap = snapshots.findById(childId).orElse(null);
        if (changed && snap != null) {
            try {
                ObjectNode raw = (ObjectNode) mapper.readTree(snap.getPlayerJson());
                raw.put("name", child.getDisplayName());
                raw.put("grade", child.getGrade());
                raw.put("look", child.getLook());
                ObjectNode player = validator.sanitize(raw, child.getDisplayName(), child.getGrade(), child.getLook(), now);
                snap = store(child, snap, player, now);
            } catch (SyncRejectedException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new SyncRejectedException("Farm data could not be read. This device was not changed.");
            }
        }
        return state(child, snap);
    }

    @Transactional
    public void delete(String ownerId, String childId) {
        ChildProfile child = children.lockByIdAndOwner(childId, ownerId).orElseThrow(NotFoundException::new);
        receipts.deleteByChildId(child.getId());
        snapshots.deleteById(child.getId());
        children.delete(child);
    }

    @Transactional
    public GameSnapshot store(ChildProfile child, GameSnapshot snap, ObjectNode player, Instant now) {
        try {
            if (snap == null) {
                snap = new GameSnapshot();
                snap.setChildId(child.getId());
                snap.setRevision(1);
            } else {
                snap.setRevision(snap.getRevision() + 1);
            }
            if (child.getUsername() == null || child.getUsername().isBlank()) {
                child.setUsername(nextUsername());
            }
            snap.setPlayerJson(mapper.writeValueAsString(player));
            snap.setContentHash(ContentHash.sha256(mapper, player));
            snap.setUpdatedAt(now);
            child.setDisplayName(player.path("name").asText(child.getDisplayName()));
            child.setGrade(player.path("grade").asText(child.getGrade()));
            child.setLook(player.path("look").asText(child.getLook()));
            child.setUpdatedAt(now);
            children.save(child);
            return snapshots.save(snap);
        } catch (SyncRejectedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new SyncRejectedException("Farm data could not be saved. This device was not changed.");
        }
    }

    @Transactional
    public void rememberEmail(String ownerId, String email) {
        String cleaned = cleanEmail(email);
        if (cleaned == null || ownerId == null || ownerId.isBlank()) {
            return;
        }
        for (ChildProfile child : children.findByOwnerUserIdOrderByCreatedAtAsc(ownerId)) {
            if (!cleaned.equals(child.getEmail())) {
                child.setEmail(cleaned);
            }
        }
    }

    private String nextUsername() {
        int next = 1;
        for (ChildProfile child : children.findAll()) {
            String current = child.getUsername();
            if (current != null && current.matches("P\\d{7}")) {
                next = Math.max(next, Integer.parseInt(current.substring(1)) + 1);
            }
        }
        for (int i = 0; i < 30 && next <= 9_999_999; i++, next++) {
            String code = "P" + String.format("%07d", next);
            if (!children.existsByUsername(code)) {
                return code;
            }
        }
        throw new SyncRejectedException("A player number could not be chosen. This device was not changed.");
    }

    private static String cleanEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase();
        if (!trimmed.contains("@") || trimmed.length() > 320 || trimmed.indexOf(' ') >= 0) {
            return null;
        }
        return trimmed;
    }

    private ChildProfile require(String ownerId, String childId) {
        if (!ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        return children.findByIdAndOwnerUserId(childId, ownerId).orElseThrow(NotFoundException::new);
    }

    private ChildState state(ChildProfile child, GameSnapshot snap) {
        JsonNode player = null;
        long revision = 0;
        if (snap != null) {
            revision = snap.getRevision();
            try {
                player = mapper.readTree(snap.getPlayerJson());
            } catch (Exception ex) {
                throw new SyncRejectedException("Farm data could not be read. This device was not changed.");
            }
        }
        return new ChildState(child.getId(), child.getUsername(), child.getEmail(), child.getDisplayName(),
                child.getGrade(), child.getLook(), revision, child.getUpdatedAt(), player);
    }

    private ObjectNode blank(ChildProfile child) {
        ObjectNode player = mapper.createObjectNode();
        player.put("id", "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        player.put("name", child.getDisplayName());
        player.put("grade", child.getGrade());
        player.put("look", child.getLook());
        player.put("avatar", "chick");
        player.putArray("owned").add("chick");
        player.put("gems", 1000);
        player.putObject("seen");
        player.putObject("lv");
        player.putArray("sessions");
        player.put("time", 0);
        return player;
    }
}
