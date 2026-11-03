package com.kiddoquest.farm.gallery;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.SharedArt;
import com.kiddoquest.farm.domain.SharedModel;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.SharedArtRepository;
import com.kiddoquest.farm.repo.SharedModelRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.web.FarmDtos.GalleryItem;
import com.kiddoquest.farm.web.FarmDtos.GalleryShare;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

/**
 * Everyone's gallery: children share their own Art Studio pictures and 3D models, and any player
 * can pick one for the same item. Sharing needs a signed-in child; looking and picking do not.
 */
@Service
public class GalleryService {

    /** How many designs one child can have shared at the same time. */
    public static final int PER_CHILD = 60;
    private static final int LIST = 60;

    private final ChildProfileRepository children;
    private final SharedArtRepository arts;
    private final SharedModelRepository models;
    private final Map<String, long[]> pace = new ConcurrentHashMap<>();

    public GalleryService(ChildProfileRepository children, SharedArtRepository arts, SharedModelRepository models) {
        this.children = children;
        this.arts = arts;
        this.models = models;
    }

    @Transactional(readOnly = true)
    public List<GalleryItem> list(String rawKey, String viewer) {
        String key = GalleryFiles.key(rawKey);
        if (key == null) {
            throw new SyncRejectedException("Choose a picture to look for.");
        }
        return arts.latest(key, PageRequest.of(0, LIST)).stream().map(a -> item(a, viewer)).toList();
    }

    @Transactional
    public GalleryItem share(String ownerId, GalleryShare body) {
        ChildProfile child = requireMine(ownerId, body.as());
        String key = GalleryFiles.key(body.key());
        if (key == null) {
            throw new SyncRejectedException("That picture cannot be shared.");
        }
        String picture = GalleryFiles.picture(body.picture());
        if (picture == null) {
            throw new SyncRejectedException("That picture could not be shared.");
        }
        byte[] model = null;
        if (body.model() != null && !body.model().isBlank()) {
            if (!GalleryFiles.canModel(key)) {
                throw new SyncRejectedException("Only animals, decorations, buildings and fish can be 3D models.");
            }
            model = GalleryFiles.model(body.model());
            if (model == null) {
                throw new SyncRejectedException("That 3D model could not be shared. It must be a .glb under 10 MB.");
            }
        }
        if (arts.countByChildId(child.getId()) >= PER_CHILD) {
            throw new SyncRejectedException("You have shared " + PER_CHILD + " designs. Delete one first.");
        }
        pace(ownerId);
        SharedArt art = new SharedArt();
        art.setId(UUID.randomUUID().toString());
        art.setItemKey(key);
        art.setOwnerUserId(ownerId);
        art.setChildId(child.getId());
        art.setFromUsername(child.getUsername());
        art.setFromName(child.getDisplayName());
        art.setStyle(model != null ? "3d" : GalleryFiles.style(body.style()));
        art.setPicture(picture);
        art.setModelBytes(model == null ? 0 : model.length);
        art.setModelName(model == null ? null : GalleryFiles.modelName(body.modelName()));
        art.setCreatedAt(Instant.now());
        arts.save(art);
        if (model != null) {
            SharedModel stored = new SharedModel();
            stored.setId(art.getId());
            stored.setData(model);
            models.save(stored);
        }
        return item(art, ownerId);
    }

    @Transactional(readOnly = true)
    public byte[] model(String id) {
        return models.findById(clean(id)).map(SharedModel::getData).orElseThrow(NotFoundException::new);
    }

    @Transactional
    public void delete(String ownerId, String id) {
        SharedArt art = arts.findById(clean(id)).orElseThrow(NotFoundException::new);
        if (!art.getOwnerUserId().equals(ownerId)) {
            throw new NotFoundException();
        }
        if (models.existsById(art.getId())) {
            models.deleteById(art.getId());
        }
        arts.delete(art);
    }

    /** When a child farm is deleted, its shared designs go too. */
    @Transactional
    public void clearChild(String childId) {
        for (SharedArt art : arts.findByChildId(childId)) {
            if (models.existsById(art.getId())) {
                models.deleteById(art.getId());
            }
            arts.delete(art);
        }
    }

    private static GalleryItem item(SharedArt a, String viewer) {
        return new GalleryItem(a.getId(), a.getItemKey(), a.getFromUsername(), a.getFromName(), a.getPicture(), a.getStyle(),
                a.getModelBytes() > 0, a.getModelBytes(), a.getModelName(), a.getCreatedAt(),
                viewer != null && viewer.equals(a.getOwnerUserId()));
    }

    /** At most one share every 5 seconds and 30 an hour for one account. */
    private void pace(String ownerId) {
        long now = System.currentTimeMillis();
        long[] row = pace.computeIfAbsent(ownerId, k -> new long[] {now, 0, 0});
        synchronized (row) {
            if (now - row[0] > 3_600_000) {
                row[0] = now;
                row[1] = 0;
            }
            if (now - row[2] < 5_000 || row[1] >= 30) {
                throw new SyncRejectedException("Wait a moment before sharing again.");
            }
            row[1]++;
            row[2] = now;
        }
    }

    private ChildProfile requireMine(String ownerId, String childId) {
        if (ownerId == null || ownerId.isBlank() || !ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        return children.findByIdAndOwnerUserId(childId, ownerId).orElseThrow(NotFoundException::new);
    }

    private static String clean(String id) {
        if (id == null || !id.matches("[0-9a-f-]{36}")) {
            throw new NotFoundException();
        }
        return id;
    }
}
