package com.anticithera.backend.rest;

import java.time.LocalDateTime;
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
        
        // --- LA SOLUCIÓN: Crear un ZIP falso en lugar de una lista vacía ---
        ExportacionZip mockZip = new ExportacionZip();
        mockZip.setId(1L);
        mockZip.setNombreArchivo("backup.zip");
        // Nota: Si tu fecha es de tipo LocalDateTime, usa LocalDateTime.now() en vez de new java.util.Date()
        mockZip.setFechaCreacion(LocalDateTime.now()); 
        
        ArrayList<ExportacionZip> listaConUnZip = new ArrayList<>();
        listaConUnZip.add(mockZip);
        
        when(fileService.getUserZips(usuarioValido)).thenReturn(listaConUnZip);
        // -------------------------------------------------------------------

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

    @Test
    void uploadZip_InternalServerError_WhenExceptionOccurs() throws Exception {
        when(authService.getUserByToken("mi-token-secreto")).thenReturn(usuarioValido);
        
        InputStream stream = new ByteArrayInputStream("datos".getBytes());
        when(fileService.saveZip(eq(usuarioValido), eq("error.zip"), any(InputStream.class)))
                .thenThrow(new RuntimeException("Fallo de escritura en disco"));

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.status(Response.Status.INTERNAL_SERVER_ERROR)).thenReturn(builder);
            when(builder.entity(any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(500);

            Response response = fileResource.uploadZip(tokenValido, "error.zip", stream);

            assertEquals(500, response.getStatus());
        }
    }

    @Test
    void uploadZip_Unauthorized_WhenHeaderIsNull() {
        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.status(Response.Status.UNAUTHORIZED)).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(401);

            InputStream stream = new ByteArrayInputStream(new byte[0]);
            // Enviamos un header null para forzar la rama del 'validateUser' malformado
            Response response = fileResource.uploadZip(null, "test.zip", stream);

            assertEquals(401, response.getStatus());
        }
    }

    @Test
    void downloadZip_Success_WhenFileBelongsToUser() {
        when(authService.getUserByToken("mi-token-secreto")).thenReturn(usuarioValido);

        ExportacionZip zipPropio = new ExportacionZip();
        zipPropio.setUsuario(usuarioValido); // Mismo usuario de la sesión
        zipPropio.setNombreArchivo("mi_archivo.zip");
        // Apuntamos temporalmente a una ruta simulada
        zipPropio.setRutaArchivo(System.getProperty("java.io.tmpdir") + java.io.File.separator + "temp.zip");

        when(fileService.getZipById(50L)).thenReturn(zipPropio);

        try (MockedStatic<Response> mockedResponse = Mockito.mockStatic(Response.class)) {
            Response.ResponseBuilder builder = mock(Response.ResponseBuilder.class);
            Response mockRes = mock(Response.class);

            mockedResponse.when(() -> Response.ok(any(java.io.File.class))).thenReturn(builder);
            when(builder.header(anyString(), any())).thenReturn(builder);
            when(builder.build()).thenReturn(mockRes);
            when(mockRes.getStatus()).thenReturn(200);

            Response response = fileResource.downloadZip(tokenValido, 50L);

            assertEquals(200, response.getStatus());
        }
    }
}