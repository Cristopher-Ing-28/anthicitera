import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;

@Path("/libreria")
public class LibreriaResource {

    @PersistenceContext
    private EntityManager em;

    // Carpeta en el servidor web donde se guardarán físicamente los ZIPs
    private static final String BACKUP_DIR = "/var/backups/anticithera/";

    @POST
    @Path("/exportar/{userEmail}")
    @Consumes("application/zip")
    @Transactional
    public Response recibirZipLibreria(@PathParam("userEmail") String userEmail, InputStream zipStream) {
        try {
            Files.createDirectories(Paths.get(BACKUP_DIR));
            
            // Se nombra el archivo usando el email para evitar colisiones
            String rutaFisica = BACKUP_DIR + "backup_" + userEmail.replace("@", "_").replace(".", "_") + ".zip";
            File archivoDestino = new File(rutaFisica);

            // Guardar físicamente
            try (OutputStream out = new FileOutputStream(archivoDestino)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = zipStream.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
            }

            // Actualizar o crear registro en MariaDB
            LibreriaUsuario registro = em.createQuery("SELECT l FROM LibreriaUsuario l WHERE l.userEmail = :email", LibreriaUsuario.class)
                    .setParameter("email", userEmail)
                    .getResultStream()
                    .findFirst()
                    .orElse(new LibreriaUsuario());

            registro.setUserEmail(userEmail);
            registro.setRutaArchivo(rutaFisica);
            registro.setFechaRespaldo(LocalDateTime.now());

            if (registro.getId() == null) em.persist(registro);
            else em.merge(registro);

            return Response.ok("Respaldo sincronizado en la nube").build();

        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity("Error interno al procesar el respaldo").build();
        }
    }

    @GET
    @Path("/importar/{userEmail}")
    @Produces("application/zip")
    public Response enviarZipLibreria(@PathParam("userEmail") String userEmail) {
        try {
            LibreriaUsuario registro = em.createQuery("SELECT l FROM LibreriaUsuario l WHERE l.userEmail = :email", LibreriaUsuario.class)
                    .setParameter("email", userEmail)
                    .getResultStream()
                    .findFirst()
                    .orElse(null);

            if (registro == null) {
                return Response.status(Response.Status.NOT_FOUND).entity("No hay librerías guardadas").build();
            }

            File archivoZip = new File(registro.getRutaArchivo());
            if (!archivoZip.exists()) {
                return Response.status(Response.Status.NOT_FOUND).entity("El archivo físico fue eliminado").build();
            }

            return Response.ok(archivoZip)
                    .header("Content-Disposition", "attachment; filename=\"anticithera_nube.zip\"")
                    .build();

        } catch (Exception e) {
            return Response.serverError().build();
        }
    }
}
