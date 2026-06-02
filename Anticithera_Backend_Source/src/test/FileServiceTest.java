package com.anticithera.backend.service;

import com.anticithera.backend.entity.ExportacionZip;
import com.anticithera.backend.entity.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private TypedQuery<ExportacionZip> mockQuery;

    @InjectMocks
    private FileService fileService;

    private Usuario testUser;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setUsername("testuser");
    }

    @Test
    void testSaveZip_Success() throws Exception {
        // Crear un directorio temporal para la prueba
        Path tempDir = Files.createTempDirectory("uploads_test");
        String uploadPath = tempDir.toString() + File.separator;
        
        // Usar reflexión para inyectar el directorio temporal si es necesario, 
        // o simplemente confiar en que el código creará el directorio si no existe.
        // En este caso, el código usa "/home/ubuntu/anticithera_uploads/"
        
        InputStream inputStream = new ByteArrayInputStream("test content".getBytes());
        String fileName = "test.zip";

        ExportacionZip result = fileService.saveZip(testUser, fileName, inputStream);

        assertNotNull(result);
        assertEquals(fileName, result.getNombreArchivo());
        assertEquals(testUser, result.getUsuario());
        verify(em).persist(any(ExportacionZip.class));
    }

    @Test
    void testGetUserZips() {
        when(em.createQuery(anyString(), eq(ExportacionZip.class))).thenReturn(mockQuery);
        when(mockQuery.setParameter(eq("user"), any())).thenReturn(mockQuery);
        
        List<ExportacionZip> mockList = Arrays.asList(new ExportacionZip(), new ExportacionZip());
        when(mockQuery.getResultList()).thenReturn(mockList);

        List<ExportacionZip> result = fileService.getUserZips(testUser);

        assertEquals(2, result.size());
    }

    @Test
    void testGetZipById() {
        ExportacionZip mockZip = new ExportacionZip();
        when(em.find(ExportacionZip.class, 1L)).thenReturn(mockZip);

        ExportacionZip result = fileService.getZipById(1L);

        assertNotNull(result);
        assertEquals(mockZip, result);
    }
}
