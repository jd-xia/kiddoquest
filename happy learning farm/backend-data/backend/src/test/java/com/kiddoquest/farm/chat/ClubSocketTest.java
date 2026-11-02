package com.kiddoquest.farm.chat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.club.ClubService;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.ClubMemberRepository;
import com.kiddoquest.farm.repo.ClubRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.kiddoquest.farm.service.SyncService;
import com.kiddoquest.farm.web.FarmDtos.SyncRequest;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class ClubSocketTest {

    @LocalServerPort
    int port;

    @Autowired
    ChatTickets tickets;
    @Autowired
    ClubService clubs;
    @Autowired
    SyncService sync;
    @Autowired
    ObjectMapper json;
    @Autowired
    ChildProfileRepository children;
    @Autowired
    GameSnapshotRepository snapshots;
    @Autowired
    SyncReceiptRepository receipts;
    @Autowired
    ClubRepository clubRows;
    @Autowired
    ClubMemberRepository memberRows;

    final List<WebSocketSession> open = new ArrayList<>();

    @BeforeEach
    void clean() {
        memberRows.deleteAll();
        clubRows.deleteAll();
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
    }

    @AfterEach
    void close() throws Exception {
        for (WebSocketSession session : open) {
            if (session.isOpen()) {
                session.close();
            }
        }
    }

    @Test
    void clubMatesSeeEachOtherWalkAndSeeFarmChanges() throws Exception {
        String mia = save("owner-a", "P0000011", "Mia");
        String jay = save("owner-b", "P0000012", "Jay");
        String lu = save("owner-c", "P0000013", "Lu");   // not in the club
        String clubId = clubs.create("owner-a", mia, "Moon Farm").club().id();
        clubs.join("owner-b", jay, clubId);

        List<String> miaIn = Collections.synchronizedList(new ArrayList<>());
        List<String> jayIn = Collections.synchronizedList(new ArrayList<>());
        List<String> luIn = Collections.synchronizedList(new ArrayList<>());
        WebSocketSession miaWs = join("owner-a", mia, miaIn, "P0000011");
        join("owner-b", jay, jayIn, "P0000012");
        join("owner-c", lu, luIn, "P0000013");

        miaWs.sendMessage(new TextMessage("{\"type\":\"move\",\"x\":3.256,\"z\":-1.5,\"ry\":1.2,\"area\":\"P0000011\",\"walk\":true}"));
        String moved = waitFor(jayIn, "club-move");
        assertTrue(moved.contains("\"username\":\"P0000011\""));
        assertTrue(moved.contains("\"name\":\"Mia\""));
        assertTrue(moved.contains("\"area\":\"P0000011\""));
        assertTrue(moved.contains("\"x\":3.26"));

        ObjectNode player = json.createObjectNode();
        player.put("name", "Mia");
        player.putObject("farm").putObject("fish").put("pond", 1);
        sync.sync("owner-a", null, mia, new SyncRequest("club-sync-0001", 0L, "keep_local", player, null));
        assertTrue(waitFor(jayIn, "club-farm").contains("\"username\":\"P0000011\""));

        clubs.leave("owner-b", jay);
        waitFor(miaIn, "\"type\":\"club\"");
        miaIn.clear();
        jayIn.clear();
        miaWs.sendMessage(new TextMessage("{\"type\":\"move\",\"x\":1,\"z\":1,\"ry\":0}"));
        Thread.sleep(600);
        synchronized (jayIn) {
            assertFalse(jayIn.stream().anyMatch(raw -> raw.contains("club-move")), "a child who left stops seeing moves");
        }
        synchronized (luIn) {
            assertFalse(luIn.stream().anyMatch(raw -> raw.contains("club-move") || raw.contains("club-farm")),
                    "a child outside the club never sees it");
        }
    }

    private WebSocketSession join(String owner, String childId, List<String> inbox, String code) throws Exception {
        WebSocketSession session = new StandardWebSocketClient().execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession s, TextMessage message) {
                inbox.add(message.getPayload());
            }
        }, "ws://127.0.0.1:" + port + "/api/v1/ws?ticket=" + tickets.issue(owner)).get(8, TimeUnit.SECONDS);
        open.add(session);
        session.sendMessage(new TextMessage("{\"type\":\"join\",\"childId\":\"" + childId + "\"}"));
        assertTrue(waitFor(inbox, "joined").contains(code));
        return session;
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
