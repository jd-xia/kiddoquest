package com.kiddoquest.farm.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.ClubMemberRepository;
import com.kiddoquest.farm.repo.ClubRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@SpringBootTest
@AutoConfigureMockMvc
class ClubFlowTest {

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
    ClubRepository clubs;
    @Autowired
    ClubMemberRepository members;

    @BeforeEach
    void clean() {
        members.deleteAll();
        clubs.deleteAll();
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
    }

    @Test
    void membersShareOneMapButOnlyTheOwnerChangesAFarm() throws Exception {
        String mia = bearer("user-a");
        String jay = bearer("user-b");
        String miaChild = create(mia, "Mia", farm(1, "carrot"));
        String jayChild = create(jay, "Jay", farm(0, null));

        mvc.perform(get("/api/v1/clubs/mine").param("as", miaChild)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/clubs/mine").param("as", miaChild).header("Authorization", "Bearer " + mia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.club").isEmpty());

        JsonNode made = body(clubPost(mia, "/api/v1/clubs", "{\"as\":\"" + miaChild + "\",\"name\":\"  Sunny   Farm \"}")
                .andExpect(status().isCreated()).andReturn());
        String clubId = made.path("club").path("id").asText();
        assertEquals("Sunny Farm", made.path("club").path("name").asText());
        assertEquals(1, made.path("members").size());
        assertTrue(made.path("members").get(0).path("me").asBoolean());
        assertEquals(0, made.path("members").get(0).path("slot").asInt());

        clubPost(jay, "/api/v1/clubs", "{\"as\":\"" + jayChild + "\",\"name\":\"sunny farm\"}")
                .andExpect(status().isUnprocessableEntity());
        clubPost(jay, "/api/v1/clubs", "{\"as\":\"" + jayChild + "\",\"name\":\"no\"}")
                .andExpect(status().isUnprocessableEntity());
        clubPost(jay, "/api/v1/clubs", "{\"as\":\"" + miaChild + "\",\"name\":\"Other Farm\"}")
                .andExpect(status().isNotFound());   // Jay's account cannot act as Mia

        mvc.perform(get("/api/v1/clubs").param("q", "SUNNY").header("Authorization", "Bearer " + jay))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Sunny Farm"))
                .andExpect(jsonPath("$[0].members").value(1))
                .andExpect(jsonPath("$[0].max").value(4));

        JsonNode joined = body(clubPost(jay, "/api/v1/clubs/" + clubId + "/join", "{\"as\":\"" + jayChild + "\"}")
                .andExpect(status().isOk()).andReturn());
        assertEquals(2, joined.path("members").size());
        JsonNode miaSeen = joined.path("members").get(0);
        assertEquals("Mia", miaSeen.path("name").asText());
        assertFalse(miaSeen.path("me").asBoolean());
        assertEquals("carrot", miaSeen.path("farm").path("plots").get(0).path("crop").asText());
        assertEquals(1, joined.path("members").get(1).path("slot").asInt());
        assertTrue(joined.path("members").get(1).path("me").asBoolean());
        assertTrue(miaSeen.path("farm").path("fish").isMissingNode(), "the club only sees fields and animals");
        assertEquals("bob", miaSeen.path("farm").path("avatar3d").path("hair").asText(), "club mates see the character Mia designed");

        // A club mate can look at Mia's fields, but Mia's farm stays Mia's: no load, no sync from Jay's account.
        mvc.perform(get("/api/v1/children/" + miaChild).header("Authorization", "Bearer " + jay)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/children/" + miaChild + "/sync").header("Authorization", "Bearer " + jay)
                .contentType(MediaType.APPLICATION_JSON).content(sync("jay-tries-00001", 1, farm(0, null))))
                .andExpect(status().isNotFound());

        // Mia plants tomato and builds the fishing pond; Jay sees the new field at once, the pond stays Mia's.
        ObjectNode next = farm(1, "tomato");
        mvc.perform(post("/api/v1/children/" + miaChild + "/sync").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(sync("mia-plants-0001", 1, next)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("synced"));
        JsonNode seen = body(mvc.perform(get("/api/v1/clubs/mine").param("as", jayChild).header("Authorization", "Bearer " + jay))
                .andExpect(status().isOk()).andReturn());
        assertEquals("tomato", seen.path("members").get(0).path("farm").path("plots").get(0).path("crop").asText());

        clubPost(jay, "/api/v1/clubs/leave", "{\"as\":\"" + jayChild + "\"}").andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/clubs/mine").param("as", miaChild).header("Authorization", "Bearer " + mia))
                .andExpect(jsonPath("$.members.length()").value(1));
        clubPost(mia, "/api/v1/clubs/leave", "{\"as\":\"" + miaChild + "\"}").andExpect(status().isNoContent());
        assertEquals(0, clubs.count(), "the last one out closes the club");
    }

