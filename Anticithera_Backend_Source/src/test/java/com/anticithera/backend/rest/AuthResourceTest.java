package com.anticithera.backend.rest;

import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
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

    @Test
    void register_BadRequest_WhenMissingFields() {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", "test");
        // Falta email y password

        // Usamos un bloque MockedStatic para interceptar las llamadas al generador de respuestas de Jakarta
        // y evitar el error del RuntimeDelegate ausente.
        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);
            
            mockedResponse.when(() -> Response.status(Response.Status.BAD_REQUEST)).thenReturn(builder);
            when(builder.entity(any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(400);

            Response response = authResource.register(credentials);

            assertEquals(400, response.getStatus());
        }
    }

    @Test
    void login_Success() {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", "user");
        credentials.put("password", "pass");

        Usuario mockUser = new Usuario();
        mockUser.setUsername("user");
        mockUser.setEmail("user@test.com");

        when(authService.login("user", "pass")).thenReturn("mock-token-123");
        when(authService.getUserByToken("mock-token-123")).thenReturn(mockUser);

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);
            Map<String, Object> fakeEntity = Map.of("token", "mock-token-123", "username", "user", "email", "user@test.com");

            mockedResponse.when(() -> Response.ok(any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(200);
            when(mockRes.getEntity()).thenReturn(fakeEntity);

            Response response = authResource.login(credentials);

            assertEquals(200, response.getStatus());
            Map<?, ?> entity = (Map<?, ?>) response.getEntity();
            assertEquals("mock-token-123", entity.get("token"));
        }
    }

    @Test
    void login_Unauthorized_WhenCredentialsAreInvalid() {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", "bad_user");
        credentials.put("password", "bad_pass");

        when(authService.login("bad_user", "bad_pass")).thenReturn(null);

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.status(Response.Status.UNAUTHORIZED)).thenReturn(builder);
            when(builder.entity(any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(401);

            Response response = authResource.login(credentials);

            assertEquals(401, response.getStatus());
        }
    }
}