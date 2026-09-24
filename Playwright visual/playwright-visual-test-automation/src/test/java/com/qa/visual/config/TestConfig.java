package com.qa.visual.config;

import java.io.InputStream;
import java.util.Properties;

public final class TestConfig {

    private static final String CONFIG_FILE = "config.properties";
    private static final Properties PROPS = new Properties();

    static {
        try (InputStream in = TestConfig.class.getClassLoader().getResourceAsStream(CONFIG_FILE)) {
            if (in == null) {
                throw new IllegalStateException(CONFIG_FILE + " not found on classpath");
            }
            PROPS.load(in);
        } catch (Exception e) {
            throw new ExceptionInInitializerError("Failed to load " + CONFIG_FILE + ": " + e.getMessage());
        }
    }

    private TestConfig() {
    }

    public static String getBaseUrl() {
        return require("base.url");
    }

    public static String getLoginUsername() {
        return require("login.username");
    }

    public static String getLoginPassword() {
        return require("login.password");
    }

    private static String require(String key) {
        String value = PROPS.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required config property: " + key);
        }
        return value.trim();
    }
}
