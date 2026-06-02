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
    private TypedQuery<Usuario> userQuery;

    @Mock
    private TypedQuery<SesionActividad> sessionQuery;

    @InjectMocks
    private AuthService authService;

    private Usuario testUser;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash(BCrypt.hashpw("password123", BCrypt.gensalt()));
    }

    @Test
    void testUsernameExists_True() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenReturn(testUser);

        assertTrue(authService.usernameExists("testuser"));
    }

    @Test
    void testUsernameExists_False() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenThrow(new NoResultException());

        assertFalse(authService.usernameExists("nonexistent"));
    }

    @Test
    void testEmailExists_True() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenReturn(testUser);

        assertTrue(authService.emailExists("test@example.com"));
    }

    @Test
    void testRegister_Success() throws Exception {
        // Mocking existence checks to return false
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenThrow(new NoResultException());

        Usuario result = authService.register("newuser", "new@example.com", "pass");

        assertNotNull(result);
        assertEquals("newuser", result.getUsername());
        verify(em).persist(any(Usuario.class));
    }

    @Test
    void testLogin_Success() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenReturn(testUser);

        String token = authService.login("testuser", "password123");

        assertNotNull(token);
        verify(em).persist(any(SesionActividad.class));
    }

    @Test
    void testLogout_Success() {
        SesionActividad session = new SesionActividad();
        when(em.createQuery(anyString(), eq(SesionActividad.class))).thenReturn(sessionQuery);
        when(sessionQuery.setParameter(anyString(), any())).thenReturn(sessionQuery);
        when(sessionQuery.getSingleResult()).thenReturn(session);

        authService.logout("mock-token");

        assertNotNull(session.getFinConexion());
        verify(em).merge(session);
    }

    @Test
    void testGetUserByToken_Success() {
        when(em.createQuery(anyString(), eq(Usuario.class))).thenReturn(userQuery);
        when(userQuery.setParameter(anyString(), any())).thenReturn(userQuery);
        when(userQuery.getSingleResult()).thenReturn(testUser);

        Usuario result = authService.getUserByToken("mock-token");

        assertNotNull(result);
        assertEquals(testUser, result);
    }
}
