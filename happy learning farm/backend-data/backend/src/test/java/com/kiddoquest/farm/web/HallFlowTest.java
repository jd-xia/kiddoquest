package com.kiddoquest.farm.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.chat.ChatService;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.FarmMessageRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@SpringBootTest
@AutoConfigureMockMvc
class HallFlowTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-32";

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper json;
    @Autowired
    ChatService chat;
    @Autowired
    ChildProfileRepository children;
    @Autowired
    GameSnapshotRepository snapshots;
    @Autowired
    SyncReceiptRepository receipts;
    @Autowired
    FarmMessageRepository messages;

    @BeforeEach
    void clean() {
        messages.deleteAll();
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
    }

    @Test
    void healthAndBoardArePublicAndChatStaysPrivate() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true));
        mvc.perform(get("/api/v1/board")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/chat/history").param("as", UUID.randomUUID().toString()).param("with", "hall"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/chat/ticket")).andExpect(status().isUnauthorized());

        String mia = bearer("user-a");
        String child = create(mia);
        mvc.perform(get("/api/v1/board"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Mia"))
                .andExpect(jsonPath("$[0].rank").doesNotExist())
                .andExpect(jsonPath("$[0].level").value(1))
                .andExpect(jsonPath("$[0].coins").value(1000))
                .andExpect(jsonPath("$[0].cleared").value(1))
                .andExpect(jsonPath("$[0].questions").value(5))
                .andExpect(jsonPath("$[0].firstTry").value(4))
                .andExpect(jsonPath("$[0].accuracy").value(80))
                .andExpect(jsonPath("$[0].score").value(80))
                .andExpect(jsonPath("$[0].stars").value(1))
                .andExpect(jsonPath("$[0].online").value(false))
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].username").value(org.hamcrest.Matchers.matchesPattern("P\\d{7}")));

        String username = children.findById(child).orElseThrow().getUsername();
        mvc.perform(post("/api/v1/chat/ticket").header("Authorization", "Bearer " + mia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket").isNotEmpty());
        mvc.perform(get("/api/v1/chat/history").param("as", child).param("with", "hall")
                .header("Authorization", "Bearer " + mia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        chat.send("user-a", child, "hall", "  Hello   farm  ");
        JsonNode history = body(mvc.perform(get("/api/v1/chat/history").param("as", child).param("with", "hall")
                .header("Authorization", "Bearer " + mia)).andExpect(status().isOk()).andReturn());
        assertEquals(1, history.size());
        assertEquals("Hello farm", history.get(0).path("text").asText());
        assertEquals("text", history.get(0).path("kind").asText());
        assertEquals(username, history.get(0).path("from").asText());

        String clip = Base64.getEncoder().encodeToString(new byte[800]);
        Thread.sleep(900);
        chat.sendVoice("user-a", child, "hall", clip, "audio/webm;codecs=opus");
        JsonNode voiced = body(mvc.perform(get("/api/v1/chat/history").param("as", child).param("with", "hall")
                .header("Authorization", "Bearer " + mia)).andExpect(status().isOk()).andReturn());
        assertEquals(2, voiced.size());
        assertEquals("voice", voiced.get(1).path("kind").asText());
        assertEquals("audio/webm", voiced.get(1).path("mime").asText());
        assertEquals(clip, voiced.get(1).path("voice").asText());
        assertEquals("", voiced.get(1).path("text").asText());
        assertThrows(SyncRejectedException.class, () -> chat.sendVoice("user-a", child, "hall", clip, "text/plain"));
        assertThrows(NotFoundException.class, () -> chat.history("user-b", child, "hall"));
        assertThrows(NotFoundException.class, () -> chat.send("user-a", child, "P0099999", "hi"));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/children/" + child)
                .header("Authorization", "Bearer " + mia)).andExpect(status().isNoContent());
        assertEquals(0, messages.count());
    }

    private String create(String token) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("displayName", "Mia");
        body.put("grade", "p1");
        body.put("look", "girl");
        body.set("player", player());
        MvcResult result = mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        String username = body(result).path("username").asText();
        assertTrue(username.matches("P\\d{7}"));
        return body(result).path("id").asText();
    }

    private ObjectNode player() {
        ObjectNode player = json.createObjectNode();
        player.put("id", "p1");
        player.put("name", "Mia");
        player.put("grade", "p1");
        player.put("look", "girl");
        player.put("avatar", "chick");
        player.putArray("owned").add("chick");
        player.put("gems", 1000);
        player.putObject("seen");
        ObjectNode level = player.putObject("lv").putObject("c1-1");
        level.put("stars", 1);
        level.put("plays", 1);
        level.put("clears", 1);
        level.put("qs", 5);
        level.put("first", 4);
        level.put("last", 10);
        player.putArray("sessions");
        player.put("time", 10);
        ObjectNode farm = player.putObject("farm");
        farm.putArray("plots");
        farm.put("unlocked", 6);
        farm.putArray("animals");
        farm.putArray("decor");
        farm.put("shirt", "red");
        farm.put("hat", "straw");
        farm.putArray("owned").add("shirt:red").add("hat:straw");
        farm.put("xp", 0);
        farm.putObject("barn");
        return player;
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(String userId) throws Exception {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer("http://localhost:8080")
                .subject(userId)
                .audience("kiddoquest")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .jwtID(UUID.randomUUID().toString())
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
