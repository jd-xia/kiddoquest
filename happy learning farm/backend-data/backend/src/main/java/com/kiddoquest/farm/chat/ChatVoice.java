package com.kiddoquest.farm.chat;

import java.util.Base64;
import java.util.Locale;
import java.util.Set;

/** A short voice clip stored as base64. The browser records it; the farm only keeps audio. */
public final class ChatVoice {

    /** About fifteen seconds of a normal browser recording. */
    public static final int MAX_BYTES = 400_000;

    private static final int MIN_BYTES = 200;
    private static final Set<String> TYPES = Set.of("audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav",
            "audio/x-m4a");

    private ChatVoice() {
    }

    public static String mime(String raw) {
        if (raw == null) {
            return null;
        }
        String type = raw.toLowerCase(Locale.ROOT).trim();
        int semi = type.indexOf(';');
        if (semi >= 0) {
            type = type.substring(0, semi).trim();
        }
        return TYPES.contains(type) ? type : null;
    }

    /** Clean base64 of a clip that fits the size limit, or null. */
    public static String stored(String raw) {
        if (raw == null) {
            return null;
        }
        String compact = raw.replaceAll("\\s", "");
        if (compact.length() < 8 || compact.length() > MAX_BYTES * 2 || !compact.matches("[A-Za-z0-9+/=]+")) {
            return null;
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(compact);
            if (bytes.length < MIN_BYTES || bytes.length > MAX_BYTES) {
                return null;
            }
            return Base64.getEncoder().encodeToString(bytes);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
