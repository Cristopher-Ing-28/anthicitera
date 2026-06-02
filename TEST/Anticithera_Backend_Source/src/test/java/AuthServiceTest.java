package com.anticithera.backend.service;

import com.anticithera.backend.entity.SesionActividad;
import com.anticithera.backend.entity.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mindrot.jbcrypt.BCrypt;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private TypedQuery<Usuario> mockUserQuery;

    @Mock
    private TypedQuery<SesionActividad> mockSessionQuery;

    @InjectMocks
    private AuthService authService;

    private Usuario testUser;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash(BCrypt.hashpw("password", BCrypt.gensalt()));
    }

    @Test
    void testUsernameExists_true() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenReturn(testUser);

        assertTrue(authService.usernameExists("testuser"));
    }

    @Test
    void testUsernameExists_false() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenThrow(NoResultException.class);

        assertFalse(authService.usernameExists("nonexistentuser"));
    }

    @Test
    void testEmailExists_true() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenReturn(testUser);

        assertTrue(authService.emailExists("test@example.com"));
    }

    @Test
    void testEmailExists_false() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenThrow(NoResultException.class);

        assertFalse(authService.emailExists("nonexistent@example.com"));
    }

    @Test
    void testRegister_success() throws Exception {
        when(em.createQuery(anyString(), eq(Usuario.class)))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any()))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult())
                .thenThrow(NoResultException.class); // Simulate user/email not existing

        Usuario newUser = authService.register("newuser", "new@example.com", "newpassword");

        assertNotNull(newUser);
        assertEquals("newuser", newUser.getUsername());
        assertEquals("new@example.com", newUser.getEmail());
        assertTrue(BCrypt.checkpw("newpassword", newUser.getPasswordHash()));
        verify(em, times(1)).persist(any(Usuario.class));
    }

    @Test
    void testRegister_usernameExists() {
        when(em.createQuery(anyString(), eq(Usuario.class)))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any()))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult())
                .thenReturn(testUser); // Simulate username existing

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            authService.register("testuser", "new@example.com", "newpassword");
        });

        assertEquals("El nombre de usuario 'testuser' ya está registrado", exception.getMessage());
        verify(em, never()).persist(any(Usuario.class));
    }

    @Test
    void testRegister_emailExists() {
        // Simulate username not existing
        when(em.createQuery(anyString(), eq(Usuario.class)))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(eq("username"), any()))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult())
                .thenThrow(new NoResultException());

        // Simulate email existing
        when(mockUserQuery.setParameter(eq("email"), any()))
                .thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult())
                .thenReturn(testUser); 

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            authService.register("anotheruser", "test@example.com", "newpassword");
        });

        assertEquals("El email 'test@example.com' ya está registrado", exception.getMessage());
        verify(em, never()).persist(any(Usuario.class));
    }

    @Test
    void testLogin_success() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenReturn(testUser);
        
        String token = authService.login("testuser", "password");

        assertNotNull(token);
        verify(em, times(1)).persist(any(SesionActividad.class));
    }

    @Test
    void testLogin_invalidPassword() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenReturn(testUser);

        String token = authService.login("testuser", "wrongpassword");

        assertNull(token);
        verify(em, never()).persist(any(SesionActividad.class));
    }

    @Test
    void testLogin_userNotFound() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenThrow(NoResultException.class);

        String token = authService.login("nonexistentuser", "password");

        assertNull(token);
        verify(em, never()).persist(any(SesionActividad.class));
    }

    @Test
    void testLogout_success() {
        SesionActividad activeSession = new SesionActividad();
        activeSession.setTokenSesion("valid-token");
        activeSession.setInicioConexion(java.time.LocalDateTime.now());
        activeSession.setUsuario(testUser);

        when(em.createQuery(anyString(), eq(SesionActividad.class))).thenReturn(mockSessionQuery);
        when(mockSessionQuery.setParameter(anyString(), any())).thenReturn(mockSessionQuery);
        when(mockSessionQuery.getSingleResult()).thenReturn(activeSession);

        authService.logout("valid-token");

        assertNotNull(activeSession.getFinConexion());
        verify(em, times(1)).merge(activeSession);
    }

    @Test
    void testLogout_sessionNotFound() {
        when(em.createQuery(anyString(), eq(SesionActividad.class))).thenReturn(mockSessionQuery);
        when(mockSessionQuery.setParameter(anyString(), any())).thenReturn(mockSessionQuery);
        when(mockSessionQuery.getSingleResult()).thenThrow(NoResultException.class);

        authService.logout("invalid-token");

        verify(em, never()).merge(any(SesionActividad.class));
    }

    @Test
    void testGetUserByToken_validToken() {
        SesionActividad activeSession = new SesionActividad();
        activeSession.setTokenSesion("valid-token");
        activeSession.setInicioConexion(java.time.LocalDateTime.now());
        activeSession.setUsuario(testUser);

        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenReturn(testUser);

        Usuario foundUser = authService.getUserByToken("valid-token");

        assertNotNull(foundUser);
        assertEquals(testUser.getUsername(), foundUser.getUsername());
    }

    @Test
    void testGetUserByToken_invalidToken() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(mockUserQuery);
        when(mockUserQuery.setParameter(anyString(), any())).thenReturn(mockUserQuery);
        when(mockUserQuery.getSingleResult()).thenThrow(NoResultException.class);

        Usuario foundUser = authService.getUserByToken("invalid-token");

        assertNull(foundUser);
    }
}
