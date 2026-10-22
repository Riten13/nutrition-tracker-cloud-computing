package com.example.userprofile.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private final String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final int expirationMs = 3600000;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", expirationMs);
    }

    @Test
    @DisplayName("generateToken includes userId, email, and role claims accurately")
    void generateToken_withUserIdAndEmailAndRole_canBeExtracted() {
        Long expectedUserId = 42L;
        String expectedEmail = "testuser@example.com";
        String expectedRole = "ROLE_ADMIN";

        String token = jwtUtils.generateToken(expectedUserId, expectedEmail, expectedRole);

        assertThat(token).isNotBlank();
        assertThat(jwtUtils.validateJwtToken(token)).isTrue();
        assertThat(jwtUtils.getEmailFromJwtToken(token)).isEqualTo(expectedEmail);
        assertThat(jwtUtils.getUserIdFromJwtToken(token)).isEqualTo(expectedUserId);
        assertThat(jwtUtils.getRoleFromJwtToken(token)).isEqualTo(expectedRole);
    }

    @Test
    @DisplayName("generateToken with 2 arguments defaults role to ROLE_USER")
    void generateToken_defaultRole_fallsBackToRoleUser() {
        String token = jwtUtils.generateToken(1L, "user@example.com");

        assertThat(token).isNotBlank();
        assertThat(jwtUtils.getRoleFromJwtToken(token)).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("validateJwtToken returns false for invalid or tampered token")
    void validateJwtToken_invalidToken_returnsFalse() {
        assertThat(jwtUtils.validateJwtToken("invalid.token.payload")).isFalse();
    }
}

