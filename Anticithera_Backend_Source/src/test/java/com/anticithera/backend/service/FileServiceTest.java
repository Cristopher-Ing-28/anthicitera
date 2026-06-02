package com.anticithera.backend.service;

import com.anticithera.backend.entity.ExportacionZip;
import com.anticithera.backend.entity.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private EntityManager em;

    @Mock
    private TypedQuery<ExportacionZip> query;

    @InjectMocks
    private FileService fileService;

    private Usuario usuario;
    private File archivoCreado;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(1L);
        usuario.setUsername("usuarioPrueba");
    }

    @AfterEach
    void tearDown() {
        // Limpieza: Borramos el archivo creado por el test para no dejar basura en tu carpeta C:\Users\...
        if (archivoCreado != null && archivoCreado.exists()) {
            archivoCreado.delete();
        }
    }

    @Test
    void saveZip_Success() throws Exception {
        String fileName = "datos_test.zip";
        InputStream inputStream = new ByteArrayInputStream("contenido-falso-zip".getBytes());

        // Ejecutamos el método que ahora guarda en la ruta dinámica de Windows
        ExportacionZip resultado = fileService.saveZip(usuario, fileName, inputStream);

        // Validaciones
        assertNotNull(resultado);
        assertEquals(fileName, resultado.getNombreArchivo());
        assertEquals(usuario, resultado.getUsuario());
        assertNotNull(resultado.getRutaArchivo());

        // Guardamos referencia para el borrado en tearDown()
        archivoCreado = new File(resultado.getRutaArchivo());
        assertTrue(archivoCreado.exists(), "El archivo físico debería haberse creado en Windows.");

        verify(em, times(1)).persist(any(ExportacionZip.class));
    }

    @Test
    void getUserZips_Success() {
        when(em.createQuery(any(String.class), eq(ExportacionZip.class))).thenReturn(query);
        when(query.setParameter("user", usuario)).thenReturn(query);
        when(query.getResultList()).thenReturn(Collections.singletonList(new ExportacionZip()));

        List<ExportacionZip> zips = fileService.getUserZips(usuario);

        assertNotNull(zips);
        assertEquals(1, zips.size());
    }
}