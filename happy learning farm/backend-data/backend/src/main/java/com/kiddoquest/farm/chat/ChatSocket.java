package com.kiddoquest.farm.chat;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kiddoquest.farm.chat.ChatService.Sent;
import com.kiddoquest.farm.chat.ChatService.Speaker;
import com.kiddoquest.farm.club.ClubEvents.ClubChanged;
import com.kiddoquest.farm.club.ClubEvents.FarmSaved;
import com.kiddoquest.farm.club.ClubService;
import com.kiddoquest.farm.web.FarmDtos.ChatLine;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Component
public class ChatSocket extends TextWebSocketHandler implements OnlineKids {

    private final ChatService chat;
    private final ClubService clubs;
    private final ObjectMapper mapper;
    private final Map<String, Set<WebSocketSession>> byUser = new ConcurrentHashMap<>();
    /** The club of each child on line (player code → club id). Moves go only to the same club. */
    private final Map<String, String> clubOfUser = new ConcurrentHashMap<>();

    public ChatSocket(ChatService chat, ClubService clubs, ObjectMapper mapper) {
        this.chat = chat;
        this.clubs = clubs;
        this.mapper = mapper;
    }

    @Override
    public boolean online(String username) {
        Set<WebSocketSession> sessions = byUser.get(username);
        return sessions != null && sessions.stream().anyMatch(WebSocketSession::isOpen);
    }

    @Override
    public Set<String> names() {
        return Set.copyOf(byUser.keySet());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(768 * 1024);
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode body;
        try {
            body = mapper.readTree(message.getPayload());
        } catch (Exception ex) {
            send(session, Map.of("type", "error", "message", "That message could not be read."));
            return;
        }
        String type = body.path("type").asText("");
        try {
            if ("ping".equals(type)) {
                return;
            }
            if ("join".equals(type)) {
                join(session, body.path("childId").asText(""));
                return;
            }
            if ("move".equals(type)) {
                move(session, body);
                return;
            }
            if ("send".equals(type)) {
                String voice = body.path("voice").asText("");
                if (!voice.isBlank()) {
                    speakVoice(session, body.path("to").asText(""), voice, body.path("mime").asText(""));
                } else {
                    speak(session, body.path("to").asText(""), body.path("text").asText(""));
                }
            }
        } catch (NotFoundException ex) {
            send(session, Map.of("type", "error", "message", "That farm was not found."));
        } catch (SyncRejectedException ex) {
            send(session, Map.of("type", "error", "message", ex.getMessage()));
        } catch (Exception ex) {
            send(session, Map.of("type", "error", "message", "That voice message could not be sent."));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        drop(session, true);
    }

    private void join(WebSocketSession session, String childId) throws IOException {
        String owner = String.valueOf(session.getAttributes().get("owner"));
        drop(session, true);
        Speaker speaker = chat.bind(owner, childId);
        session.getAttributes().put("childId", speaker.childId());
        session.getAttributes().put("username", speaker.username());
        session.getAttributes().put("name", speaker.name());
        session.getAttributes().put("look", speaker.look() == null ? "" : speaker.look());
        rememberClub(speaker.username());
        byUser.computeIfAbsent(speaker.username(), key -> ConcurrentHashMap.newKeySet()).add(session);
        send(session, Map.of("type", "joined", "username", speaker.username(), "name", speaker.name()));
        presence(speaker.username(), true);
    }

    private void speak(WebSocketSession session, String to, String text) throws IOException {
        String owner = String.valueOf(session.getAttributes().get("owner"));
        String childId = (String) session.getAttributes().get("childId");
        if (childId == null) {
            send(session, Map.of("type", "error", "message", "Open a saved child before chatting."));
            return;
        }
        Sent sent = chat.send(owner, childId, to, text);
        fan(sent);
    }

    private void speakVoice(WebSocketSession session, String to, String voice, String mime) throws IOException {
        String owner = String.valueOf(session.getAttributes().get("owner"));
        String childId = (String) session.getAttributes().get("childId");
        if (childId == null) {
            send(session, Map.of("type", "error", "message", "Open a saved child before chatting."));
            return;
        }
        Sent sent = chat.sendVoice(owner, childId, to, voice, mime);
        fan(sent);
    }

    public void broadcast(Sent sent) {
        fan(sent);
    }

    /**
     * Where a child walks on the shared club farm. area is the player code whose fields the child stands in (x and
     * z are then measured from that farm's own field), or empty for the paths and buildings everyone shares.
     */
    private void move(WebSocketSession session, JsonNode body) {
        String username = (String) session.getAttributes().get("username");
        String club = username == null ? null : clubOfUser.get(username);
        if (club == null) {
            return;
        }
        long now = System.currentTimeMillis();
        if (session.getAttributes().get("movedAt") instanceof Long at && now - at < 60) {
            return;   // at most about 16 moves a second from one screen
        }
        session.getAttributes().put("movedAt", now);
        String area = body.path("area").asText("");
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "club-move");
        payload.put("username", username);
        payload.put("name", session.getAttributes().get("name"));
        payload.put("look", session.getAttributes().get("look"));
        payload.put("x", coordinate(body.path("x")));
        payload.put("z", coordinate(body.path("z")));
        payload.put("ry", coordinate(body.path("ry")));
        payload.put("area", area.matches("P\\d{7}") ? area : "");
        payload.put("walk", body.path("walk").asBoolean(false));
        toClub(club, username, payload);
    }

