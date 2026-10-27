package com.kiddoquest.farm.sync;

import java.security.MessageDigest;
import java.util.HexFormat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

public final class ContentHash {

    private ContentHash() {
    }

    public static String sha256(ObjectMapper mapper, JsonNode node) {
        try {
            ObjectMapper stable = mapper.copy()
                    .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
                    .configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY, true);
            byte[] body = stable.writeValueAsBytes(node);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not hash the farm");
        }
    }
}
