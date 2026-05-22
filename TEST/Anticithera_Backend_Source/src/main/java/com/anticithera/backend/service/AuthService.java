package com.anticithera.backend.service;

import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.entity.SesionActividad;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.mindrot.jbcrypt.BCrypt;
import java.time.LocalDateTime;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    @PersistenceContext
    private EntityManager em;

    @Transactional
    public Usuario register(String username, String email, String password) {
        Usuario user = new Usuario();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        user.setCreatedAt(LocalDateTime.now());
        em.persist(user);
        return user;
    }

    @Transactional
    public String login(String username, String password) {
        try {
            Usuario user = em.createQuery("SELECT u FROM Usuario u WHERE u.username = :username", Usuario.class)
                    .setParameter("username", username)
                    .getSingleResult();

            if (BCrypt.checkpw(password, user.getPasswordHash())) {
                String token = UUID.randomUUID().toString();
                SesionActividad sesion = new SesionActividad();
                sesion.setUsuario(user);
                sesion.setTokenSesion(token);
                sesion.setInicioConexion(LocalDateTime.now());
                em.persist(sesion);
                return token;
            }
        } catch (Exception e) {
            // Usuario no encontrado o error
        }
        return null;
    }

    @Transactional
    public void logout(String token) {
        try {
            SesionActividad sesion = em.createQuery("SELECT s FROM SesionActividad s WHERE s.tokenSesion = :token", SesionActividad.class)
                    .setParameter("token", token)
                    .getSingleResult();
            
            sesion.setFinConexion(LocalDateTime.now());
            // Calcular duración si es necesario
            em.merge(sesion);
        } catch (Exception e) {
            // Sesión no encontrada
        }
    }
    
    public Usuario getUserByToken(String token) {
        try {
            return em.createQuery("SELECT s.usuario FROM SesionActividad s WHERE s.tokenSesion = :token AND s.finConexion IS NULL", Usuario.class)
                    .setParameter("token", token)
                    .getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }
}
