package com.kiddoquest.farm.chat;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kiddoquest.farm.chat.ChatService.Sent;
import com.kiddoquest.farm.chat.ChatService.Speaker;
import com.kiddoquest.farm.web.FarmDtos.ChatLine;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@Component
public class ChatSocket extends TextWebSocketHandler implements OnlineKids {

    private final ChatService chat;
    private final ObjectMapper mapper;
    private final Map<String, Set<WebSocketSession>> byUser = new ConcurrentHashMap<>();

    public ChatSocket(ChatService chat, ObjectMapper mapper) {
        this.chat = chat;
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
        session.setTextMessageSizeLimit(4096);
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
            if ("send".equals(type)) {
                speak(session, body.path("to").asText(""), body.path("text").asText(""));
            }
        } catch (NotFoundException ex) {
            send(session, Map.of("type", "error", "message", "That farm was not found."));
        } catch (SyncRejectedException ex) {
            send(session, Map.of("type", "error", "message", ex.getMessage()));
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
