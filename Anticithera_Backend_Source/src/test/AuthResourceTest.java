package com.anticithera.backend.rest;

import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthResourceTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthResource authResource;

    private Map<String, String> validCredentials;

    @BeforeEach
    void setUp() {
        validCredentials = new HashMap<>();
        validCredentials.put("username", "testuser");
        validCredentials.put("email", "test@example.com");
        validCredentials.put("password", "password123");
    }

    @Test
    void testRegister_Success() throws Exception {
        Usuario mockUser = new Usuario();
        mockUser.setUsername("testuser");
        mockUser.setEmail("test@example.com");

        when(authService.register(anyString(), anyString(), anyString())).thenReturn(mockUser);
        when(authService.login(anyString(), anyString())).thenReturn("mock-token");

        Response response = authResource.register(validCredentials);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        Map<String, Object> entity = (Map<String, Object>) response.getEntity();
        assertEquals("mock-token", entity.get("token"));
        assertEquals("testuser", entity.get("username"));
    }

    @Test
    void testRegister_MissingData() {
        Map<String, String> incompleteCredentials = new HashMap<>();
        incompleteCredentials.put("username", "testuser");

        Response response = authResource.register(incompleteCredentials);

        assertEquals(Response.Status.BAD_REQUEST.getStatusCode(), response.getStatus());
    }

    @Test
    void testRegister_Conflict() throws Exception {
        when(authService.register(anyString(), anyString(), anyString()))
                .thenThrow(new IllegalArgumentException("User already exists"));

        Response response = authResource.register(validCredentials);

        assertEquals(Response.Status.CONFLICT.getStatusCode(), response.getStatus());
    }

    @Test
    void testRegister_InternalError() throws Exception {
        when(authService.register(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Database error"));

        Response response = authResource.register(validCredentials);

        assertEquals(Response.Status.INTERNAL_SERVER_ERROR.getStatusCode(), response.getStatus());
    }

    @Test
    void testLogin_Success() {
        Usuario mockUser = new Usuario();
        mockUser.setUsername("testuser");
        mockUser.setEmail("test@example.com");

        when(authService.login("testuser", "password123")).thenReturn("mock-token");
        when(authService.getUserByToken("mock-token")).thenReturn(mockUser);

        Map<String, String> loginCredentials = new HashMap<>();
        loginCredentials.put("username", "testuser");
        loginCredentials.put("password", "password123");

        Response response = authResource.login(loginCredentials);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        Map<String, Object> entity = (Map<String, Object>) response.getEntity();
        assertEquals("mock-token", entity.get("token"));
    }

    @Test
    void testLogin_Unauthorized() {
        when(authService.login(anyString(), anyString())).thenReturn(null);

        Map<String, String> loginCredentials = new HashMap<>();
        loginCredentials.put("username", "wronguser");
        loginCredentials.put("password", "wrongpass");

        Response response = authResource.login(loginCredentials);

        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), response.getStatus());
    }

    @Test
    void testLogout_Success() {
        String authHeader = "Bearer mock-token";
        
        Response response = authResource.logout(authHeader);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        verify(authService).logout("mock-token");
    }

    @Test
    void testLogout_BadRequest() {
        Response response = authResource.logout("InvalidHeader");

        assertEquals(Response.Status.BAD_REQUEST.getStatusCode(), response.getStatus());
    }
}
