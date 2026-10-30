package com.kiddoquest.farm.config;

import java.util.Map;

import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import jakarta.websocket.server.ServerContainer;

import com.kiddoquest.farm.chat.ChatSocket;
import com.kiddoquest.farm.chat.ChatTickets;

@Configuration
@EnableWebSocket
public class ChatSocketConfig implements WebSocketConfigurer {

    private final ChatSocket socket;
    private final ChatTickets tickets;

    public ChatSocketConfig(ChatSocket socket, ChatTickets tickets) {
        this.socket = socket;
        this.tickets = tickets;
    }

    @Bean
    public ServletContextInitializer webSocketBuffer() {
        return servletContext -> {
            Object container = servletContext.getAttribute("jakarta.websocket.server.ServerContainer");
            if (container instanceof ServerContainer server) {
                server.setDefaultMaxTextMessageBufferSize(768 * 1024);
            }
        };
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(socket, "/api/v1/ws").addInterceptors(new TicketHandshake(tickets)).setAllowedOriginPatterns("*");
    }

    static final class TicketHandshake implements HandshakeInterceptor {

        private final ChatTickets tickets;

        TicketHandshake(ChatTickets tickets) {
            this.tickets = tickets;
        }

        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
                Map<String, Object> attributes) {
            if (!(request instanceof ServletServerHttpRequest servlet)) {
                return false;
            }
            String owner = tickets.take(servlet.getServletRequest().getParameter("ticket"));
            if (owner == null) {
                return false;
            }
            attributes.put("owner", owner);
            return true;
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
                Exception exception) {
        }
    }
}
