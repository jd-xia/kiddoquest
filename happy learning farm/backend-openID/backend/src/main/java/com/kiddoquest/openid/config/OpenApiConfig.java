package com.kiddoquest.openid.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("KiddoQuest OpenID")
                        .version("1.0")
                        .description("""
                                Reusable OpenID Connect login for KiddoQuest games.
                                The game sends an identity-provider token. This service verifies it
                                with the provider and returns a KiddoQuest access token.
                                Farm data does not live here. A Google client secret is not used:
                                Google ID tokens are checked against Google's published signing keys.
                                """))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
