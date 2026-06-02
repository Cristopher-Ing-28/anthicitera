package com.anticithera.backend.config;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorsFilterTest {

    @InjectMocks
    private CorsFilter corsFilter;

    @Mock
    private ContainerRequestContext requestContext;

    @Mock
    private ContainerResponseContext responseContext;

    @Test
    void testFilter_AllowedOrigin() throws IOException {
        String origin = "https://cristopher-ing-28.github.io";
        when(requestContext.getHeaderString("Origin")).thenReturn(origin);
        
        MultivaluedMap<String, Object> headers = new MultivaluedHashMap<>();
        when(responseContext.getHeaders()).thenReturn(headers);

        corsFilter.filter(requestContext, responseContext);

        assertEquals(origin, headers.getFirst("Access-Control-Allow-Origin"));
        assertEquals("true", headers.getFirst("Access-Control-Allow-Credentials"));
    }

    @Test
    void testFilter_DisallowedOrigin() throws IOException {
        when(requestContext.getHeaderString("Origin")).thenReturn("http://malicious.com");
        
        corsFilter.filter(requestContext, responseContext);

        verify(responseContext, never()).getHeaders();
    }
}
