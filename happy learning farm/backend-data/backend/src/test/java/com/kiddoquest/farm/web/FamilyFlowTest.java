package com.kiddoquest.farm.web;

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
import com.kiddoquest.farm.repo.ParentPinRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/** The main account (主账号) has no limit; the parent PIN sets each child's minutes a day. */
@SpringBootTest
@AutoConfigureMockMvc
class FamilyFlowTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-32";
    private static final String DAY = "2026-10-31";

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
    @Autowired
    ParentPinRepository pins;

    @BeforeEach
    void clean() {
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
        pins.deleteAll();
    }

    @Test
    void parentSetsMinutesAndTheMainFarmHasNoLimit() throws Exception {
        String parent = bearer(UUID.randomUUID().toString());
        String mum = create(parent, "Mum");
        String jayden = create(parent, "Jayden");

        // no PIN yet: nothing can be changed
        mvc.perform(get("/api/v1/family").param("day", DAY).header("Authorization", "Bearer " + parent))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pinSet").value(false));
        write(parent, jayden, "1234", "{\"dailyMinutes\":30}").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("pin_missing"));

        send(parent, "/api/v1/family/pin", "{\"pin\":\"1234\"}").andExpect(status().isOk()).andExpect(jsonPath("$.pinSet").value(true));
        // changing the PIN needs the old one
        send(parent, "/api/v1/family/pin", "{\"pin\":\"5555\"}").andExpect(status().isForbidden());

        write(parent, mum, "1234", "{\"main\":true}").andExpect(status().isOk());
        write(parent, jayden, "1234", "{\"dailyMinutes\":30}").andExpect(status().isOk())
                .andExpect(jsonPath("$.kids[1].dailyMinutes").value(30))
                .andExpect(jsonPath("$.kids[0].main").value(true));
        write(parent, jayden, "0000", "{\"dailyMinutes\":600}").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("wrong_pin"));

        // Jayden plays: 30 minutes is 1800 seconds; a beat counts at most 60
        beat(parent, jayden, 60).andExpect(jsonPath("$.leftSeconds").value(1740));
        beat(parent, jayden, 600).andExpect(jsonPath("$.usedSeconds").value(120)).andExpect(jsonPath("$.leftSeconds").value(1680));
        for (int i = 0; i < 28; i++) {
            beat(parent, jayden, 60);
        }
        beat(parent, jayden, 30).andExpect(jsonPath("$.leftSeconds").value(0));

        // the parent adds 15 minutes for today
        write(parent, jayden, "1234", "{\"addMinutes\":15}").andExpect(status().isOk()).andExpect(jsonPath("$.kids[1].bonusMinutes").value(15));
        beat(parent, jayden, 0).andExpect(jsonPath("$.leftSeconds").value(870));
        // and takes 3 minutes away again; today never goes below 0 minutes
        write(parent, jayden, "1234", "{\"addMinutes\":-3}").andExpect(jsonPath("$.kids[1].bonusMinutes").value(12));
        beat(parent, jayden, 0).andExpect(jsonPath("$.leftSeconds").value(690));
        write(parent, jayden, "1234", "{\"addMinutes\":-100}").andExpect(jsonPath("$.kids[1].bonusMinutes").value(-30));
        beat(parent, jayden, 0).andExpect(jsonPath("$.leftSeconds").value(0));
        write(parent, jayden, "1234", "{\"addMinutes\":15}").andExpect(status().isOk());

        // a new day starts again without the extra minutes
        mvc.perform(post("/api/v1/children/" + jayden + "/play").header("Authorization", "Bearer " + parent)
                .contentType(MediaType.APPLICATION_JSON).content("{\"day\":\"2026-11-01\",\"seconds\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.leftSeconds").value(1800)).andExpect(jsonPath("$.bonusMinutes").value(0));

        // the main farm has no limit, even with minutes set
        write(parent, mum, "1234", "{\"dailyMinutes\":10}").andExpect(status().isOk());
        beat(parent, mum, 60).andExpect(jsonPath("$.main").value(true)).andExpect(jsonPath("$.leftSeconds").isEmpty());

        // only one main farm: marking Jayden moves it
        write(parent, jayden, "1234", "{\"main\":true}").andExpect(jsonPath("$.kids[0].main").value(false))
                .andExpect(jsonPath("$.kids[1].main").value(true));
        mvc.perform(get("/api/v1/children").header("Authorization", "Bearer " + parent))
                .andExpect(jsonPath("$[1].main").value(true));
    }

    @Test
    void wrongPinsWaitAndStrangersSeeNothing() throws Exception {
        String parent = bearer(UUID.randomUUID().toString());
        String stranger = bearer(UUID.randomUUID().toString());
        String kid = create(parent, "Mia");
        send(parent, "/api/v1/family/pin", "{\"pin\":\"2468\"}").andExpect(status().isOk());
        send(parent, "/api/v1/family/unlock", "{\"pin\":\"2468\"}").andExpect(status().isNoContent());
        for (int i = 0; i < 5; i++) {
            send(parent, "/api/v1/family/unlock", "{\"pin\":\"1111\"}").andExpect(status().isForbidden());
        }
        send(parent, "/api/v1/family/unlock", "{\"pin\":\"2468\"}").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("pin_wait"));

        write(stranger, kid, "2468", "{\"dailyMinutes\":5}").andExpect(status().isForbidden());
        beat(stranger, kid, 60).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/family").param("day", "today").header("Authorization", "Bearer " + parent))
                .andExpect(status().isBadRequest());
    }

    private ResultActions write(String token, String child, String pin, String fields) throws Exception {
        ObjectNode body = (ObjectNode) json.readTree(fields);
        body.put("pin", pin);
        body.put("day", DAY);
        return mvc.perform(post("/api/v1/family/kids/" + child).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private ResultActions send(String token, String path, String body) throws Exception {
        return mvc.perform(post(path).param("day", DAY).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions beat(String token, String child, int seconds) throws Exception {
        return mvc.perform(post("/api/v1/children/" + child + "/play").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"day\":\"" + DAY + "\",\"seconds\":" + seconds + "}"));
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
        return json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("id").asText();
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
