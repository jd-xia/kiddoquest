package com.kiddoquest.farm.board;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kiddoquest.farm.board.BoardRanks.Stats;
import com.kiddoquest.farm.chat.OnlineKids;
import com.kiddoquest.farm.domain.ChildProfile;
import com.kiddoquest.farm.domain.GameSnapshot;
import com.kiddoquest.farm.repo.ChildProfileRepository;
import com.kiddoquest.farm.repo.GameSnapshotRepository;
import com.kiddoquest.farm.web.FarmDtos.BoardEntry;

@Service
public class BoardService {

    private final ChildProfileRepository children;
    private final GameSnapshotRepository snapshots;
    private final OnlineKids online;
    private final ObjectMapper mapper;

    public BoardService(ChildProfileRepository children, GameSnapshotRepository snapshots, OnlineKids online,
            ObjectMapper mapper) {
        this.children = children;
        this.snapshots = snapshots;
        this.online = online;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<BoardEntry> board() {
        List<Standing> standings = new ArrayList<>();
        for (ChildProfile child : children.findAll()) {
            standings.add(standingOf(child));
        }
        standings.sort((a, b) -> {
            boolean aOn = online.online(a.child().getUsername());
            boolean bOn = online.online(b.child().getUsername());
            if (aOn != bOn) {
                return aOn ? -1 : 1;
            }
            return shown(a.child().getDisplayName()).compareToIgnoreCase(shown(b.child().getDisplayName()));
        });
        List<BoardEntry> rows = new ArrayList<>();
        for (Standing row : standings) {
            Stats stats = row.stats();
            rows.add(new BoardEntry(row.child().getUsername(), row.child().getDisplayName(), row.child().getGrade(),
                    row.child().getLook(), stats.cleared(), stats.questions(), stats.firstTry(), stats.accuracy(),
                    stats.stars(), stats.score(), online.online(row.child().getUsername()), row.level(), row.coins()));
        }
        return rows;
    }

    private Standing standingOf(ChildProfile child) {
        GameSnapshot snap = snapshots.findById(child.getId()).orElse(null);
        if (snap == null || snap.getPlayerJson() == null) {
            return new Standing(child, BoardRanks.empty(), 1, 0);
        }
        try {
            var player = mapper.readTree(snap.getPlayerJson());
            return new Standing(child, BoardRanks.from(player.get("lv")),
                    BoardRanks.farmLevel(player.path("farm").path("xp").asInt(0)), BoardRanks.coins(player));
        } catch (Exception ex) {
            return new Standing(child, BoardRanks.empty(), 1, 0);
        }
    }

    private static String shown(String name) {
        return name == null ? "" : name;
    }

    private record Standing(ChildProfile child, Stats stats, int level, long coins) {
    }
}
