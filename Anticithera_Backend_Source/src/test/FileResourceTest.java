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
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileResourceTest {

    @Mock
    private AuthService authService;

    @Mock
    private FileService fileService;

    @InjectMocks
    private FileResource fileResource;

    private Usuario mockUser;
    private String authHeader = "Bearer mock-token";

    @BeforeEach
    void setUp() {
        mockUser = new Usuario();
        mockUser.setId(1L);
        mockUser.setUsername("testuser");
    }

    @Test
    void testUploadZip_Success() throws Exception {
        when(authService.getUserByToken("mock-token")).thenReturn(mockUser);
        
        ExportacionZip mockExport = new ExportacionZip();
        mockExport.setNombreArchivo("test.zip");
        
        InputStream inputStream = new ByteArrayInputStream("content".getBytes());
        when(fileService.saveZip(eq(mockUser), eq("test.zip"), any(InputStream.class))).thenReturn(mockExport);

        Response response = fileResource.uploadZip(authHeader, "test.zip", inputStream);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        assertEquals(mockExport, response.getEntity());
    }

    @Test
    void testUploadZip_Unauthorized() {
        when(authService.getUserByToken("mock-token")).thenReturn(null);

        Response response = fileResource.uploadZip(authHeader, "test.zip", null);

        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), response.getStatus());
    }

    @Test
    void testListZips_Success() {
        when(authService.getUserByToken("mock-token")).thenReturn(mockUser);
        
        List<ExportacionZip> zips = new ArrayList<>();
        ExportacionZip zip = new ExportacionZip();
        zip.setId(1L);
        zip.setNombreArchivo("test.zip");
        zip.setFechaCreacion(LocalDateTime.now());
        zips.add(zip);
        
        when(fileService.getUserZips(mockUser)).thenReturn(zips);

        Response response = fileResource.listZips(authHeader);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        List<Map<String, Object>> entity = (List<Map<String, Object>>) response.getEntity();
        assertEquals(1, entity.size());
        assertEquals("test.zip", entity.get(0).get("nombreArchivo"));
    }

    @Test
    void testDownloadZip_NotFound() {
        when(authService.getUserByToken("mock-token")).thenReturn(mockUser);
        when(fileService.getZipById(1L)).thenReturn(null);

        Response response = fileResource.downloadZip(authHeader, 1L);

        assertEquals(Response.Status.NOT_FOUND.getStatusCode(), response.getStatus());
    }

    @Test
    void testDownloadZip_Forbidden() {
        Usuario otherUser = new Usuario();
        otherUser.setId(2L);
        
        when(authService.getUserByToken("mock-token")).thenReturn(mockUser);
        
        ExportacionZip zip = new ExportacionZip();
        zip.setUsuario(otherUser);
        when(fileService.getZipById(1L)).thenReturn(zip);

        Response response = fileResource.downloadZip(authHeader, 1L);

        assertEquals(Response.Status.NOT_FOUND.getStatusCode(), response.getStatus());
    }
}
