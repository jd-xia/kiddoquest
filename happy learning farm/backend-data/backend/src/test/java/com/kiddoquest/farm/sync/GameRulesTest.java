package com.kiddoquest.farm.sync;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

class GameRulesTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final GameStateValidator validator = new GameStateValidator(mapper);
    private final GameStateMerger merger = new GameStateMerger(mapper);
    private final Instant now = Instant.parse("2026-10-27T00:00:00Z");

    @Test
    void keepsTodaysRecordForMyDay() throws Exception {
        ObjectNode raw = (ObjectNode) mapper.readTree("{\"name\":\"Mia\",\"gems\":99999,\"daily\":{\"d\":\"2026-10-27\",\"coins\":12,\"goods\":50,"
                + "\"log\":{\"secs\":900,\"earn_learn\":12,\"earn_goods\":6,\"planted\":3,\"right\":-4,\"hack\":7}}}");
        ObjectNode out = validator.sanitize(raw, "Mia", "p1", "girl", now);
        assertEquals(99999, out.path("gems").asLong());   // coins are trusted: no cap on a sync
        assertEquals(20, out.path("daily").path("goods").asLong());
        assertEquals(900, out.path("daily").path("log").path("secs").asLong());
        assertEquals(3, out.path("daily").path("log").path("planted").asLong());
        assertTrue(out.path("daily").path("log").path("right").isMissingNode());
        assertTrue(out.path("daily").path("log").path("hack").isMissingNode());
    }

    @Test
    void keepsThePondTheMeadowAndTheStarterFlag() throws Exception {
        ObjectNode raw = (ObjectNode) mapper.readTree("""
                {"name":"Mia","gems":5,"starter":1,"farm":{"lands":["meadow","moon"],
                  "plots":[null,null,null,null,null,null,null,null,null,null,null,null,null,{"crop":"corn","planted":1,"watered":false}],
                  "fish":{"pond":2,"owned":["rod:gold","net","rod:laser"],"rod":"gold","bait":4,"catches":{"koi":2,"shark":9}}}}
                """);
        ObjectNode out = validator.sanitize(raw, "Mia", "p1", "girl", now);
        JsonNode fish = out.path("farm").path("fish");
        assertEquals(1, out.path("starter").asInt());
        assertEquals("[\"meadow\"]", out.path("farm").path("lands").toString());
        assertEquals("corn", out.path("farm").path("plots").get(13).path("crop").asText());
        assertEquals(2, fish.path("pond").asInt());
        assertEquals("[\"rod:twig\",\"rod:gold\",\"net\"]", fish.path("owned").toString());
        assertEquals("gold", fish.path("rod").asText());
        assertEquals(4, fish.path("bait").asInt());
        assertEquals(2, fish.path("catches").path("koi").asInt());
        assertTrue(fish.path("catches").path("shark").isMissingNode());

        ObjectNode older = validator.sanitize(mapper.readTree("{\"name\":\"Mia\",\"farm\":{}}"), "Mia", "p1", "girl", now);
        JsonNode merged = merger.merge(out, older).node().path("farm");
        assertEquals(2, merged.path("fish").path("pond").asInt());
        assertEquals("[\"meadow\"]", merged.path("lands").toString());
    }

    @Test
    void capsAnimalsAndClampsAFutureCrop() throws Exception {
        long later = now.toEpochMilli() + 86_400_000L;
        ObjectNode raw = (ObjectNode) mapper.readTree("""
                {"id":"p1","name":"Mia","grade":"p1","look":"girl","gems":4,"farm":{
                  "animals":[
                    {"type":"chicken","last":1},{"type":"chicken","last":1},{"type":"chicken","last":1},
                    {"type":"chicken","last":1},{"type":"chicken","last":1},{"type":"dragon","last":1}
                  ],
                  "plots":[{"crop":"carrot","planted":%d,"watered":false}]
                }}
                """.formatted(later));
        raw.put("name", " Mia\u0001");
        ObjectNode out = validator.sanitize(raw, "Mia", "p1", "girl", now);
        assertEquals("Mia", out.path("name").asText());
        assertEquals(3, out.path("farm").path("animals").size());
        assertEquals(now.toEpochMilli(), out.path("farm").path("plots").get(0).path("planted").asLong());
    }

    @Test
    void mergeKeepsFurtherProgress() throws Exception {
        ObjectNode server = (ObjectNode) mapper.readTree("""
                {"id":"p1","name":"Mia","gems":10,"time":5,"lv":{"c1-1":{"stars":1,"plays":1,"clears":1,"qs":1,"first":1,"last":1}},
                 "farm":{"xp":4,"unlocked":6,"decor":["flowers"],"animals":[{"type":"chicken","last":5}],
                         "plots":[{"crop":"carrot","planted":50,"watered":false}],"barn":{"carrot":1}}}
                """);
        ObjectNode local = (ObjectNode) mapper.readTree("""
                {"id":"p1","name":"Mia","gems":30,"time":9,"lv":{"c1-1":{"stars":3,"plays":2,"clears":1,"qs":4,"first":3,"last":9}},
                 "farm":{"xp":12,"unlocked":8,"decor":["pond"],"animals":[{"type":"sheep","last":8}],
                         "shirt":"blue","hat":"cap",
                         "plots":[{"crop":"carrot","planted":80,"watered":true}],"barn":{"carrot":4}}}
                """);
        GameStateMerger.MergeResult merged = merger.merge(local, server);
        assertEquals(30, merged.node().path("gems").asLong());
        assertEquals(3, merged.node().path("lv").path("c1-1").path("stars").asInt());
        assertEquals(12, merged.node().path("farm").path("xp").asInt());
        assertEquals(8, merged.node().path("farm").path("unlocked").asInt());
        assertTrue(merged.node().path("farm").path("decor").toString().contains("flowers"));
        assertTrue(merged.node().path("farm").path("decor").toString().contains("pond"));
        assertEquals(2, merged.node().path("farm").path("animals").size());
        assertEquals(50, merged.node().path("farm").path("plots").get(0).path("planted").asLong());
        assertTrue(merged.node().path("farm").path("plots").get(0).path("watered").asBoolean());
        assertEquals(4, merged.node().path("farm").path("barn").path("carrot").asInt());
        assertTrue(merged.notes().stream().anyMatch(note -> note.contains("coin")));
    }
}
