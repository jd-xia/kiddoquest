package com.kiddoquest.farm.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

class BellaAdviceTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void timeComesBeforeAnythingElse() throws Exception {
        ObjectNode player = json.createObjectNode();
        player.putObject("miss").put("at", Instant.now().toEpochMilli()).put("name", "Pairs").put("hint", "Count on.");
        assertEquals("Play time is almost gone. Finish what you are holding and stop for today.",
                BellaAdvice.reply(player, 90, Instant.now()));
    }

    @Test
    void aFreshMissUsesItsHint() throws Exception {
        ObjectNode player = farm();
        player.putObject("miss").put("at", Instant.now().toEpochMilli()).put("name", "Pairs").put("hint", "Count on from 2.");
        assertEquals("On Pairs: Count on from 2.", BellaAdvice.reply(player, null, Instant.now()));
    }

    @Test
    void lowCoinsAndARipeCropPointAtTheMarket() throws Exception {
        ObjectNode player = json.createObjectNode();
        player.put("gems", 4);
        ObjectNode plot = player.putObject("farm").putArray("plots").addObject();
        plot.put("crop", "carrot");
        plot.put("planted", Instant.now().minusSeconds(180).toEpochMilli());
        assertEquals("A crop is ready. Harvest it and sell it at the market.",
                BellaAdvice.reply(player, null, Instant.now()));
    }

    @Test
    void anEmptyFieldComesBeforeTheSchool() {
        assertTrue(BellaAdvice.reply(null, null, Instant.now()).startsWith("A field is empty."));
    }

    private ObjectNode farm() {
        ObjectNode player = json.createObjectNode();
        player.put("gems", 1000);
        ObjectNode farm = player.putObject("farm");
        farm.put("unlocked", 1);
        farm.putArray("plots").addObject().put("crop", "carrot").put("planted", Instant.now().toEpochMilli());
        return player;
    }
}
