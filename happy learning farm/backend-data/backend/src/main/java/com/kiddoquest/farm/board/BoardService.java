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
            standings.add(new Standing(child, statsOf(child.getId())));
        }
        standings.sort((a, b) -> BoardRanks.compare(a.stats, a.child.getDisplayName(), b.stats, b.child.getDisplayName()));
        List<BoardEntry> rows = new ArrayList<>();
        for (int i = 0; i < standings.size(); i++) {
            Standing row = standings.get(i);
            Stats stats = row.stats;
            rows.add(new BoardEntry(i + 1, row.child.getUsername(), row.child.getDisplayName(), row.child.getGrade(),
                    row.child.getLook(), stats.cleared(), stats.questions(), stats.firstTry(), stats.accuracy(),
                    stats.stars(), stats.score(), online.online(row.child.getUsername())));
        }
        return rows;
    }

    private Stats statsOf(String childId) {
        GameSnapshot snap = snapshots.findById(childId).orElse(null);
        if (snap == null || snap.getPlayerJson() == null) {
            return BoardRanks.empty();
        }
        try {
            return BoardRanks.from(mapper.readTree(snap.getPlayerJson()).get("lv"));
        } catch (Exception ex) {
            return BoardRanks.empty();
        }
    }

    private record Standing(ChildProfile child, Stats stats) {
    }
}
