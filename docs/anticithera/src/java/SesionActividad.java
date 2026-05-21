import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sesiones_actividad")
public class SesionActividad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", referencedColumnName = "id")
    private Usuario usuario;

    @Column(name = "token_sesion", nullable = false, unique = true, length = 255)
    private String tokenSesion;

    @Column(name = "inicio_conexion", insertable = false, updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime inicioConexion;

    @Column(name = "fin_conexion")
    private LocalDateTime finConexion;

    @Column(name = "duracion_segundos")
    private Integer duracionSegundos;

    // Constructores
    public SesionActividad() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getTokenSesion() {
        return tokenSesion;
    }

    public void setTokenSesion(String tokenSesion) {
        this.tokenSesion = tokenSesion;
    }

    public LocalDateTime getInicioConexion() {
        return inicioConexion;
    }

    public void setInicioConexion(LocalDateTime inicioConexion) {
        this.inicioConexion = inicioConexion;
    }

    public LocalDateTime getFinConexion() {
        return finConexion;
    }

    public void setFinConexion(LocalDateTime finConexion) {
        this.finConexion = finConexion;
    }

    public Integer getDuracionSegundos() {
        return duracionSegundos;
    }

    public void setDuracionSegundos(Integer duracionSegundos) {
        this.duracionSegundos = duracionSegundos;
    }
}
