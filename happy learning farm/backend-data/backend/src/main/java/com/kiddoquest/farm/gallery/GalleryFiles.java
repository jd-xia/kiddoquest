package com.kiddoquest.farm.gallery;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Set;
import java.util.regex.Pattern;

/** Checks what a child shares: which Art Studio item it is for, the picture, and the 3D model. */
public final class GalleryFiles {

    /** A Studio sticker is 256×256 and about 10 KB; a 3D snapshot PNG can be bigger. */
    public static final int PICTURE_MAX = 400_000;
    /** Shared models are smaller than the 20 MB a child may keep on their own device. */
    public static final int MODEL_MAX = 10 * 1024 * 1024;

    private static final Pattern KEY = Pattern.compile("(seed|animal|prod|decor|building|fish|hat|npc):[A-Za-z0-9 _.'-]{1,40}");
    /** Only things that stand on the farm or swim in the pond can be a 3D model (same as MODEL_KINDS in art.js). */
    private static final Set<String> MODEL_KINDS = Set.of("animal", "decor", "building", "fish");
    private static final Set<String> STYLES = Set.of("sticker", "cartoon", "pixel", "3d");

    private GalleryFiles() {
    }

    /** The item key, or null. "me", the photo face and the portrait are never shared: they show the child. */
    public static String key(String raw) {
        if (raw == null) {
            return null;
        }
        String key = raw.trim();
        return key.length() <= 48 && KEY.matcher(key).matches() ? key : null;
    }

    public static boolean canModel(String key) {
        return key != null && MODEL_KINDS.contains(key.substring(0, key.indexOf(':')));
    }

    public static String style(String raw) {
        return raw != null && STYLES.contains(raw) ? raw : "sticker";
    }

    /** A clean data URL of a PNG or WebP picture under the size limit, or null. */
    public static String picture(String raw) {
        if (raw == null) {
            return null;
        }
        String type;
        if (raw.startsWith("data:image/png;base64,")) {
            type = "png";
        } else if (raw.startsWith("data:image/webp;base64,")) {
            type = "webp";
        } else {
            return null;
        }
        byte[] bytes = decode(raw.substring(raw.indexOf(',') + 1), PICTURE_MAX);
        if (bytes == null || bytes.length < 64) {
            return null;
        }
        boolean ok = "png".equals(type)
                ? (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                : ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP");
        return ok ? "data:image/" + type + ";base64," + Base64.getEncoder().encodeToString(bytes) : null;
    }

    /** The bytes of a .glb, or of a .gltf with everything inside it, or null. */
    public static byte[] model(String base64) {
        byte[] bytes = decode(base64, MODEL_MAX);
        if (bytes == null || bytes.length < 20) {
            return null;
        }
        if (ascii(bytes, 0, 4).equals("glTF")) {
            return bytes;
        }
        String start = new String(bytes, 0, Math.min(bytes.length, 4096), StandardCharsets.UTF_8).trim();
        return start.startsWith("{") && start.contains("\"asset\"") ? bytes : null;
    }

    public static String modelName(String raw) {
        if (raw == null) {
            return null;
        }
        String name = raw.replaceAll("[^A-Za-z0-9 _.()-]", "").trim();
        if (name.isEmpty()) {
            return null;
        }
        return name.length() > 80 ? name.substring(name.length() - 80) : name;
    }

    private static byte[] decode(String raw, int max) {
        if (raw == null) {
            return null;
        }
        String compact = raw.replaceAll("\\s", "");
        if (compact.isEmpty() || compact.length() > (max / 3 + 1) * 4 || !compact.matches("[A-Za-z0-9+/=]+")) {
            return null;
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(compact);
            return bytes.length <= max ? bytes : null;
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String ascii(byte[] bytes, int from, int len) {
        return bytes.length < from + len ? "" : new String(bytes, from, len, StandardCharsets.US_ASCII);
    }
}
