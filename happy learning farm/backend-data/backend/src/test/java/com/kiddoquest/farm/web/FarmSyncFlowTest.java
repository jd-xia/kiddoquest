package com.kiddoquest.farm.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
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
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@SpringBootTest
@AutoConfigureMockMvc
class FarmSyncFlowTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-32";

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper json;
    @Autowired
    ChildProfileRepository children;
    @Autowired
    GameSnapshotRepository snapshots;
    @Autowired
    SyncReceiptRepository receipts;

    @BeforeEach
    void clean() {
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
    }

    @Test
    void syncIsManualConflictAwareAndIsolated() throws Exception {
        mvc.perform(get("/api/v1/children")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());

        String mia = bearer("user-a");
        String other = bearer("user-b");
        String child = create(mia, player(10, "flowers"));
        mvc.perform(get("/api/v1/children/" + child).header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());

        MvcResult uploaded = sync(mia, child, "upload-key-0001", 1, "upload", player(20, "flowers"));
        JsonNode up = body(uploaded);
        org.junit.jupiter.api.Assertions.assertEquals("synced", up.path("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals(2, up.path("revision").asLong());

        JsonNode conflict = body(sync(mia, child, "upload-key-0002", 1, "upload", player(25, "flowers")));
        org.junit.jupiter.api.Assertions.assertEquals("conflict", conflict.path("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals(20, conflict.path("serverPlayer").path("gems").asLong());
        org.junit.jupiter.api.Assertions.assertEquals(20, savedGems(mia, child));

        JsonNode same = body(sync(mia, child, "upload-key-0003", 2, "upload", player(20, "flowers")));
        org.junit.jupiter.api.Assertions.assertEquals("unchanged", same.path("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals(2, same.path("revision").asLong());

        JsonNode replay = body(sync(mia, child, "upload-key-0001", 2, "upload", player(80, "flowers")));
        org.junit.jupiter.api.Assertions.assertEquals(2, replay.path("revision").asLong());
        org.junit.jupiter.api.Assertions.assertEquals(20, replay.path("player").path("gems").asLong());
        org.junit.jupiter.api.Assertions.assertEquals(20, savedGems(mia, child));

        mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON)
                .content(syncBody("upload-key-0004", 2, "upload", player(1000, "flowers"))))
                .andExpect(status().isUnprocessableEntity());
        org.junit.jupiter.api.Assertions.assertEquals(20, savedGems(mia, child));

        JsonNode merged = body(sync(mia, child, "merge-key-00001", 0, "merge", player(40, "pond")));
        org.junit.jupiter.api.Assertions.assertEquals("synced", merged.path("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals(40, merged.path("player").path("gems").asLong());
        String decor = merged.path("player").path("farm").path("decor").toString();
        org.junit.jupiter.api.Assertions.assertTrue(decor.contains("flowers") && decor.contains("pond"));

        mvc.perform(get("/api/v1/children").header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON)
                .content(syncBody("other-key-00001", 1, "upload", player(1, "flowers"))))
                .andExpect(status().isNotFound());
        org.junit.jupiter.api.Assertions.assertEquals(40, savedGems(mia, child));

        mvc.perform(delete("/api/v1/children/" + child).header("Authorization", "Bearer " + mia))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/children/" + child).header("Authorization", "Bearer " + mia))
                .andExpect(status().isNotFound());
    }

    @Test
    void oneAccountCanKeepTwoKidsAndNotAThird() throws Exception {
        String token = bearer("user-a");
        for (int i = 0; i < 2; i++) {
            create(token, null);
        }
        mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"Extra\",\"grade\":\"p1\",\"look\":\"girl\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/children").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(2));
    }

    private String create(String token, ObjectNode player) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("displayName", "Mia");
        body.put("grade", "p1");
        body.put("look", "girl");
        if (player != null) {
            body.set("player", player);
        }
        MvcResult result = mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return body(result).path("id").asText();
    }

    private MvcResult sync(String token, String child, String key, long base, String policy, ObjectNode player) throws Exception {
        return mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(syncBody(key, base, policy, player)))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String syncBody(String key, long base, String policy, ObjectNode player) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("idempotencyKey", key);
        body.put("baseRevision", base);
        body.put("policy", policy);
        body.set("player", player);
        return json.writeValueAsString(body);
    }

    private ObjectNode player(int gems, String decor) {
        ObjectNode player = json.createObjectNode();
        player.put("id", "p1");
        player.put("name", "Mia");
        player.put("grade", "p1");
        player.put("look", "girl");
        player.put("avatar", "chick");
        player.putArray("owned").add("chick");
        player.put("gems", gems);
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
        farm.putArray("decor").add(decor);
        farm.put("shirt", "red");
        farm.put("hat", "straw");
        farm.putArray("owned").add("shirt:red").add("hat:straw");
        farm.put("xp", 0);
        farm.putObject("barn");
        return player;
    }

    private long savedGems(String token, String child) throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/children/" + child).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        return body(result).path("player").path("gems").asLong();
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
