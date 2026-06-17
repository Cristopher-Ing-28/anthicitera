package com.anticithera.backend.service;

import com.anticithera.backend.entity.SesionActividad;
import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mindrot.jbcrypt.BCrypt;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private TypedQuery<Usuario> usuarioQuery;

    @Mock
    private TypedQuery<SesionActividad> sesionQuery;

    @InjectMocks
    private AuthService authService;

    private Usuario usuarioPrueba;

    @BeforeEach
    void setUp() {
        usuarioPrueba = new Usuario();
        usuarioPrueba.setId(1L);
        usuarioPrueba.setUsername("testuser");
        usuarioPrueba.setEmail("test@email.com");
        usuarioPrueba.setPasswordHash(BCrypt.hashpw("password123", BCrypt.gensalt()));
    }

    @Test
    void register_Success() throws Exception {
        // Configurar mocks para que indiquen que el usuario/email no existen
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter(any(String.class), any())).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenThrow(new jakarta.persistence.NoResultException());

        Usuario registrado = authService.register("newuser", "new@email.com", "securePass");

        assertNotNull(registrado);
        assertEquals("newuser", registrado.getUsername());
        verify(em, times(1)).persist(any(Usuario.class));
    }

    @Test
    void register_ThrowsException_WhenUsernameExists() {
        when(em.createQuery(contains("u.username"), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "testuser")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);

        assertThrows(IllegalArgumentException.class, () -> {
            authService.register("testuser", "other@email.com", "password123");
        });
    }

    @Test
void login_Success() {
    // 1. Forzar una coincidencia más específica usando "contains"
    // Reemplaza "u.username" y "s.token" por fragmentos reales de tus consultas JPQL/HQL
    when(em.createQuery(contains("u.username"), eq(Usuario.class))).thenReturn(usuarioQuery);
    when(usuarioQuery.setParameter("username", "testuser")).thenReturn(usuarioQuery);
    when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);
    
    // 2. Mock de la consulta de sesión con su propio filtro
    when(em.createQuery(contains("s.token"), eq(SesionActividad.class))).thenReturn(sesionQuery);
    // Usa anyString() o any() genérico para los parámetros si no quieres ligarte a nombres exactos
    when(sesionQuery.setParameter(anyString(), any())).thenReturn(sesionQuery);
    when(sesionQuery.getSingleResult()).thenThrow(new jakarta.persistence.NoResultException());
    
    // Ejecución
    String token = authService.login("testuser", "password123");
    
    // Verificaciones
    assertNotNull(token, "El token no debería ser nulo si las credenciales son correctas");
    verify(em, times(1)).persist(any(SesionActividad.class));
}

    @Test
    void login_Failure_WrongPassword() {
        when(em.createQuery(contains("u.username"), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "testuser")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);

        String token = authService.login("testuser", "wrong_password");

        assertNull(token);
        verify(em, never()).persist(any(SesionActividad.class));
    }

    @Test
    void usernameExists_True_WhenExists() {
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "testuser")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);

        boolean exists = authService.usernameExists("testuser");

        assertTrue(exists);
    }

    @Test
    void usernameExists_False_WhenNoResult() {
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "missinguser")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenThrow(new jakarta.persistence.NoResultException());

        boolean exists = authService.usernameExists("missinguser");

        assertFalse(exists);
    }

    @Test
    void emailExists_True_WhenExists() {
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("email", "test@email.com")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);

        boolean exists = authService.emailExists("test@email.com");

        assertTrue(exists);
    }

    @Test
    void login_ReturnsNull_WhenUserNotFoundException() {
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "unknown")).thenReturn(usuarioQuery);
        // Fuerza el bloque catch interno de login
        when(usuarioQuery.getSingleResult()).thenThrow(new RuntimeException("DB Error"));

        String token = authService.login("unknown", "password");

        assertNull(token);
    }

    @Test
    void logout_HandlesException_WhenTokenNotFound() {
        when(em.createQuery(any(String.class), eq(SesionActividad.class))).thenReturn(sesionQuery);
        when(sesionQuery.setParameter("token", "invalid-token")).thenReturn(sesionQuery);
        // Fuerza el bloque catch interno de logout
        when(sesionQuery.getSingleResult()).thenThrow(new jakarta.persistence.NoResultException());

        // No debe lanzar excepción hacia afuera porque el catch la absorbe
        assertDoesNotThrow(() -> authService.logout("invalid-token"));
        verify(em, never()).merge(any());
    }

    @Test
    void getUserByToken_ReturnsNull_WhenExceptionOccurs() {
        when(em.createQuery(any(String.class), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("token", "fake")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenThrow(new jakarta.persistence.NoResultException());

        Usuario user = authService.getUserByToken("fake");

        assertNull(user);
    }
}