    @Test
    void aClubHoldsFourAndAChildIsInOneClub() throws Exception {
        String owner = bearer("user-c");
        String[] kids = new String[5];
        for (int i = 0; i < kids.length; i++) {
            kids[i] = create(owner, "Kid" + i, farm(0, null));
        }
        String clubId = body(clubPost(owner, "/api/v1/clubs", "{\"as\":\"" + kids[0] + "\",\"name\":\"Big Barn\"}")
                .andExpect(status().isCreated()).andReturn()).path("club").path("id").asText();
        clubPost(owner, "/api/v1/clubs", "{\"as\":\"" + kids[0] + "\",\"name\":\"Second Barn\"}")
                .andExpect(status().isUnprocessableEntity());
        for (int i = 1; i < 4; i++) {
            clubPost(owner, "/api/v1/clubs/" + clubId + "/join", "{\"as\":\"" + kids[i] + "\"}").andExpect(status().isOk());
        }
        clubPost(owner, "/api/v1/clubs/" + clubId + "/join", "{\"as\":\"" + kids[4] + "\"}")
                .andExpect(status().isUnprocessableEntity());
        clubPost(owner, "/api/v1/clubs/leave", "{\"as\":\"" + kids[2] + "\"}").andExpect(status().isNoContent());
        JsonNode in = body(clubPost(owner, "/api/v1/clubs/" + clubId + "/join", "{\"as\":\"" + kids[4] + "\"}")
                .andExpect(status().isOk()).andReturn());
        assertEquals(2, in.path("members").get(2).path("slot").asInt(), "the newcomer takes the free place on the map");
    }

    @Test
    void aBuiltPondIsStillThereAfterSigningInAgain() throws Exception {
        String mia = bearer("user-d");
        String child = create(mia, "Mia", farm(0, null));
        mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(sync("pond-build-0001", 1, farm(1, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("synced"))
                .andExpect(jsonPath("$.revision").value(2));
        // A later save from a stale copy (wrong base revision) is refused instead of overwriting the pond.
        mvc.perform(post("/api/v1/children/" + child + "/sync").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(sync("stale-copy-0001", 1, farm(0, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("conflict"))
                .andExpect(jsonPath("$.serverPlayer.farm.fish.pond").value(1));
        mvc.perform(get("/api/v1/children/" + child).header("Authorization", "Bearer " + mia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.player.farm.fish.pond").value(1));
    }

    private ResultActions clubPost(String token, String url, String content) throws Exception {
        return mvc.perform(post(url).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private String sync(String key, long base, ObjectNode player) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("idempotencyKey", key);
        body.put("baseRevision", base);
        body.put("policy", "upload");
        body.set("player", player);
        return json.writeValueAsString(body);
    }

    private String create(String token, String name, ObjectNode player) throws Exception {
        player.put("name", name);
        ObjectNode body = json.createObjectNode();
        body.put("displayName", name);
        body.put("grade", "p1");
        body.put("look", "girl");
        body.set("player", player);
        MvcResult result = mvc.perform(post("/api/v1/children").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        return body(result).path("id").asText();
    }

    /** A small farm: pond 0 or 1, and one crop in the first field (or none). */
    private ObjectNode farm(int pond, String crop) {
        ObjectNode player = json.createObjectNode();
        player.put("id", "p1");
        player.put("name", "Mia");
        player.put("grade", "p1");
        player.put("look", "girl");
        player.put("gems", 500);
        player.putObject("avatar3d").put("hair", "bob").put("top", "#EC6FA9");   // her own Character Maker design
        ObjectNode farm = player.putObject("farm");
        ArrayNode plots = farm.putArray("plots");
        if (crop != null) {
            ObjectNode plot = plots.addObject();
            plot.put("crop", crop);
            plot.put("planted", Instant.now().toEpochMilli());
            plot.put("watered", false);
        }
        farm.put("unlocked", 6);
        farm.putArray("animals").addObject().put("type", "chicken").put("last", Instant.now().toEpochMilli());
        farm.putArray("decor");
        farm.put("xp", 0);
        ObjectNode fish = farm.putObject("fish");
        fish.put("pond", pond);
        fish.putArray("owned").add("rod:twig");
        fish.put("rod", "twig");
        fish.put("bait", 1);
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
