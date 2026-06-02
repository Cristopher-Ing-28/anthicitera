package com.anticithera.backend.service;

import com.anticithera.backend.entity.ExportacionZip;
import com.anticithera.backend.entity.Usuario;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class FileService {

    @PersistenceContext
    private EntityManager em;

    private static final String UPLOAD_DIR = System.getProperty("user.home") 
        + java.io.File.separator 
        + "anticithera_uploads" 
        + java.io.File.separator;

    @Transactional
    public ExportacionZip saveZip(Usuario user, String fileName, InputStream inputStream) throws Exception {
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) uploadDir.mkdirs();

        String filePath = UPLOAD_DIR + user.getId() + "_" + System.currentTimeMillis() + "_" + fileName;
        try (FileOutputStream outputStream = new FileOutputStream(filePath)) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }

        ExportacionZip export = new ExportacionZip();
        export.setUsuario(user);
        export.setNombreArchivo(fileName);
        export.setRutaArchivo(filePath);
        export.setFechaCreacion(LocalDateTime.now());
        em.persist(export);
        return export;
    }

    public List<ExportacionZip> getUserZips(Usuario user) {
        return em.createQuery("SELECT e FROM ExportacionZip e WHERE e.usuario = :user ORDER BY e.fechaCreacion DESC", ExportacionZip.class)
                .setParameter("user", user)
                .getResultList();
    }
    
    public ExportacionZip getZipById(Long id) {
        return em.find(ExportacionZip.class, id);
    }
}
