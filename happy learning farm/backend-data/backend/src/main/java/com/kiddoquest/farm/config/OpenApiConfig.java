package com.kiddoquest.farm.config;

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
                        .title("Happy Learning Farm API")
                        .version("1.0")
                        .description("""
                                Child farms for one signed-in account. Tokens come from backend-openid.
                                One Google account can own several child farms. Farms are stored separately.
                                Sync stores a whole farm document. It does not add rewards by itself.
                                upload writes only when baseRevision matches. Otherwise the result is conflict and nothing is saved.
                                keep_local, keep_server, and merge run only after the player confirms.
                                The same idempotencyKey returns the original result, so a retry does not apply twice.
                                Coins cannot jump ahead of the saved farm by more than the daily learning cap, unless the player explicitly keeps this device (still capped).
                                """))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
