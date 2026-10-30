package com.kiddoquest.farm.chat;

import java.util.Set;

public interface OnlineKids {

    boolean online(String username);

    Set<String> names();
}
