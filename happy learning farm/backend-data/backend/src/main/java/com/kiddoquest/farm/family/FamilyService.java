package com.kiddoquest.farm.family;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.ParentPin;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.ParentPinRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.web.FarmDtos.Family;
import com.kiddoquest.farm.web.FarmDtos.KidTime;
import com.kiddoquest.farm.web.FarmDtos.KidTimeWrite;
import com.kiddoquest.farm.web.FarmDtos.PlayTime;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.PinException;

/**
 * One Google account is one family. The parent marks one farm as the main account (主账号): it has no time
 * limit and only the parent PIN opens it. The parent sets each child's minutes a day and can add time today.
 * Pages send a heartbeat while a farm is on screen; the server keeps the count, so a reload or a second
 * device does not reset it.
 */
@Service
public class FamilyService {

    /** A heartbeat counts at most this many seconds, however long the page says it was. */
    static final int BEAT_MAX = 60;
    static final int PIN_TRIES = 5;
    static final long PIN_WAIT_SECONDS = 60;

    private final ChildProfileRepository children;
    private final ParentPinRepository pins;
    private final Clock clock;
    private final BCryptPasswordEncoder hasher = new BCryptPasswordEncoder();
    /** Wrong PINs in a row per account, and when trying is allowed again. */
    private final Map<String, long[]> misses = new ConcurrentHashMap<>();

    public FamilyService(ChildProfileRepository children, ParentPinRepository pins, Clock clock) {
        this.children = children;
        this.pins = pins;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Family family(String ownerId, String day) {
        List<KidTime> kids = children.findByOwnerUserIdOrderByCreatedAtAsc(ownerId).stream().map(c -> kid(c, day)).toList();
        return new Family(pins.existsById(ownerId), kids);
    }

    @Transactional
    public Family setPin(String ownerId, String oldPin, String pin, String day) {
        ParentPin row = pins.findById(ownerId).orElse(null);
        if (row != null) {
            check(ownerId, oldPin);
        } else {
            row = new ParentPin();
            row.setOwnerUserId(ownerId);
        }
        row.setPinHash(hasher.encode(pin));
        row.setUpdatedAt(clock.instant());
        pins.save(row);
        return family(ownerId, day);
    }

    public void unlock(String ownerId, String pin) {
        check(ownerId, pin);
    }

    @Transactional
    public Family writeKid(String ownerId, String childId, KidTimeWrite request) {
        check(ownerId, request.pin());
        ChildProfile child = lock(ownerId, childId);
        roll(child, request.day());
        if (request.main() != null) {
            if (request.main()) {
                for (ChildProfile other : children.findByOwnerUserIdOrderByCreatedAtAsc(ownerId)) {
                    if (other.isMain() && !other.getId().equals(child.getId())) {
                        other.setMain(false);
                        children.save(other);
                    }
                }
            }
            child.setMain(request.main());
        }
        if (request.dailyMinutes() != null) {
            child.setDailyMinutes(request.dailyMinutes() == 0 ? null : request.dailyMinutes());
        }
        if (request.addMinutes() != null) {
            child.setBonusMinutes(Math.max(0, Math.min(600, child.getBonusMinutes() + request.addMinutes())));
        }
        children.save(child);
        return family(ownerId, request.day());
    }

    /** Counts play time for the farm on screen and says how much is left today. */
    @Transactional
    public PlayTime beat(String ownerId, String childId, String day, int seconds, String screen) {
        ChildProfile child = lock(ownerId, childId);
        if (screen != null && screen.equals(child.getScreenId())) {
            child.setScreenSeen(clock.instant());   // this screen is still in use
        }
        roll(child, day);
        child.setPlaySeconds(child.getPlaySeconds() + Math.max(0, Math.min(BEAT_MAX, seconds)));
        children.save(child);
        return time(child, day);
    }

    static PlayTime time(ChildProfile child, String day) {
        Integer limit = child.isMain() ? null : child.getDailyMinutes();
        int used = day.equals(child.getPlayDay()) ? child.getPlaySeconds() : 0;
        int bonus = day.equals(child.getPlayDay()) ? child.getBonusMinutes() : 0;
        Integer left = limit == null ? null : Math.max(0, (limit + bonus) * 60 - used);
        return new PlayTime(day, child.isMain(), limit, bonus, used, left);
    }

    private static KidTime kid(ChildProfile c, String day) {
        PlayTime t = time(c, day);
        return new KidTime(c.getId(), c.getUsername(), c.getDisplayName(), c.getLook(), c.isMain(), c.getDailyMinutes(),
                t.bonusMinutes(), t.usedSeconds());
    }

    /** A new day starts the count again and drops yesterday's extra minutes. */
    private static void roll(ChildProfile child, String day) {
        if (!day.equals(child.getPlayDay())) {
            child.setPlayDay(day);
            child.setPlaySeconds(0);
            child.setBonusMinutes(0);
        }
    }

    private ChildProfile lock(String ownerId, String childId) {
        if (!ChildIds.valid(childId)) {
            throw new NotFoundException();
        }
        return children.lockByIdAndOwner(childId, ownerId).orElseThrow(NotFoundException::new);
    }

    private void check(String ownerId, String pin) {
        long now = clock.instant().getEpochSecond();
        long[] miss = misses.get(ownerId);
        if (miss != null && miss[1] > now) {
            throw new PinException("pin_wait", "Too many wrong PINs. Wait a minute, then try again.");
        }
        ParentPin row = pins.findById(ownerId).orElse(null);
        if (row == null) {
            throw new PinException("pin_missing", "Set a parent PIN first.");
        }
        if (pin == null || !hasher.matches(pin, row.getPinHash())) {
            long[] next = misses.merge(ownerId, new long[] {1, 0}, (a, b) -> new long[] {a[0] + 1, 0});
            if (next[0] >= PIN_TRIES) {
                misses.put(ownerId, new long[] {0, now + PIN_WAIT_SECONDS});
            }
            throw new PinException("wrong_pin", "That PIN is not right.");
        }
        misses.remove(ownerId);
    }
}
