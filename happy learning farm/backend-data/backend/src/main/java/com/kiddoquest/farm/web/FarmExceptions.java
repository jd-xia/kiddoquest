package com.kiddoquest.farm.web;

public class FarmExceptions {

    private FarmExceptions() {
    }

    public static class NotFoundException extends RuntimeException {
        public NotFoundException() {
            super("That farm was not found.");
        }
    }

    public static class SyncRejectedException extends RuntimeException {
        public SyncRejectedException(String message) {
            super(message);
        }
    }
}
