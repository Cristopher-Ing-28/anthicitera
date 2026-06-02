package com.anticithera.backend.service;

import com.anticithera.backend.entity.SesionActividad;
import com.anticithera.backend.entity.Usuario;
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
        when(em.createQuery(contains("u.username"), eq(Usuario.class))).thenReturn(usuarioQuery);
        when(usuarioQuery.setParameter("username", "testuser")).thenReturn(usuarioQuery);
        when(usuarioQuery.getSingleResult()).thenReturn(usuarioPrueba);

        String token = authService.login("testuser", "password123");

        assertNotNull(token);
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
}