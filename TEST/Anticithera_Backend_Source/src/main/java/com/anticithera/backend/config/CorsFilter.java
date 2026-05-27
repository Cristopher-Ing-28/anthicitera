package com.anticithera.backend.config;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Provider
public class CorsFilter implements ContainerResponseFilter {

    // Orígenes permitidos
    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://cristopher-ing-28.github.io"
    );

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) throws IOException {
        String origin = requestContext.getHeaderString("Origin");
        
        // Verificar si el origen está permitido
        if (origin != null && isOriginAllowed(origin)) {
            responseContext.getHeaders().putSingle("Access-Control-Allow-Origin", origin);
            responseContext.getHeaders().putSingle("Access-Control-Allow-Credentials", "true");
            responseContext.getHeaders().putSingle("Access-Control-Allow-Headers", "origin, content-type, accept, authorization, x-requested-with");
            responseContext.getHeaders().putSingle("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
        }
    }

    /**
     * Verifica si el origen está en la lista de orígenes permitidos
     */
    private boolean isOriginAllowed(String origin) {
        return ALLOWED_ORIGINS.stream()
                .anyMatch(allowed -> origin.equals(allowed) || origin.startsWith(allowed));
    }
}
