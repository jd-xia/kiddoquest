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
import org.springframework.test.web.servlet.ResultActions;

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

/** One screen per farm: the newest screen to open a farm takes it, and an older screen can no longer save. */
@SpringBootTest
@AutoConfigureMockMvc
class ScreenFlowTest {

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
    void theNewestScreenTakesTheFarm() throws Exception {
        String parent = bearer(UUID.randomUUID().toString());
        String child = create(parent, "Jayden");
        String laptop = "screen-laptop-0001", tablet = "screen-tablet-0002";

        mvc.perform(get("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + parent))
                .andExpect(status().isOk()).andExpect(jsonPath("$.screen").isEmpty());
        claim(parent, child, laptop).andExpect(status().isOk()).andExpect(jsonPath("$.screen").value(laptop));
        sync(parent, child, laptop, 20).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("synced"));

        // the tablet opens Jayden's farm: the laptop has lost it
        claim(parent, child, tablet).andExpect(status().isOk());
        mvc.perform(get("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + parent))
                .andExpect(status().isOk()).andExpect(jsonPath("$.screen").value(tablet))
                .andExpect(jsonPath("$.device").value("Safari on iPad"))
                .andExpect(jsonPath("$.email").value("parent@example.test"))
                .andExpect(jsonPath("$.seen").isNotEmpty())
                .andExpect(jsonPath("$.ip").value("121.6.217.23"));
        sync(parent, child, laptop, 30).andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("screen_taken"));
        sync(parent, child, tablet, 40).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("synced"));

        // the laptop takes it back with Play here instead
        claim(parent, child, laptop).andExpect(status().isOk());
        sync(parent, child, tablet, 50).andExpect(status().isConflict());
        sync(parent, child, laptop, 60).andExpect(status().isOk());

        // a page from before screens existed still syncs
        sync(parent, child, null, 70).andExpect(status().isOk());

        // the laptop switches to another child: only the screen that has the farm can let it go
        mvc.perform(delete("/api/v1/children/" + child + "/screen").param("screen", tablet).header("Authorization", "Bearer " + parent))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + parent))
                .andExpect(jsonPath("$.screen").value(laptop));
        mvc.perform(delete("/api/v1/children/" + child + "/screen").param("screen", laptop).header("Authorization", "Bearer " + parent))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + parent))
                .andExpect(jsonPath("$.screen").isEmpty()).andExpect(jsonPath("$.seen").isEmpty());
    }

    @Test
    void onlyTheOwnerCanTakeAFarm() throws Exception {
        String parent = bearer(UUID.randomUUID().toString());
        String stranger = bearer(UUID.randomUUID().toString());
        String child = create(parent, "Mia");
        claim(stranger, child, "screen-stranger-01").andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + stranger))
                .andExpect(status().isNotFound());
        claim(parent, child, "bad id!").andExpect(status().isBadRequest());
    }

    private ResultActions claim(String token, String child, String screen) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("screen", screen);
        body.put("device", screen.contains("tablet") ? "Safari on iPad" : "Chrome on Windows");
        return mvc.perform(post("/api/v1/children/" + child + "/screen").header("Authorization", "Bearer " + token)
                .header("X-Forwarded-For", "121.6.217.23, 172.18.0.1")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private ResultActions sync(String token, String child, String screen, int gems) throws Exception {
        JsonNode state = body(mvc.perform(get("/api/v1/children/" + child).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn());
        ObjectNode player = (ObjectNode) state.path("player").deepCopy();
        player.put("gems", gems);
        ObjectNode body = json.createObjectNode();
        body.put("idempotencyKey", UUID.randomUUID().toString());
        body.put("baseRevision", state.path("revision").asLong());
        body.put("policy", "upload");
        body.set("player", player);
        if (screen != null) {
            body.put("screen", screen);
        }
        return mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private String create(String token, String name) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("displayName", name);
        body.put("grade", "p1");
        body.put("look", "boy");
        MvcResult result = mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return body(result).path("id").asText();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private static String bearer(String userId) throws Exception {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer("http://localhost:8080")
                .subject(userId)
                .audience("kiddoquest")
                .claim("email", "parent@example.test")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .jwtID(UUID.randomUUID().toString())
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
