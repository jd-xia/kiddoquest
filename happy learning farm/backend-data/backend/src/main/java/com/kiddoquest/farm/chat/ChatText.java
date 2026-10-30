package com.kiddoquest.farm.chat;

public final class ChatText {

    public static final int MAX = 180;

    private ChatText() {
    }

    public static String clean(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replaceAll("[\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
    }

    public static String room(String mine, String with) {
        if (mine == null || !mine.matches("P\\d{7}")) {
            return null;
        }
        if ("hall".equals(with)) {
            return "hall";
        }
        if (with == null || !with.matches("P\\d{7}") || with.equals(mine)) {
            return null;
        }
        return mine.compareTo(with) < 0 ? mine + "|" + with : with + "|" + mine;
    }
}
