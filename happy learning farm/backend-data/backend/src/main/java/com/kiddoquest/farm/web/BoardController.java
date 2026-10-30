package com.kiddoquest.farm.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.board.BoardService;
import com.kiddoquest.farm.web.FarmDtos.BoardEntry;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/board")
@Tag(name = "Leaderboard")
public class BoardController {

    private final BoardService board;

    public BoardController(BoardService board) {
        this.board = board;
    }

    @GetMapping
    @Operation(summary = "Every saved child, ranked by levels cleared times first-try accuracy")
    public List<BoardEntry> list() {
        return board.board();
    }
}
