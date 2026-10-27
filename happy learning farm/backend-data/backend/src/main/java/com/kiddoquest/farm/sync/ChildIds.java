package com.kiddoquest.farm.sync;

import java.util.regex.Pattern;

public final class ChildIds {

    private static final Pattern UUID = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private ChildIds() {
    }

    public static boolean valid(String id) {
        return id != null && UUID.matcher(id).matches();
    }
}
