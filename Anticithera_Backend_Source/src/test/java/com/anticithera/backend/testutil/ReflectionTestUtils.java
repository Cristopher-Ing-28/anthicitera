package com.anticithera.backend.testutil;

import java.lang.reflect.Field;

public class ReflectionTestUtils {
    public static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException("Error setting field " + fieldName + " on " + target, e);
        }
    }
}
