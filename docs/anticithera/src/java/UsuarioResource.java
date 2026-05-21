import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Path("/auth")
public class UsuarioResource {

    @PersistenceContext
    private EntityManager em;

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response registrarUsuario(String body) {
        try {
            String username = parseJsonField(body, "username");
            String email = parseJsonField(body, "email");
            String password = parseJsonField(body, "password");

            if (username == null || email == null || password == null || 
                username.trim().isEmpty() || email.trim().isEmpty() || password.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"Todos los campos (username, email, password) son requeridos\"}")
                        .build();
            }

            // Verificar si el usuario o email ya existe
            Long count = em.createQuery("SELECT COUNT(u) FROM Usuario u WHERE u.username = :username OR u.email = :email", Long.class)
                    .setParameter("username", username)
                    .setParameter("email", email)
                    .getSingleResult();

            if (count > 0) {
                return Response.status(Response.Status.CONFLICT)
                        .entity("{\"error\":\"El nombre de usuario o el correo electrónico ya se encuentra registrado\"}")
                        .build();
            }

            // Crear el nuevo usuario
            Usuario usuario = new Usuario();
            usuario.setUsername(username);
            usuario.setEmail(email);
            usuario.setPasswordHash(HashUtil.hashPassword(password));
            em.persist(usuario);

            // Iniciar sesión automáticamente después del registro
            String token = UUID.randomUUID().toString();
            SesionActividad sesion = new SesionActividad();
            sesion.setUsuario(usuario);
            sesion.setTokenSesion(token);
            LocalDateTime ahora = LocalDateTime.now();
            sesion.setInicioConexion(ahora);
            em.persist(sesion);

            // Responder con los datos de sesión (token, username, email, startTime)
            String jsonResponse = String.format(
                    "{\"token\":\"%s\",\"username\":\"%s\",\"email\":\"%s\",\"startTime\":\"%s\"}",
                    token, usuario.getUsername(), usuario.getEmail(), ahora.toString()
            );

            return Response.status(Response.Status.CREATED).entity(jsonResponse).build();

        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity("{\"error\":\"Error interno del servidor al registrar el usuario\"}").build();
        }
    }

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response iniciarSesion(String body) {
        try {
            String loginInput = parseJsonField(body, "username"); // Puede ser username o email
            String password = parseJsonField(body, "password");

            if (loginInput == null || password == null || loginInput.trim().isEmpty() || password.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"Usuario y contraseña son requeridos\"}")
                        .build();
            }

            // Buscar usuario por username o email
            Usuario usuario = em.createQuery("SELECT u FROM Usuario u WHERE u.username = :input OR u.email = :input", Usuario.class)
                    .setParameter("input", loginInput)
                    .getResultStream()
                    .findFirst()
                    .orElse(null);

            if (usuario == null || !usuario.getPasswordHash().equals(HashUtil.hashPassword(password))) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Credenciales incorrectas\"}")
                        .build();
            }

            // Crear una nueva sesión
            String token = UUID.randomUUID().toString();
            SesionActividad sesion = new SesionActividad();
            sesion.setUsuario(usuario);
            sesion.setTokenSesion(token);
            LocalDateTime ahora = LocalDateTime.now();
            sesion.setInicioConexion(ahora);
            em.persist(sesion);

            // Responder con los datos de sesión (token, username, email, startTime)
            String jsonResponse = String.format(
                    "{\"token\":\"%s\",\"username\":\"%s\",\"email\":\"%s\",\"startTime\":\"%s\"}",
                    token, usuario.getUsername(), usuario.getEmail(), ahora.toString()
            );

            return Response.ok(jsonResponse).build();

        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity("{\"error\":\"Error interno del servidor al iniciar sesión\"}").build();
        }
    }

    @POST
    @Path("/logout")
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response cerrarSesion(@HeaderParam("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"Token de autorización Bearer ausente o inválido\"}")
                        .build();
            }

            String token = authHeader.substring(7).trim();

            SesionActividad sesion = em.createQuery("SELECT s FROM SesionActividad s WHERE s.tokenSesion = :token", SesionActividad.class)
                    .setParameter("token", token)
                    .getResultStream()
                    .findFirst()
                    .orElse(null);

            if (sesion == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"La sesión especificada no fue encontrada\"}")
                        .build();
            }

            if (sesion.getFinConexion() == null) {
                LocalDateTime ahora = LocalDateTime.now();
                sesion.setFinConexion(ahora);
                
                long segundos = Duration.between(sesion.getInicioConexion(), ahora).getSeconds();
                sesion.setDuracionSegundos((int) segundos);
                
                em.merge(sesion);
            }

            return Response.ok("{\"message\":\"Sesión cerrada exitosamente\"}").build();

        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity("{\"error\":\"Error interno del servidor al cerrar la sesión\"}").build();
        }
    }

    // Utilidad simple para parsear campos JSON planos sin añadir librerías externas
    private String parseJsonField(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + field + "\":\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}
