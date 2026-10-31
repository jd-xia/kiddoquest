package com.kiddoquest.farm.chat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.FarmMessageRepository;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class ChatSocketTest {

    @LocalServerPort
    int port;

    @Autowired
    ChatTickets tickets;
    @Autowired
    ChildProfileRepository children;
    @Autowired
    FarmMessageRepository messages;

    WebSocketSession left;
    WebSocketSession right;
    final List<String> leftIn = Collections.synchronizedList(new ArrayList<>());
    final List<String> rightIn = Collections.synchronizedList(new ArrayList<>());

    @BeforeEach
    void clean() {
        messages.deleteAll();
        children.deleteAll();
    }

    @AfterEach
    void close() throws Exception {
        if (left != null && left.isOpen()) {
            left.close();
        }
        if (right != null && right.isOpen()) {
            right.close();
        }
    }

    @Test
    void hallAndDirectMessagesArriveLive() throws Exception {
        String mia = save("user-a", "P0000001", "Mia");
        String jay = save("user-b", "P0000002", "Jay");
        left = open(tickets.issue("user-a"), leftIn);
        right = open(tickets.issue("user-b"), rightIn);
        left.sendMessage(new TextMessage("{\"type\":\"join\",\"childId\":\"" + mia + "\"}"));
        right.sendMessage(new TextMessage("{\"type\":\"join\",\"childId\":\"" + jay + "\"}"));
        assertTrue(waitFor(leftIn, "joined").contains("P0000001"));
        assertTrue(waitFor(rightIn, "joined").contains("P0000002"));

        left.sendMessage(new TextMessage("{\"type\":\"send\",\"to\":\"hall\",\"text\":\"Hello farm\"}"));
        assertTrue(waitFor(leftIn, "chat").contains("Hello farm"));
        assertTrue(waitFor(rightIn, "chat").contains("Hello farm"));

        Thread.sleep(900);
        rightIn.clear();
        left.sendMessage(new TextMessage("{\"type\":\"send\",\"to\":\"P0000002\",\"text\":\"Just us\"}"));
        assertTrue(waitFor(leftIn, "Just us").contains("P0000002"));
        String direct = waitFor(rightIn, "Just us");
        assertTrue(direct.contains("\"room\":\"P0000001\""));
        assertTrue(messages.count() >= 2);

        Thread.sleep(900);
        rightIn.clear();
        byte[] clip = new byte[5000];
        Arrays.fill(clip, (byte) 7);
        String voice = Base64.getEncoder().encodeToString(clip);
        left.sendMessage(new TextMessage(
                "{\"type\":\"send\",\"to\":\"P0000002\",\"voice\":\"" + voice + "\",\"mime\":\"audio/webm\"}"));
        String heard = waitFor(rightIn, "\"kind\":\"voice\"");
        assertTrue(heard.contains("audio/webm"));
        // The socket only announces the clip; the page fetches the audio from chat history.
        assertFalse(heard.contains(voice.substring(0, 40)));
        assertTrue(messages.findAll().stream()
                .anyMatch(m -> "voice".equals(m.getKind()) && voice.equals(m.getVoiceData())
                        && heard.contains("\"id\":\"" + m.getId() + "\"")));
    }

    private WebSocketSession open(String ticket, List<String> inbox) throws Exception {
        StandardWebSocketClient client = new StandardWebSocketClient();
        return client.execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                inbox.add(message.getPayload());
            }
        }, "ws://127.0.0.1:" + port + "/api/v1/ws?ticket=" + ticket).get(8, TimeUnit.SECONDS);
    }

    private String save(String owner, String username, String name) {
        ChildProfile child = new ChildProfile();
        child.setId(UUID.randomUUID().toString());
        child.setOwnerUserId(owner);
        child.setUsername(username);
        child.setDisplayName(name);
        child.setGrade("p1");
        child.setLook("girl");
        child.setCreatedAt(Instant.now());
        child.setUpdatedAt(Instant.now());
        return children.save(child).getId();
    }

    private static String waitFor(List<String> inbox, String needle) throws InterruptedException {
        long end = System.currentTimeMillis() + 8000;
        while (System.currentTimeMillis() < end) {
            synchronized (inbox) {
                for (String raw : inbox) {
                    if (raw.contains(needle)) {
                        return raw;
                    }
                }
            }
            Thread.sleep(40);
        }
        throw new AssertionError(inbox.toString());
    }
}
