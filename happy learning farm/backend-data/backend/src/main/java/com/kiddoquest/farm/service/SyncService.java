package com.kiddoquest.farm.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.GameSnapshot;
import com.kiddoquest.farm.domain.SyncReceipt;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.sync.ContentHash;
import com.kiddoquest.farm.sync.GameStateMerger;
import com.kiddoquest.farm.sync.GameStateValidator;
import com.kiddoquest.farm.web.FarmDtos.SyncRequest;
import com.kiddoquest.farm.web.FarmDtos.SyncResponse;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Service
public class SyncService {

    private final ChildProfileRepository children;
    private final GameSnapshotRepository snapshots;
    private final SyncReceiptRepository receipts;
    private final GameStateValidator validator;
    private final GameStateMerger merger;
    private final ChildService childService;
    private final ObjectMapper mapper;
    private final Clock clock;

    public SyncService(ChildProfileRepository children, GameSnapshotRepository snapshots, SyncReceiptRepository receipts,
            GameStateValidator validator, GameStateMerger merger, ChildService childService, ObjectMapper mapper, Clock clock) {
        this.children = children;
        this.snapshots = snapshots;
        this.receipts = receipts;
        this.validator = validator;
        this.merger = merger;
        this.childService = childService;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public SyncResponse sync(String ownerId, String email, String childId, SyncRequest request) {
        childService.rememberEmail(ownerId, email);
        if (!ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        ChildProfile child = children.lockByIdAndOwner(childId, ownerId).orElseThrow(NotFoundException::new);
        var prior = receipts.findByChildIdAndIdempotencyKey(childId, request.idempotencyKey());
        if (prior.isPresent()) {
            try {
                return mapper.readValue(prior.get().getResponseJson(), SyncResponse.class);
            } catch (Exception ex) {
                throw new SyncRejectedException("Sync was interrupted. This device was not changed. Try again.");
            }
        }
        Instant now = clock.instant();
        GameSnapshot snap = snapshots.findById(childId).orElse(null);
        ObjectNode incoming = validator.sanitize(request.player(), child.getDisplayName(), child.getGrade(), child.getLook(), now);
        List<String> notes = new ArrayList<>();
        if ("merge".equals(request.policy()) && snap != null) {
            GameStateMerger.MergeResult merged = merger.merge(incoming, read(snap));
            incoming = validator.sanitize(merged.node(), child.getDisplayName(), child.getGrade(), child.getLook(), now);
            notes.addAll(merged.notes());
        }
        SyncResponse response = decide(child, snap, incoming, request, notes, now, email);
        if (!"conflict".equals(response.status())) {
            remember(childId, request.idempotencyKey(), response, now);
        }
        return response;
    }

    private SyncResponse decide(ChildProfile child, GameSnapshot snap, ObjectNode incoming, SyncRequest request,
            List<String> notes, Instant now, String email) {
        if ("keep_server".equals(request.policy())) {
            if (snap == null) {
                throw new SyncRejectedException("There is no saved farm yet. This device was not changed.");
            }
            return described("server", snap, child.getId(), read(snap), null, List.of());
        }
        String hash = ContentHash.sha256(mapper, incoming);
        if (snap != null && hash.equals(snap.getContentHash())) {
            return described("unchanged", snap, child.getId(), read(snap), null, List.of("Already the same."));
        }
        boolean force = "keep_local".equals(request.policy()) || "merge".equals(request.policy());
        if ("upload".equals(request.policy())) {
            long revision = snap == null ? 0 : snap.getRevision();
            boolean mismatch = (snap == null && request.baseRevision() != 0) || (snap != null && request.baseRevision() != revision);
            if (mismatch) {
                return described("conflict", snap, child.getId(), null, snap == null ? null : read(snap),
                        List.of("The saved farm is a different version. Nothing was overwritten."));
            }
        } else if (!force) {
            throw new SyncRejectedException("That sync choice is not available.");
        }
        long previous = snap == null ? 0 : read(snap).path("gems").asLong(0);
        validator.checkCoins(previous, snap == null ? null : snap.getUpdatedAt(), incoming.path("gems").asLong(0), request.policy(), now);
        GameSnapshot stored = childService.store(child, snap, incoming, now, email);
        return described("synced", stored, child.getId(), incoming, null, notes);
    }

    private SyncResponse described(String status, GameSnapshot snap, String childId, JsonNode player, JsonNode serverPlayer,
            List<String> notes) {
        long revision = snap == null ? 0 : snap.getRevision();
        Instant updatedAt = snap == null ? null : snap.getUpdatedAt();
        String updatedBy = snap == null ? null : snap.getUpdatedBy();
        String hash = snap == null ? null : snap.getContentHash();
        return new SyncResponse(status, revision, childId, player, serverPlayer, notes, updatedAt, updatedBy, hash);
    }

    private void remember(String childId, String key, SyncResponse response, Instant now) {
        try {
            SyncReceipt receipt = new SyncReceipt();
            receipt.setId(UUID.randomUUID().toString());
            receipt.setChildId(childId);
            receipt.setIdempotencyKey(key);
            receipt.setResponseJson(mapper.writeValueAsString(response));
            receipt.setCreatedAt(now);
            receipts.save(receipt);
        } catch (Exception ex) {
            throw new SyncRejectedException("Sync was interrupted. This device was not changed. Try again.");
        }
    }

    private JsonNode read(GameSnapshot snap) {
        try {
            return mapper.readTree(snap.getPlayerJson());
        } catch (Exception ex) {
            throw new SyncRejectedException("Farm data could not be read. This device was not changed.");
        }
    }
}
