
package com.anticithera.backend.config;

import jakarta.ws.rs.OPTIONS;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;

@Path("{path : .*}")
public class OptionsResource {

    @OPTIONS
    public Response options() {
        return Response.ok().build();
    }
}