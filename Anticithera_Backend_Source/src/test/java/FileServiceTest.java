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
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
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
    private Path tempUploadDir;

    @BeforeEach
    void setUp() throws IOException {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        // Crear un directorio temporal para las pruebas de archivo
        tempUploadDir = Files.createTempDirectory("anticithera_uploads_test");
        // Usar reflexión para cambiar el campo UPLOAD_DIR en FileService
        try {
            java.lang.reflect.Field field = FileService.class.getDeclaredField("UPLOAD_DIR");
            field.setAccessible(true);
            field.set(null, tempUploadDir.toString() + File.separator);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            e.printStackTrace();
        }
    }

    // No hay @AfterEach para limpiar el directorio temporal porque el sandbox se reinicia
    // y los archivos temporales se eliminarán automáticamente.

    @Test
    void testSaveZip_success() throws Exception {
        String fileName = "test.zip";
        InputStream inputStream = new ByteArrayInputStream("zip content".getBytes());

        ExportacionZip result = fileService.saveZip(testUser, fileName, inputStream);

        assertNotNull(result);
        assertEquals(testUser, result.getUsuario());
        assertEquals(fileName, result.getNombreArchivo());
        assertTrue(result.getRutaArchivo().startsWith(tempUploadDir.toString()));
        assertNotNull(result.getFechaCreacion());

        verify(em, times(1)).persist(any(ExportacionZip.class));

        // Verificar que el archivo fue creado en el directorio temporal
        File savedFile = new File(result.getRutaArchivo());
        assertTrue(savedFile.exists());
        assertTrue(savedFile.isFile());
        assertEquals("zip content", Files.readString(savedFile.toPath()));
    }

    @Test
    void testGetUserZips_success() {
        ExportacionZip zip1 = new ExportacionZip();
        zip1.setId(1L);
        zip1.setUsuario(testUser);
        zip1.setNombreArchivo("file1.zip");
        zip1.setFechaCreacion(LocalDateTime.now().minusDays(1));

        ExportacionZip zip2 = new ExportacionZip();
        zip2.setId(2L);
        zip2.setUsuario(testUser);
        zip2.setNombreArchivo("file2.zip");
        zip2.setFechaCreacion(LocalDateTime.now());

        List<ExportacionZip> expectedZips = Arrays.asList(zip2, zip1); // Ordenado por fecha de creación descendente

        when(em.createQuery(anyString(), eq(ExportacionZip.class))).thenReturn(mockQuery);
        when(mockQuery.setParameter("user", testUser)).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(expectedZips);

        List<ExportacionZip> actualZips = fileService.getUserZips(testUser);

        assertNotNull(actualZips);
        assertEquals(2, actualZips.size());
        assertEquals(expectedZips, actualZips);
        verify(em, times(1)).createQuery(anyString(), eq(ExportacionZip.class));
        verify(mockQuery, times(1)).setParameter("user", testUser);
        verify(mockQuery, times(1)).getResultList();
    }

    @Test
    void testGetZipById_success() {
        ExportacionZip expectedZip = new ExportacionZip();
        expectedZip.setId(1L);
        expectedZip.setNombreArchivo("single.zip");

        when(em.find(ExportacionZip.class, 1L)).thenReturn(expectedZip);

        ExportacionZip actualZip = fileService.getZipById(1L);

        assertNotNull(actualZip);
        assertEquals(expectedZip, actualZip);
        verify(em, times(1)).find(ExportacionZip.class, 1L);
    }

    @Test
    void testGetZipById_notFound() {
        when(em.find(ExportacionZip.class, 99L)).thenReturn(null);

        ExportacionZip actualZip = fileService.getZipById(99L);

        assertNull(actualZip);
        verify(em, times(1)).find(ExportacionZip.class, 99L);
    }
}
