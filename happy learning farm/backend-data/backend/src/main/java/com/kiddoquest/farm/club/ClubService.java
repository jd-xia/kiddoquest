package com.kiddoquest.farm.club;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.chat.OnlineKids;
import com.kiddoquest.farm.club.ClubEvents.ClubChanged;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.Club;
import com.kiddoquest.farm.domain.ClubMember;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.ClubMemberRepository;
import com.kiddoquest.farm.repo.ClubRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.web.ClubDtos.ClubInfo;
import com.kiddoquest.farm.web.ClubDtos.ClubMate;
import com.kiddoquest.farm.web.ClubDtos.MyClub;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

/**
 * Clubs: children who share one farm map. Each member keeps their own saved farm; the club only says who walks
 * together and where each member's fields are drawn. Only the owner's own sync can change a farm, so a club mate
 * can look at another member's fields and animals but never change them.
 */
@Service
public class ClubService {

    public static final int MAX_MEMBERS = 4;

    private final ClubRepository clubs;
    private final ClubMemberRepository members;
    private final ChildProfileRepository children;
    private final GameSnapshotRepository snapshots;
    private final ObjectProvider<OnlineKids> online;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;
    private final Clock clock;

    public ClubService(ClubRepository clubs, ClubMemberRepository members, ChildProfileRepository children,
            GameSnapshotRepository snapshots, ObjectProvider<OnlineKids> online, ApplicationEventPublisher events,
            ObjectMapper mapper, Clock clock) {
        this.clubs = clubs;
        this.members = members;
        this.children = children;
        this.snapshots = snapshots;
        this.online = online;
        this.events = events;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** "  Sunny   Farm " → "Sunny Farm". Letters (any language), numbers, spaces, - _ ' only; 3 to 20 long. */
    static String cleanName(String raw) {
        String name = raw == null ? "" : raw.replaceAll("\\p{Cntrl}", "").trim().replaceAll("\\s+", " ");
        if (name.length() < 3 || name.length() > 20 || !name.matches("[\\p{L}\\p{N} _'-]+")) {
            throw new SyncRejectedException("Use 3 to 20 letters or numbers for the club name.");
        }
        return name;
    }

    static String key(String name) {
        return name.toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public MyClub mine(String ownerId, String childId) {
        ChildProfile child = requireMine(ownerId, childId);
        return members.findById(child.getId())
                .flatMap(member -> clubs.findById(member.getClubId()))
                .map(club -> view(club, child.getId()))
                .orElseGet(() -> new MyClub(null, List.of()));
    }

    @Transactional(readOnly = true)
    public List<ClubInfo> search(String query) {
        String text = query == null ? "" : query.replaceAll("\\p{Cntrl}", "").trim().replaceAll("\\s+", " ");
        String pattern = "%" + key(text).replace("\\", "").replace("%", "").replace("_", "") + "%";
        return clubs.search(pattern, PageRequest.of(0, 10)).stream()
                .map(club -> new ClubInfo(club.getId(), club.getName(), (int) members.countByClubId(club.getId()), MAX_MEMBERS))
                .toList();
    }

    @Transactional
    public MyClub create(String ownerId, String childId, String rawName) {
        ChildProfile child = requireMine(ownerId, childId);
        String name = cleanName(rawName);
        if (members.existsById(child.getId())) {
            throw new SyncRejectedException("Leave your club before you make a new one.");
        }
        if (clubs.existsByNameKey(key(name))) {
            throw new SyncRejectedException("The club name " + name + " is taken. Try another name.");
        }
        Instant now = clock.instant();
        Club club = new Club();
        club.setId(UUID.randomUUID().toString());
        club.setName(name);
        club.setNameKey(key(name));
        club.setCreatedBy(child.getId());
        club.setCreatedAt(now);
        clubs.saveAndFlush(club);
        members.saveAndFlush(member(club.getId(), child.getId(), 0, now));
        events.publishEvent(new ClubChanged(club.getId(), List.of(child.getUsername())));
        return view(club, child.getId());
    }

    @Transactional
    public MyClub join(String ownerId, String childId, String clubId) {
        ChildProfile child = requireMine(ownerId, childId);
        Club club = clubs.findById(clubId == null ? "" : clubId).orElseThrow(NotFoundException::new);
        ClubMember already = members.findById(child.getId()).orElse(null);
        if (already != null) {
            if (already.getClubId().equals(club.getId())) {
                return view(club, child.getId());
            }
            throw new SyncRejectedException("Leave your club before you join another one.");
        }
        List<ClubMember> current = members.findByClubIdOrderBySlotAsc(club.getId());
        if (current.size() >= MAX_MEMBERS) {
            throw new SyncRejectedException("That club is full. A club has up to " + MAX_MEMBERS + " farmers.");
        }
        Set<Integer> taken = new HashSet<>();
        current.forEach(member -> taken.add(member.getSlot()));
        int slot = 0;
        while (taken.contains(slot)) {
            slot++;
        }
        members.saveAndFlush(member(club.getId(), child.getId(), slot, clock.instant()));
        events.publishEvent(new ClubChanged(club.getId(), usernames(club.getId())));
        return view(club, child.getId());
    }

    @Transactional
    public void leave(String ownerId, String childId) {
        ChildProfile child = requireMine(ownerId, childId);
        ClubMember member = members.findById(child.getId()).orElse(null);
        if (member == null) {
            return;
        }
        String clubId = member.getClubId();
        List<String> told = new ArrayList<>(usernames(clubId));
        members.delete(member);
        members.flush();
        if (members.countByClubId(clubId) == 0) {
            clubs.deleteById(clubId);
        }
        events.publishEvent(new ClubChanged(clubId, told));
    }

    /** The club a child (by player code) is in, or null. The chat socket uses it to pass moves to club mates. */
    @Transactional(readOnly = true)
    public String clubOf(String username) {
        if (username == null) {
            return null;
        }
        return children.findByUsername(username)
                .flatMap(child -> members.findById(child.getId()))
                .map(ClubMember::getClubId)
                .orElse(null);
    }

    /** Whether a child is in a club; after a save, only then do club mates need to hear about it. */
    @Transactional(readOnly = true)
    public boolean inClub(String childId) {
        return childId != null && members.existsById(childId);
    }

    private List<String> usernames(String clubId) {
        List<String> out = new ArrayList<>();
        for (ClubMember member : members.findByClubIdOrderBySlotAsc(clubId)) {
            children.findById(member.getChildId()).map(ChildProfile::getUsername).ifPresent(out::add);
        }
        return out;
    }

    private MyClub view(Club club, String meId) {
        OnlineKids live = online.getIfAvailable();
        List<ClubMate> mates = new ArrayList<>();
        List<ClubMember> list = members.findByClubIdOrderBySlotAsc(club.getId());
        for (ClubMember member : list) {
            ChildProfile child = children.findById(member.getChildId()).orElse(null);
            if (child == null) {
                continue;   // a closed child; their slot frees up when the club is next changed
            }
            boolean on = live != null && child.getUsername() != null && live.online(child.getUsername());
            mates.add(new ClubMate(child.getUsername(), child.getDisplayName(), child.getLook(), member.getSlot(),
                    child.getId().equals(meId), on, farmView(child.getId())));
        }
        return new MyClub(new ClubInfo(club.getId(), club.getName(), mates.size(), MAX_MEMBERS), mates);
    }

    /**
     * Only what the shared map draws: fields, animals, land, and how the child looks (shirt, hat and their own
     * Character Maker design). The saved farm was cleaned by GameStateValidator when it was stored.
     */
    private JsonNode farmView(String childId) {
        ObjectNode out = mapper.createObjectNode();
        JsonNode farm = mapper.createObjectNode();
        JsonNode design = null;
        var snap = snapshots.findById(childId).orElse(null);
        if (snap != null) {
            try {
                JsonNode player = mapper.readTree(snap.getPlayerJson());
                farm = player.path("farm");
                design = player.path("avatar3d").isObject() ? player.get("avatar3d") : null;
            } catch (Exception ignored) {
                // An unreadable farm shows as an empty field. The owner's own sync still works.
            }
        }
        if (design != null) {
            out.set("avatar3d", design);   // so club mates see the character this child designed, not a default one
        }
        out.put("unlocked", farm.path("unlocked").asInt(6));
        out.put("shirt", farm.path("shirt").asText("red"));
        out.put("hat", farm.path("hat").asText("straw"));
        out.set("plots", farm.path("plots").isArray() ? farm.get("plots") : mapper.createArrayNode());
        out.set("animals", farm.path("animals").isArray() ? farm.get("animals") : mapper.createArrayNode());
        out.set("lands", farm.path("lands").isArray() ? farm.get("lands") : mapper.createArrayNode());
        return out;
    }

    private static ClubMember member(String clubId, String childId, int slot, Instant now) {
        ClubMember member = new ClubMember();
        member.setClubId(clubId);
        member.setChildId(childId);
        member.setSlot(slot);
        member.setJoinedAt(now);
        return member;
    }

    private ChildProfile requireMine(String ownerId, String childId) {
        if (ownerId == null || ownerId.isBlank() || !ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        return children.findByIdAndOwnerUserId(childId, ownerId).orElseThrow(NotFoundException::new);
    }
}
