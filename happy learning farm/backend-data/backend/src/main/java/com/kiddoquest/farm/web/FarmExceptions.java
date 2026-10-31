package com.kiddoquest.farm.web;

public class FarmExceptions {

    private FarmExceptions() {
    }

    public static class NotFoundException extends RuntimeException {
        public NotFoundException() {
            super("That farm was not found.");
        }
    }

    /** The parent PIN is missing, wrong, or was wrong too often. code: pin_missing, wrong_pin or pin_wait. */
    public static class PinException extends RuntimeException {
        private final String code;

        public PinException(String code, String message) {
            super(message);
            this.code = code;
        }

        public String getCode() {
            return code;
        }
    }

    /** The farm was opened on a newer screen; this one must not save over it. */
    public static class ScreenTakenException extends RuntimeException {
        public ScreenTakenException() {
            super("This farm is now open on another screen. This screen stopped and did not save.");
        }
    }

    public static class SyncRejectedException extends RuntimeException {
        public SyncRejectedException(String message) {
            super(message);
        }
    }
}