    private static double coordinate(JsonNode node) {
        double value = node.isNumber() ? node.asDouble() : 0;
        if (!Double.isFinite(value)) {
            return 0;
        }
        return Math.round(Math.max(-500, Math.min(500, value)) * 100) / 100.0;
    }

    private void rememberClub(String username) {
        String club = clubs.clubOf(username);
        if (club == null) {
            clubOfUser.remove(username);
        } else {
            clubOfUser.put(username, club);
        }
    }

    /** Sends to every child on line in that club except one (the sender). */
    private void toClub(String club, String except, Map<String, Object> payload) {
        for (String other : Set.copyOf(byUser.keySet())) {
            if (other.equals(except) || !club.equals(clubOfUser.get(other))) {
                continue;
            }
            Set<WebSocketSession> sessions = byUser.get(other);
            if (sessions != null) {
                for (WebSocketSession session : Set.copyOf(sessions)) {
                    send(session, payload);
                }
            }
        }
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void clubChanged(ClubChanged event) {
        Map<String, Object> payload = Map.of("type", "club", "clubId", event.clubId());
        for (String username : event.usernames()) {
            Set<WebSocketSession> sessions = byUser.get(username);
            if (sessions == null) {
                continue;
            }
            rememberClub(username);
            for (WebSocketSession session : Set.copyOf(sessions)) {
                send(session, payload);
            }
        }
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void farmSaved(FarmSaved event) {
        String club = event.username() == null ? null : clubOfUser.get(event.username());
        if (club != null) {
            toClub(club, event.username(), Map.of("type", "club-farm", "username", event.username()));
        }
    }

    private void fan(Sent sent) {
        if ("hall".equals(sent.other())) {
            for (String username : Set.copyOf(byUser.keySet())) {
                deliver(username, sent.line(), "hall");
            }
            return;
        }
        deliver(sent.mine(), sent.line(), sent.other());
        deliver(sent.other(), sent.line(), sent.mine());
    }

    private void deliver(String username, ChatLine line, String room) {
        Set<WebSocketSession> sessions = byUser.get(username);
        if (sessions == null) {
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "chat");
        payload.put("id", line.id());
        payload.put("from", line.from());
        payload.put("name", line.name());
        payload.put("look", line.look());
        payload.put("text", line.text());
        payload.put("kind", line.kind() == null ? "text" : line.kind());
        if (line.voice() != null) {
            payload.put("mime", line.mime() == null ? "" : line.mime());
        }
        payload.put("at", line.at() == null ? "" : line.at().toString());
        payload.put("room", room);
        for (WebSocketSession session : Set.copyOf(sessions)) {
            send(session, payload);
        }
    }

    private void drop(WebSocketSession session, boolean tell) {
        String username = (String) session.getAttributes().get("username");
        if (username == null) {
            return;
        }
        Set<WebSocketSession> sessions = byUser.get(username);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                byUser.remove(username, sessions);
            }
        }
        session.getAttributes().remove("username");
        session.getAttributes().remove("childId");
        if (!online(username)) {
            clubOfUser.remove(username);
        }
        if (tell && !online(username)) {
            presence(username, false);
        }
    }

    private void presence(String username, boolean on) {
        Map<String, Object> payload = Map.of("type", "presence", "username", username, "online", on);
        for (String name : Set.copyOf(byUser.keySet())) {
            Set<WebSocketSession> sessions = byUser.get(name);
            if (sessions == null) {
                continue;
            }
            for (WebSocketSession session : Set.copyOf(sessions)) {
                send(session, payload);
            }
        }
    }

    private void send(WebSocketSession session, Map<String, Object> payload) {
        if (session == null || !session.isOpen()) {
            return;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            }
        } catch (Exception ignored) {
            // A closed chat window can drop a live message. History still has it.
        }
    }
}
