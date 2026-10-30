package com.kiddoquest.farm.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kiddoquest.farm.board.BoardRanks.Stats;

class BoardRanksTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void scoreIsClearedLevelsTimesAccuracyAfterFiveAnswers() throws Exception {
        ObjectNode levels = json.createObjectNode();
        ObjectNode first = levels.putObject("c1-1");
        first.put("stars", 3);
        first.put("qs", 4);
        first.put("first", 4);
        assertNull(BoardRanks.from(levels).accuracy());
        assertEquals(0, BoardRanks.from(levels).score());

        ObjectNode second = levels.putObject("c1-2");
        second.put("stars", 2);
        second.put("qs", 6);
        second.put("first", 5);
        Stats stats = BoardRanks.from(levels);
        assertEquals(2, stats.cleared());
        assertEquals(10, stats.questions());
        assertEquals(9, stats.firstTry());
        assertEquals(90, stats.accuracy());
        assertEquals(5, stats.stars());
        assertEquals(180, stats.score());
    }

    @Test
    void carefulProgressRanksAboveALongerSloppyRun() {
        Stats careful = new Stats(8, 40, 36, 90, 16, 720);
        Stats wide = new Stats(10, 40, 20, 50, 30, 500);
        Stats perfectButShort = new Stats(2, 10, 10, 100, 6, 200);
        assertTrue(BoardRanks.compare(careful, "Ada", wide, "Bea") < 0);
        assertTrue(BoardRanks.compare(wide, "Bea", perfectButShort, "Cy") < 0);
        Stats tied = new Stats(8, 40, 36, 90, 10, 720);
        assertTrue(BoardRanks.compare(careful, "Ada", tied, "Bea") < 0);
    }

    @Test
    void farmLevelFollowsTheGameAndCoinsStayOnTheRow() throws Exception {
        assertEquals(1, BoardRanks.farmLevel(0));
        assertEquals(1, BoardRanks.farmLevel(19));
        assertEquals(2, BoardRanks.farmLevel(20));
        assertEquals(3, BoardRanks.farmLevel(60));
        ObjectNode player = json.createObjectNode();
        player.put("gems", 1000);
        assertEquals(1000, BoardRanks.coins(player));
        player.put("gems", -4);
        assertEquals(0, BoardRanks.coins(player));
    }

    @Test
    void firstTriesCannotExceedQuestions() throws Exception {
        ObjectNode levels = json.createObjectNode();
        ObjectNode row = levels.putObject("c1-1");
        row.put("stars", 1);
        row.put("qs", 5);
        row.put("first", 9);
        Stats stats = BoardRanks.from(levels);
        assertEquals(5, stats.firstTry());
        assertEquals(100, stats.accuracy());
    }
}
