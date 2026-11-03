package com.kiddoquest.farm.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.club.ClubService;
import com.kiddoquest.farm.web.ClubDtos.ClubCreate;
import com.kiddoquest.farm.web.ClubDtos.ClubInfo;
import com.kiddoquest.farm.web.ClubDtos.ClubJoin;
import com.kiddoquest.farm.web.ClubDtos.MyClub;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/clubs")
@Tag(name = "Clubs")
public class ClubController {

    private final ClubService clubs;

    public ClubController(ClubService clubs) {
        this.clubs = clubs;
    }

    @GetMapping("/mine")
    @Operation(summary = "The club one of this account's children is in, with every member's fields and animals")
    public MyClub mine(@AuthenticationPrincipal Jwt jwt, @RequestParam String as) {
        return clubs.mine(ChildController.owner(jwt), as);
    }

    @GetMapping
    @Operation(summary = "Find clubs by name")
    public List<ClubInfo> search(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "") String q) {
        ChildController.owner(jwt);
        return clubs.search(q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Make a club with a name nobody else has, and join it")
    public MyClub create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ClubCreate body) {
        return clubs.create(ChildController.owner(jwt), body.as(), body.name());
    }

    @PostMapping("/{clubId}/join")
    @Operation(summary = "Join a club. A child is in one club at a time.")
    public MyClub join(@AuthenticationPrincipal Jwt jwt, @PathVariable String clubId, @Valid @RequestBody ClubJoin body) {
        return clubs.join(ChildController.owner(jwt), body.as(), clubId);
    }

    @PostMapping("/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Leave the club. The child's own farm stays as it is.")
    public void leave(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ClubJoin body) {
        clubs.leave(ChildController.owner(jwt), body.as());
    }
}
