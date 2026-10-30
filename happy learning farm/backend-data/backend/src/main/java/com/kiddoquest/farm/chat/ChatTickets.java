package com.kiddoquest.farm.chat;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/** One-time tickets so the chat socket does not put the sign-in token in the address. */
@Component
public class ChatTickets {

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    public String issue(String ownerId) {
        Instant now = Instant.now();
        Iterator<Map.Entry<String, Ticket>> it = tickets.entrySet().iterator();
        while (it.hasNext()) {
            if (it.next().getValue().expires.isBefore(now)) {
                it.remove();
            }
        }
        String id = UUID.randomUUID().toString();
        tickets.put(id, new Ticket(ownerId, now.plusSeconds(45)));
        return id;
    }

    public String take(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }
        Ticket ticket = tickets.remove(id);
        if (ticket == null || ticket.expires.isBefore(Instant.now())) {
            return null;
        }
        return ticket.ownerId;
    }

    private record Ticket(String ownerId, Instant expires) {
    }
}
