package com.kiddoquest.farm.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import com.kiddoquest.farm.repo.BrainAttemptRepository;
import com.kiddoquest.farm.repo.BrainProfileRepository;
import com.kiddoquest.farm.repo.BrainProgressRepository;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.ParentPinRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/** Each child has their own Brain Boost profile and progress; only the parent PIN changes a profile. */
@SpringBootTest
@AutoConfigureMockMvc
class BrainBoostFlowTest {

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
    @Autowired
    ParentPinRepository pins;
    @Autowired
    BrainProfileRepository profiles;
    @Autowired
    BrainProgressRepository progress;
    @Autowired
    BrainAttemptRepository attempts;

    @BeforeEach
    void clean() {
        attempts.deleteAll();
        progress.deleteAll();
        profiles.deleteAll();
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
        pins.deleteAll();
    }

    @Test
    void eachChildHasTheirOwnProfileAndOnlyThePinChangesIt() throws Exception {
        String parent = bearer("bb-parent");
        String jayden = create(parent, "Jayden");
        String michelle = create(parent, "Michelle");

        get(parent, jayden).andExpect(status().isOk())
                .andExpect(jsonPath("$.profile").isEmpty())
                .andExpect(jsonPath("$.progress.length()").value(0));

        String jaydenProfile = """
                {"pin":"1234","profile":{"topics":[
                  {"id":"calculation-tricks","enabled":true,"name":"  Speedy   Sums ","levels":[{"id":"level-02"},{"id":"level-01","enabled":false}]},
                  {"id":"logical-thinking","enabled":true,"levels":[{"id":"level-01"}]},
                  {"id":"math-challenge","enabled":false,"levels":[]}]}}""";
        send(parent, "/api/v1/children/" + jayden + "/brain-boost/profile", jaydenProfile)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("pin_missing"));
        send(parent, "/api/v1/family/pin?day=2026-11-02", "{\"pin\":\"1234\"}").andExpect(status().isOk());
        send(parent, "/api/v1/children/" + jayden + "/brain-boost/profile", jaydenProfile.replace("1234", "9999"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("wrong_pin"));

        JsonNode saved = body(send(parent, "/api/v1/children/" + jayden + "/brain-boost/profile", jaydenProfile)
                .andExpect(status().isOk()).andReturn());
        JsonNode topics = saved.path("profile").path("topics");
        assertEquals(3, topics.size());
        assertEquals("Speedy Sums", topics.get(0).path("name").asText());
        assertEquals("calculation-tricks/level-02", topics.get(0).path("levels").get(0).path("from").asText(), "the parent's order is kept");
        assertFalse(topics.get(0).path("levels").get(1).path("enabled").asBoolean());
        assertFalse(topics.get(2).path("enabled").asBoolean());

        // Michelle's profile is not touched by Jayden's
        get(parent, michelle).andExpect(jsonPath("$.profile").isEmpty());

        send(parent, "/api/v1/children/" + michelle + "/brain-boost/profile",
                "{\"pin\":\"1234\",\"profile\":{\"topics\":[{\"id\":\"logical-thinking\"},{\"id\":\"logical-thinking\"}]}}")
                .andExpect(status().isUnprocessableEntity());
        send(parent, "/api/v1/children/" + michelle + "/brain-boost/profile",
                "{\"pin\":\"1234\",\"profile\":{\"topics\":[{\"id\":\"../secrets\"}]}}")
                .andExpect(status().isUnprocessableEntity());

        // back to the default for the grade
        send(parent, "/api/v1/children/" + jayden + "/brain-boost/profile", "{\"pin\":\"1234\",\"profile\":null}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.profile").isEmpty());
    }

    @Test
    void aDraftStaysHiddenUntilItIsPublishedAndProgressIsKept() throws Exception {
        String parent = bearer("bb-parent-3");
        String mya = create(parent, "Mya", "p5");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/children")
                .header("Authorization", "Bearer " + parent)).andExpect(jsonPath("$[0].grade").value("p5"));
        send(parent, "/api/v1/family/pin?day=2026-11-02", "{\"pin\":\"2468\"}").andExpect(status().isOk());
        result(parent, mya, "try-mya-0001", "math-challenge", "p5-revision", true, 3, 8, 8).andExpect(status().isOk());

        // a grown-up's own topic mixing a P2 revision level, a harder P5 level and their own quiz
        String draft = """
                {"pin":"2468","profile":{"topics":[
                  {"id":"holiday","custom":true,"name":"Holiday Mix","icon":"🌴","color":"#2F7FD6","levels":[
                    {"from":"math-challenge/p2-revision","rules":{"questions":5,"hearts":2,"bogus":9}},
                    {"from":"math-challenge/p5-revision","difficulty":4,"questions":[
                      {"text":"What is 3/4 of 20?","options":["10","15","5"],"answer":"15","hint":"Find 1/4 first."}]},
                    {"from":"custom/c-a1b2","name":"Mum's quiz","questions":[{"text":"7 × 8 = ?","answer":"56"}]}]}]}}""";
        JsonNode saved = body(send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft", draft)
                .andExpect(status().isOk()).andReturn());
        assertTrue(saved.path("profile").isNull(), "the child does not see a draft");
        JsonNode levels = saved.path("draft").path("topics").get(0).path("levels");
        assertEquals(2, levels.get(0).path("rules").path("hearts").asInt());
        assertTrue(levels.get(0).path("rules").path("bogus").isMissingNode());
        assertEquals("15", levels.get(1).path("questions").get(0).path("answer").asText());
        assertTrue(levels.get(2).path("custom").asBoolean());

        // publishing shows it to the child, ends the draft, and keeps the stars Mya already has
        JsonNode published = body(send(parent, "/api/v1/children/" + mya + "/brain-boost/profile", draft)
                .andExpect(status().isOk()).andReturn());
        assertEquals("Holiday Mix", published.path("profile").path("topics").get(0).path("name").asText());
        assertTrue(published.path("draft").isNull());
        assertEquals(3, published.path("progress").get(0).path("stars").asInt());

        // the answer must be one of the choices, a level is in one place only, a question needs an answer
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft",
                "{\"pin\":\"2468\",\"profile\":{\"topics\":[{\"id\":\"a\",\"levels\":[{\"from\":\"custom/c-1\",\"questions\":[{\"text\":\"1+1\",\"options\":[\"1\",\"3\"],\"answer\":\"2\"}]}]}]}}")
                .andExpect(status().isUnprocessableEntity());
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft",
                "{\"pin\":\"2468\",\"profile\":{\"topics\":[{\"id\":\"a\",\"levels\":[{\"from\":\"x/level-01\"}]},{\"id\":\"b\",\"levels\":[{\"from\":\"x/level-01\"}]}]}}")
                .andExpect(status().isUnprocessableEntity());
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft",
                "{\"pin\":\"2468\",\"profile\":{\"topics\":[{\"id\":\"a\",\"levels\":[{\"from\":\"custom/c-1\",\"questions\":[{\"text\":\"1+1\"}]}]}]}}")
                .andExpect(status().isUnprocessableEntity());
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft", "{\"pin\":\"0000\",\"profile\":null}")
                .andExpect(status().isForbidden());

        // throwing a draft away leaves the published profile alone
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft", draft).andExpect(status().isOk());
        send(parent, "/api/v1/children/" + mya + "/brain-boost/profile/draft", "{\"pin\":\"2468\",\"profile\":null}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft").isEmpty())
                .andExpect(jsonPath("$.profile.topics[0].id").value("holiday"));
    }

    @Test
    void resultsKeepTheBestAndStayWithTheirChild() throws Exception {
        String parent = bearer("bb-parent-2");
        String other = bearer("bb-other");
        String jayden = create(parent, "Jayden");
        String michelle = create(parent, "Michelle");
        String mya = create(other, "Mya");

        result(parent, jayden, "try-0000001", "calculation-tricks", "level-01", true, 2, 4, 5)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repeat").value(false))
                .andExpect(jsonPath("$.progress.stars").value(2))
                .andExpect(jsonPath("$.progress.plays").value(1))
                .andExpect(jsonPath("$.progress.clears").value(1));
        // the same try sent again (the network dropped) counts once
        result(parent, jayden, "try-0000001", "calculation-tricks", "level-01", true, 2, 4, 5)
                .andExpect(jsonPath("$.repeat").value(true))
                .andExpect(jsonPath("$.progress.plays").value(1));
        result(parent, jayden, "try-0000002", "calculation-tricks", "level-01", true, 3, 5, 5)
                .andExpect(jsonPath("$.progress.stars").value(3))
                .andExpect(jsonPath("$.progress.bestCorrect").value(5));
        // a lost try never lowers the best, and stars only count when the level is cleared
        result(parent, jayden, "try-0000003", "calculation-tricks", "level-01", false, 3, 1, 5)
                .andExpect(jsonPath("$.progress.stars").value(3))
                .andExpect(jsonPath("$.progress.plays").value(3))
                .andExpect(jsonPath("$.progress.clears").value(2));

        JsonNode jaydenState = body(get(parent, jayden).andReturn());
        assertEquals(1, jaydenState.path("progress").size());
        assertEquals("calculation-tricks", jaydenState.path("progress").get(0).path("topic").asText());
        get(parent, michelle).andExpect(jsonPath("$.progress.length()").value(0));

        // another account sees nothing of Jayden's and cannot write for him
        get(other, jayden).andExpect(status().isNotFound());
        result(other, jayden, "try-0000004", "calculation-tricks", "level-02", true, 3, 5, 5).andExpect(status().isNotFound());
        send(other, "/api/v1/children/" + jayden + "/brain-boost/profile", "{\"pin\":\"1234\",\"profile\":null}")
                .andExpect(status().isNotFound());
        // nor reuse his try id for Mya
        result(other, mya, "try-0000001", "calculation-tricks", "level-01", true, 3, 5, 5)
                .andExpect(status().isUnprocessableEntity());
        get(other, mya).andExpect(jsonPath("$.progress.length()").value(0));

        result(parent, jayden, "x", "calculation-tricks", "level-01", true, 3, 5, 5).andExpect(status().isBadRequest());
        result(parent, jayden, "try-0000005", "Calculation Tricks", "level-01", true, 3, 5, 5).andExpect(status().isBadRequest());

        // closing a child removes its Brain Boost data
        mvc.perform(delete("/api/v1/children/" + jayden).header("Authorization", "Bearer " + parent))
                .andExpect(status().is2xxSuccessful());
        assertTrue(progress.findByChildIdOrderByTopicIdAscLevelIdAsc(jayden).isEmpty());
        assertFalse(attempts.existsById("try-0000002"));
    }

    private ResultActions get(String token, String childId) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/v1/children/" + childId + "/brain-boost").header("Authorization", "Bearer " + token));
    }

    private ResultActions result(String token, String childId, String attempt, String topic, String level, boolean cleared,
            int stars, int correct, int total) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("attemptId", attempt);
        body.put("topic", topic);
        body.put("level", level);
        body.put("cleared", cleared);
        body.put("stars", stars);
        body.put("correct", correct);
        body.put("total", total);
        body.put("secs", 40);
        return send(token, "/api/v1/children/" + childId + "/brain-boost/results", json.writeValueAsString(body));
    }

    private ResultActions send(String token, String url, String content) throws Exception {
        return mvc.perform(post(url).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private String create(String token, String name) throws Exception {
        return create(token, name, "p3");
    }

    private String create(String token, String name, String grade) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("displayName", name);
        body.put("grade", grade);
        body.put("look", "girl");
        MvcResult result = mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return body(result).path("id").asText();
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
