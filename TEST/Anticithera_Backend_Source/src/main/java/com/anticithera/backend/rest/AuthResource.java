package com.anticithera.backend.rest;

import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    private AuthService authService;

    @POST
    @Path("/register")
    public Response register(Map<String, String> credentials) {
        String username = credentials.get("username");
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (username == null || email == null || password == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Faltan datos").build();
        }

        try {
            Usuario user = authService.register(username, email, password);
            // Auto login después de registro
            String token = authService.login(username, password);
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            return Response.ok(response).build();
        } catch (Exception e) {
            return Response.status(Response.Status.CONFLICT).entity("Usuario o email ya existe").build();
        }
    }

    @POST
    @Path("/login")
    public Response login(Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        String token = authService.login(username, password);
        if (token != null) {
            Usuario user = authService.getUserByToken(token);
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            return Response.ok(response).build();
        } else {
            return Response.status(Response.Status.UNAUTHORIZED).entity("Credenciales inválidas").build();
        }
    }

    @POST
    @Path("/logout")
    public Response logout(@HeaderParam("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
            return Response.ok().build();
        }
        return Response.status(Response.Status.BAD_REQUEST).build();
    }
}
