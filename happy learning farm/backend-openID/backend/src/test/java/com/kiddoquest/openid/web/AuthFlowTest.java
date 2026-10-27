package com.kiddoquest.openid.web;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kiddoquest.openid.provider.GoogleJwkIdTokenDecoder;
import com.kiddoquest.openid.repo.ExternalIdentityRepository;
import com.kiddoquest.openid.repo.UserAccountRepository;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper json;
    @Autowired
    UserAccountRepository users;
    @Autowired
    ExternalIdentityRepository identities;
    @MockBean
    GoogleJwkIdTokenDecoder decoder;

    @BeforeEach
    void clean() {
        identities.deleteAll();
        users.deleteAll();
    }

    @Test
    void theSameGoogleAccountKeepsTheSameUserId() throws Exception {
        when(decoder.decode("tok")).thenReturn(google("sub-a", "tok", "alex@example.com"));
        String first = userId(login("tok"));
        String second = userId(login("tok"));
        org.junit.jupiter.api.Assertions.assertEquals(first, second);
        org.junit.jupiter.api.Assertions.assertEquals(1, users.count());
        org.junit.jupiter.api.Assertions.assertEquals("alex@example.com", identities.findAll().get(0).getEmail());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken(login("tok"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(first)))
                .andExpect(jsonPath("$.displayName", is("Alex")))
                .andExpect(jsonPath("$.email", is("alex@example.com")));
    }

    @Test
    void oneEmailCannotLinkASecondAccount() throws Exception {
        when(decoder.decode("tok")).thenReturn(google("sub-a", "tok", "alex@example.com"));
        when(decoder.decode("other")).thenReturn(google("sub-b", "other", "Alex@Example.com"));
        login("tok");
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"idToken\":\"other\"}"))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(1, users.count());
        org.junit.jupiter.api.Assertions.assertEquals("alex@example.com", identities.findAll().get(0).getEmail());
    }

    @Test
    void aLinkedEmailCannotBeChanged() throws Exception {
        when(decoder.decode("tok")).thenReturn(google("sub-a", "tok", "alex@example.com"));
        when(decoder.decode("changed")).thenReturn(google("sub-a", "changed", "sam@example.com"));
        login("tok");
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"idToken\":\"changed\"}"))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals("alex@example.com", identities.findAll().get(0).getEmail());
    }

    @Test
    void aDifferentEmailOpensAnotherAccount() throws Exception {
        when(decoder.decode("tok")).thenReturn(google("sub-a", "tok", "alex@example.com"));
        when(decoder.decode("other")).thenReturn(google("sub-b", "other", "sam@example.com"));
        String first = userId(login("tok"));
        String second = userId(login("other"));
        org.junit.jupiter.api.Assertions.assertNotEquals(first, second);
        org.junit.jupiter.api.Assertions.assertEquals(2, users.count());
    }

    @Test
    void aRejectedGoogleTokenCreatesNobody() throws Exception {
        when(decoder.decode("bad")).thenThrow(new JwtException("rejected"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"idToken\":\"bad\"}"))
                .andExpect(status().isUnauthorized());
        org.junit.jupiter.api.Assertions.assertEquals(0, users.count());
    }

    @Test
    void meAndUnknownProviderStayClosed() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"apple\",\"idToken\":\"tok\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/auth/providers")).andExpect(status().isOk()).andExpect(jsonPath("$[0]", is("google")));
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    private MvcResult login(String token) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"idToken\":\"" + token + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andReturn();
    }

    private String userId(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString()).path("user").path("id").asText();
    }

    private String accessToken(MvcResult result) throws Exception {
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        return body.path("accessToken").asText();
    }

    private static Jwt google(String subject, String token, String email) {
        return Jwt.withTokenValue(token)
                .header("alg", "RS256")
                .subject(subject)
                .issuer("https://accounts.google.com")
                .audience(List.of("test-client-id"))
                .claim("name", "Alex")
                .claim("email", email)
                .claim("email_verified", true)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
    }
}
