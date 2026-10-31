package com.kiddoquest.farm.web;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.FarmMessageRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.repo.SharedArtRepository;
import com.kiddoquest.farm.repo.SharedModelRepository;
import com.kiddoquest.farm.repo.SyncReceiptRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

@SpringBootTest
@AutoConfigureMockMvc
class GalleryFlowTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-32";
    /** A real 1×1 PNG. */
    private static final String PNG = "data:image/png;base64,"
            + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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
    FarmMessageRepository messages;
    @Autowired
    SharedArtRepository arts;
    @Autowired
    SharedModelRepository models;

    @BeforeEach
    void clean() {
        models.deleteAll();
        arts.deleteAll();
        messages.deleteAll();
        receipts.deleteAll();
        snapshots.deleteAll();
        children.deleteAll();
    }

    @Test
    void childrenShareAndEveryoneCanPick() throws Exception {
        String mia = bearer(UUID.randomUUID().toString());   // a new account each test: sharing is paced per account
        String child = create(mia, "Mia");
        byte[] glb = glb();

        // a guest cannot share
        mvc.perform(post("/api/v1/gallery").contentType(MediaType.APPLICATION_JSON).content(share(child, "animal:sheep", glb)))
                .andExpect(status().isUnauthorized());

        String id = body(mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "animal:sheep", glb)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model").value(true))
                .andExpect(jsonPath("$.style").value("3d"))
                .andExpect(jsonPath("$.name").value("Mia"))
                .andExpect(jsonPath("$.mine").value(true))
                .andReturn()).path("id").asText();

        // a guest sees it and downloads the model, but it is not theirs
        mvc.perform(get("/api/v1/gallery").param("key", "animal:sheep"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].picture").value(PNG))
                .andExpect(jsonPath("$[0].modelBytes").value(glb.length))
                .andExpect(jsonPath("$[0].mine").value(false));
        mvc.perform(get("/api/v1/gallery").param("key", "animal:cow")).andExpect(jsonPath("$.length()").value(0));
        byte[] back = mvc.perform(get("/api/v1/gallery/" + id + "/model"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertArrayEquals(glb, back);

        // another account cannot delete it; the owner can
        String ben = bearer(UUID.randomUUID().toString());
        mvc.perform(delete("/api/v1/gallery/" + id).header("Authorization", "Bearer " + ben)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/gallery/" + id).header("Authorization", "Bearer " + mia)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/gallery/" + id + "/model")).andExpect(status().isNotFound());
        assertEquals(0, models.count());
    }

    @Test
    void onlyRealPicturesAndModelsForTheRightItems() throws Exception {
        String mia = bearer(UUID.randomUUID().toString());   // a new account each test: sharing is paced per account
        String child = create(mia, "Mia");
        // the child's own drawing of themselves is never shared
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "me", null)))
                .andExpect(status().isUnprocessableEntity());
        // a crop can be a picture, not a 3D model
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "seed:carrot", glb())))
                .andExpect(status().isUnprocessableEntity());
        // a model must really be a glTF
        ObjectNode fake = (ObjectNode) json.readTree(share(child, "animal:cow", null));
        fake.put("model", Base64.getEncoder().encodeToString("not a model at all, just text".getBytes(StandardCharsets.UTF_8)));
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(fake)))
                .andExpect(status().isUnprocessableEntity());
        // another account's child cannot be used
        String ben = bearer(UUID.randomUUID().toString());
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + ben)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "seed:carrot", null)))
                .andExpect(status().isNotFound());
        // a picture on its own is fine
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "seed:carrot", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.model").value(false))
                .andExpect(jsonPath("$.style").value("sticker"));
    }

    @Test
    void deletingTheFarmRemovesItsSharedDesigns() throws Exception {
        String mia = bearer(UUID.randomUUID().toString());   // a new account each test: sharing is paced per account
        String child = create(mia, "Mia");
        mvc.perform(post("/api/v1/gallery").header("Authorization", "Bearer " + mia)
                .contentType(MediaType.APPLICATION_JSON).content(share(child, "building:barn", glb())))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/children/" + child).header("Authorization", "Bearer " + mia)).andExpect(status().isNoContent());
        assertEquals(0, arts.count());
        assertEquals(0, models.count());
    }

    private String share(String child, String key, byte[] model) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("as", child);
        body.put("key", key);
        body.put("picture", PNG);
        body.put("style", "sticker");
        if (model != null) {
            body.put("model", Base64.getEncoder().encodeToString(model));
            body.put("modelName", "black-sheep.glb");
        }
        return json.writeValueAsString(body);
    }

    /** The smallest valid-looking .glb header plus a JSON chunk. */
    private static byte[] glb() {
        byte[] chunk = "{\"asset\":{\"version\":\"2.0\"}}    ".getBytes(StandardCharsets.US_ASCII);
        java.nio.ByteBuffer b = java.nio.ByteBuffer.allocate(20 + chunk.length).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        b.put("glTF".getBytes(StandardCharsets.US_ASCII)).putInt(2).putInt(20 + chunk.length);
        b.putInt(chunk.length).put("JSON".getBytes(StandardCharsets.US_ASCII)).put(chunk);
        return b.array();
    }

    private String create(String token, String name) throws Exception {
        ObjectNode body = json.createObjectNode();
        body.put("displayName", name);
        body.put("grade", "p1");
        body.put("look", "girl");
        ObjectNode player = body.putObject("player");
        player.put("id", "p1");
        player.put("name", name);
        player.put("grade", "p1");
        player.put("look", "girl");
        player.put("avatar", "chick");
        player.putArray("owned").add("chick");
        player.put("gems", 10);
        player.putObject("seen");
        player.putObject("lv");
        player.putArray("sessions");
        player.put("time", 0);
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
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .jwtID(UUID.randomUUID().toString())
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
