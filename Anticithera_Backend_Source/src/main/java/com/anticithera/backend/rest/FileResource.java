package com.anticithera.backend.rest;

import com.anticithera.backend.entity.ExportacionZip;
import com.anticithera.backend.entity.Usuario;
import com.anticithera.backend.service.AuthService;
import com.anticithera.backend.service.FileService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.File;
import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.Map;

@Path("/files")
public class FileResource {

    @Inject
    private AuthService authService;

    @Inject
    private FileService fileService;

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadZip(@HeaderParam("Authorization") String authHeader, 
                              @QueryParam("fileName") String fileName,
                              InputStream inputStream) {
        Usuario user = validateUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try {
            ExportacionZip export = fileService.saveZip(user, fileName, inputStream);
            return Response.ok(export).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/list")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listZips(@HeaderParam("Authorization") String authHeader) {
        Usuario user = validateUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        List<ExportacionZip> zips = fileService.getUserZips(user);
        List<Map<String, Object>> response = zips.stream().map(z -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", z.getId());
            map.put("nombreArchivo", z.getNombreArchivo());
            map.put("fechaCreacion", z.getFechaCreacion().toString());
            return map;
        }).collect(Collectors.toList());

        return Response.ok(response).build();
    }

    @GET
    @Path("/download/{id}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response downloadZip(@HeaderParam("Authorization") String authHeader, @PathParam("id") Long id) {
        Usuario user = validateUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        ExportacionZip export = fileService.getZipById(id);
        if (export == null || !export.getUsuario().getId().equals(user.getId())) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        File file = new File(export.getRutaArchivo());
        return Response.ok(file)
                .header("Content-Disposition", "attachment; filename=\"" + export.getNombreArchivo() + "\"")
                .build();
    }

    private Usuario validateUser(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authService.getUserByToken(authHeader.substring(7));
        }
        return null;
    }
}
