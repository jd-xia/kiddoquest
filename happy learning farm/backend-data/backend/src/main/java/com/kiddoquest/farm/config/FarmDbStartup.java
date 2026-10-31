package com.kiddoquest.farm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** One-time fixes that Hibernate ddl-auto does not always apply on existing MySQL. */
@Component
public class FarmDbStartup implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FarmDbStartup.class);

    private final JdbcTemplate jdbc;

    public FarmDbStartup(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        widenVoiceColumn();
    }

    private void widenVoiceColumn() {
        try {
            String type = jdbc.query(
                    """
                            SELECT DATA_TYPE FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'farm_message' AND COLUMN_NAME = 'voice_data'
                            """,
                    rs -> rs.next() ? rs.getString(1) : null);
            if (type == null) {
                return;
            }
            if ("longtext".equalsIgnoreCase(type)) {
                return;
            }
            log.warn("farm_message.voice_data is {} — widening to LONGTEXT for voice chat", type);
            jdbc.execute("ALTER TABLE farm_message MODIFY voice_data LONGTEXT");
        } catch (Exception ex) {
            log.warn("Could not widen farm_message.voice_data: {}", ex.getMessage());
        }
    }
}
