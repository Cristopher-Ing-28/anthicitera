package com.anticithera.backend.rest;

import com.anticithera.backend.entity.ExportacionZip;
import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;
import com.anticithera.backend.service.FileService;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileResourceTest {

    @Mock
    private AuthService authService;

    @Mock
    private FileService fileService;

    @InjectMocks
    private FileResource fileResource;

    private Usuario usuarioValido;
    private final String tokenValido = "Bearer mi-token-secreto";

    @BeforeEach
    void setUp() {
        usuarioValido = new Usuario();
        usuarioValido.setId(7L);
        usuarioValido.setUsername("john_doe");
    }

    @Test
    void uploadZip_Unauthorized_WhenTokenInvalid() {
        when(authService.getUserByToken("invalid-token")).thenReturn(null);

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.status(Response.Status.UNAUTHORIZED)).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(401);

            InputStream stream = new ByteArrayInputStream(new byte[0]);
            Response response = fileResource.uploadZip("Bearer invalid-token", "test.zip", stream);

            assertEquals(401, response.getStatus());
        }
    }

    @Test
    void listZips_Success_WhenTokenValid() {
        when(authService.getUserByToken("mi-token-secreto")).thenReturn(usuarioValido);
        when(fileService.getUserZips(usuarioValido)).thenReturn(new ArrayList<>());

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.ok(any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(200);

            Response response = fileResource.listZips(tokenValido);

            assertEquals(200, response.getStatus());
            verify(fileService, times(1)).getUserZips(usuarioValido);
        }
    }

    @Test
    void downloadZip_NotFound_WhenFileBelongsToOtherUser() {
        when(authService.getUserByToken("mi-token-secreto")).thenReturn(usuarioValido);

        Usuario otroUsuario = new Usuario();
        otroUsuario.setId(99L);

        ExportacionZip zipAjeno = new ExportacionZip();
        zipAjeno.setUsuario(otroUsuario);

        when(fileService.getZipById(100L)).thenReturn(zipAjeno);

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.status(Response.Status.NOT_FOUND)).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(404);

            Response response = fileResource.downloadZip(tokenValido, 100L);

            assertEquals(404, response.getStatus());
        }
    }
}