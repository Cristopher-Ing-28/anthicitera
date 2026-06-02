package com.anticithera.backend.entity;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class EntityTest {

    @Test
    void testSesionActividad() {
        SesionActividad sesion = new SesionActividad();
        LocalDateTime now = LocalDateTime.now();
        Usuario user = new Usuario();
        
        sesion.setId(1L);
        sesion.setUsuario(user);
        sesion.setTokenSesion("token");
        sesion.setInicioConexion(now);
        sesion.setFinConexion(now);
        
        assertEquals(1L, sesion.getId());
        assertEquals(user, sesion.getUsuario());
        assertEquals("token", sesion.getTokenSesion());
        assertEquals(now, sesion.getInicioConexion());
        assertEquals(now, sesion.getFinConexion());
    }

    @Test
    void testExportacionZip() {
        ExportacionZip export = new ExportacionZip();
        LocalDateTime now = LocalDateTime.now();
        Usuario user = new Usuario();
        
        export.setId(1L);
        export.setUsuario(user);
        export.setNombreArchivo("file.zip");
        export.setRutaArchivo("/path/to/file");
        export.setFechaCreacion(now);
        
        assertEquals(1L, export.getId());
        assertEquals(user, export.getUsuario());
        assertEquals("file.zip", export.getNombreArchivo());
        assertEquals("/path/to/file", export.getRutaArchivo());
        assertEquals(now, export.getFechaCreacion());
    }
}
