package com.anticithera.backend.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UsuarioTest {

    private Usuario usuario;
    private LocalDateTime testTime;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        testTime = LocalDateTime.now();
    }

    @Test
    void testIdGetterAndSetter() {
        Long id = 1L;
        usuario.setId(id);
        assertEquals(id, usuario.getId());
    }

    @Test
    void testUsernameGetterAndSetter() {
        String username = "testuser";
        usuario.setUsername(username);
        assertEquals(username, usuario.getUsername());
    }

    @Test
    void testEmailGetterAndSetter() {
        String email = "test@example.com";
        usuario.setEmail(email);
        assertEquals(email, usuario.getEmail());
    }

    @Test
    void testPasswordHashGetterAndSetter() {
        String passwordHash = "hashedpassword123";
        usuario.setPasswordHash(passwordHash);
        assertEquals(passwordHash, usuario.getPasswordHash());
    }

    @Test
    void testCreatedAtGetterAndSetter() {
        usuario.setCreatedAt(testTime);
        assertEquals(testTime, usuario.getCreatedAt());
    }

    @Test
    void testSesionesGetterAndSetter() {
        List<SesionActividad> sesiones = new ArrayList<>();
        sesiones.add(new SesionActividad());
        usuario.setSesiones(sesiones);
        assertEquals(sesiones, usuario.getSesiones());
        assertNotNull(usuario.getSesiones());
        assertEquals(1, usuario.getSesiones().size());
    }

    @Test
    void testExportacionesGetterAndSetter() {
        List<ExportacionZip> exportaciones = new ArrayList<>();
        exportaciones.add(new ExportacionZip());
        usuario.setExportaciones(exportaciones);
        assertEquals(exportaciones, usuario.getExportaciones());
        assertNotNull(usuario.getExportaciones());
        assertEquals(1, usuario.getExportaciones().size());
    }
}
