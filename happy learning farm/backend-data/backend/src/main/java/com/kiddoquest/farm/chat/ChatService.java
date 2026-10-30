package com.kiddoquest.farm.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.FarmMessage;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.FarmMessageRepository;
import com.kiddoquest.farm.sync.ChildIds;
import com.kiddoquest.farm.web.FarmDtos.ChatLine;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Service
public class ChatService {

    public record Speaker(String childId, String username, String name, String look) {
    }

    public record Sent(ChatLine line, String room, String mine, String other) {
    }

    private final ChildProfileRepository children;
    private final FarmMessageRepository messages;
    private final Map<String, long[]> pace = new ConcurrentHashMap<>();

    public ChatService(ChildProfileRepository children, FarmMessageRepository messages) {
        this.children = children;
        this.messages = messages;
    }

    @Transactional(readOnly = true)
    public Speaker bind(String ownerId, String childId) {
        ChildProfile child = requireMine(ownerId, childId);
        return new Speaker(child.getId(), child.getUsername(), child.getDisplayName(), child.getLook());
    }

    @Transactional(readOnly = true)
    public List<ChatLine> history(String ownerId, String childId, String with) {
        Speaker mine = bind(ownerId, childId);
        String room = ChatText.room(mine.username(), with);
        if (room == null) {
            throw new SyncRejectedException("Choose the farm chat, or another saved child.");
        }
        if (!"hall".equals(room) && children.findByUsername(with).isEmpty()) {
            throw new NotFoundException();
        }
        List<FarmMessage> found = messages.latest(room, PageRequest.of(0, 40));
        List<ChatLine> lines = new ArrayList<>();
        for (int i = found.size() - 1; i >= 0; i--) {
            lines.add(line(found.get(i)));
        }
        return lines;
    }

    @Transactional
    public Sent send(String ownerId, String childId, String to, String text) {
        String body = ChatText.clean(text);
        if (body.isEmpty()) {
            throw new SyncRejectedException("Type a message first.");
        }
        if (body.length() > ChatText.MAX) {
            throw new SyncRejectedException("Keep the message under 180 characters.");
        }
        Ready ready = ready(ownerId, childId, to);
        FarmMessage message = blank(ready);
        message.setKind("text");
        message.setBody(body);
        messages.save(message);
        return sent(message, ready);
    }

    @Transactional
    public Sent sendVoice(String ownerId, String childId, String to, String voice, String mime) {
        String type = ChatVoice.mime(mime);
        String data = ChatVoice.stored(voice);
        if (type == null || data == null) {
            throw new SyncRejectedException("That voice message could not be sent.");
        }
        Ready ready = ready(ownerId, childId, to);
        FarmMessage message = blank(ready);
        message.setKind("voice");
        message.setBody("");
        message.setVoiceMime(type);
        message.setVoiceData(data);
        messages.save(message);
        return sent(message, ready);
    }

    private Ready ready(String ownerId, String childId, String to) {
        Speaker mine = bind(ownerId, childId);
        String room = ChatText.room(mine.username(), to);
        if (room == null) {
            throw new SyncRejectedException("Choose the farm chat, or another saved child.");
        }
        if (!"hall".equals(to) && children.findByUsername(to).isEmpty()) {
            throw new NotFoundException();
        }
        pace(mine.username());
        return new Ready(mine, room, to);
    }

    private static FarmMessage blank(Ready ready) {
        FarmMessage message = new FarmMessage();
        message.setId(UUID.randomUUID().toString());
        message.setRoom(ready.room());
        message.setFromUsername(ready.mine().username());
        message.setFromName(ready.mine().name());
        message.setFromLook(ready.mine().look() == null || ready.mine().look().isBlank() ? "girl" : ready.mine().look());
        message.setCreatedAt(Instant.now());
        return message;
    }

    private static Sent sent(FarmMessage message, Ready ready) {
        return new Sent(line(message), ready.room(), ready.mine().username(), "hall".equals(ready.to()) ? "hall" : ready.to());
    }

    private record Ready(Speaker mine, String room, String to) {
    }

    private void pace(String username) {
        long now = System.currentTimeMillis();
        long[] row = pace.compute(username, (key, value) -> value == null || now - value[0] > 60_000
                ? new long[] {now, 0, 0}
                : value);
        synchronized (row) {
            if (now - row[0] > 60_000) {
                row[0] = now;
                row[1] = 0;
            }
            if (now - row[2] < 800 || row[1] >= 20) {
                throw new SyncRejectedException("Wait a moment before the next message.");
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

    private static ChatLine line(FarmMessage message) {
        boolean voice = "voice".equals(message.getKind());
        return new ChatLine(message.getId(), message.getFromUsername(), message.getFromName(), message.getFromLook(),
                voice ? "" : message.getBody(), message.getCreatedAt(), voice ? "voice" : "text",
                voice ? message.getVoiceData() : null, voice ? message.getVoiceMime() : null);
    }
}
