package com.anticithera.backend.config;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Provider
// 🚨 QUITAMOS @PreMatching para que actúe en el ciclo correcto del response
public class CorsFilter implements ContainerRequestFilter, ContainerResponseFilter {

    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://cristopher-ing-28.github.io"
    );

    // 1. Intercepta la petición (Request)
    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        // Si es una petición Preflight (OPTIONS), respondemos inmediatamente con 200 OK
        if (requestContext.getMethod().equalsIgnoreCase("OPTIONS")) {
            Response.ResponseBuilder builder = Response.ok();
            String origin = requestContext.getHeaderString("Origin");
            
            if (origin != null && isOriginAllowed(origin)) {
                builder.header("Access-Control-Allow-Origin", origin);
                builder.header("Access-Control-Allow-Credentials", "true");
                builder.header("Access-Control-Allow-Headers", "origin, content-type, accept, authorization, x-requested-with, ngrok-skip-browser-warning");
                builder.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
            }
            // Rompe el ciclo aquí y responde directo al navegador
            requestContext.abortWith(builder.build());
        }
    }

    // 2. Intercepta la respuesta (Response para GET, POST, etc.)
    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) throws IOException {
        String origin = requestContext.getHeaderString("Origin");
        
        if (origin != null && isOriginAllowed(origin)) {
            responseContext.getHeaders().putSingle("Access-Control-Allow-Origin", origin);
            responseContext.getHeaders().putSingle("Access-Control-Allow-Credentials", "true");
            responseContext.getHeaders().putSingle("Access-Control-Allow-Headers", "origin, content-type, accept, authorization, x-requested-with, ngrok-skip-browser-warning");
            responseContext.getHeaders().putSingle("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
        }
    }

    private boolean isOriginAllowed(String origin) {
        return ALLOWED_ORIGINS.stream()
                .anyMatch(allowed -> origin.equals(allowed) || origin.startsWith(allowed));
    }
}