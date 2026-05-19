import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "librerias_usuarios")
public class LibreriaUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Vinculamos usando el email de tu userSession
    @Column(name = "user_email", nullable = false, unique = true)
    private String userEmail;

    @Column(name = "ruta_archivo", nullable = false)
    private String rutaArchivo;

    @Column(name = "fecha_respaldo")
    private LocalDateTime fechaRespaldo;

    // Constructores vacíos y Getters/Setters
    public LibreriaUsuario() {}

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getRutaArchivo() { return rutaArchivo; }
    public void setRutaArchivo(String rutaArchivo) { this.rutaArchivo = rutaArchivo; }
    public LocalDateTime getFechaRespaldo() { return fechaRespaldo; }
    public void setFechaRespaldo(LocalDateTime fechaRespaldo) { this.fechaRespaldo = fechaRespaldo; }
}