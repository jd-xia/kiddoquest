package com.kiddoquest.farm.web;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.chat.ChatService;
import com.kiddoquest.farm.chat.ChatTickets;
import com.kiddoquest.farm.web.FarmDtos.ChatLine;
import com.kiddoquest.farm.web.FarmDtos.ChatTicket;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/chat")
@Tag(name = "Chat")
public class ChatController {

    private final ChatService chat;
    private final ChatTickets tickets;

    public ChatController(ChatService chat, ChatTickets tickets) {
        this.chat = chat;
        this.tickets = tickets;
    }

    @PostMapping("/ticket")
    @Operation(summary = "A short-lived ticket for the chat socket")
    public ChatTicket ticket(@AuthenticationPrincipal Jwt jwt) {
        return new ChatTicket(tickets.issue(ChildController.owner(jwt)));
    }

    @GetMapping("/history")
    @Operation(summary = "Recent farm-chat or direct messages for one of this account's children")
    public List<ChatLine> history(@AuthenticationPrincipal Jwt jwt, @RequestParam String as, @RequestParam String with) {
        return chat.history(ChildController.owner(jwt), as, with);
    }
}
