async function exportarLibreriaAZip() {
    // Validar que la base de datos esté lista llamando directamente a la variable global 'db'
    if (typeof db === 'undefined' || !db) {
        showToast(t("toast_db_not_ready"));
        return;
    }

    showToast(t("toast_prep_export"));

    try {
        const zip = new JSZip();
        
        // Estructura del JSON de detalles
        const jsonDetalles = {
            nombre_libreria: window.selectedLibraryName || "Sin_Nombre",
            tipo_documento: window.selectedDocType || "Sin_Tipo",
            fecha_exportacion: new Date().toISOString(),
            total_recursos_binarios: 0,
            total_notas_fichas: 0,
            elementos: []
        };

        const carpetaLibreria = zip.folder("Archivos_Libreria");
        const carpetaNotas = zip.folder("Bloc_de_Notas_y_Fichas");

        // 1. Extraer todos los Recursos (PDFs, Office, Notebooks)
        const recursos = await obtenerTodosDeIndexedDB('resources');
        
        recursos.forEach(res => {
            if (res.blob) {
                // Si tiene un archivo real (blob), lo agregamos a la carpeta
                carpetaLibreria.file(res.name, res.blob);
            }
            
            // Agregamos el registro al JSON
            jsonDetalles.elementos.push({
                id: res.id,
                tipo_registro: 'recurso',
                formato: res.type,
                nombre: res.name,
                fecha_creacion: res.createdAt || res.date
            });
            jsonDetalles.total_recursos_binarios++;
        });

        // 2. Extraer todas las Notas y Fichas
        const notas = await obtenerTodosDeIndexedDB('notes');
        
        notas.forEach(nota => {
            // Limpiamos el título para que sea un nombre de archivo válido
            const nombreSeguro = (nota.title || 'Sin_Titulo').replace(/[^a-záéíóúñ0-9]/gi, '_').substring(0, 50);
            const contenidoMd = `# ${nota.title}\n\n${nota.content}`;
            
            // Guardamos las notas como archivos Markdown (.md)
            carpetaNotas.file(`${nombreSeguro}.md`, contenidoMd);

            jsonDetalles.elementos.push({
                id: nota.id,
                tipo_registro: 'nota',
                formato: nota.type || 'nota estandar',
                nombre: nota.title,
                fecha_actualizacion: nota.updatedAt
            });
            jsonDetalles.total_notas_fichas++;
        });

        // 3. Crear el archivo JSON de metadatos y agregarlo a la raíz del ZIP
        zip.file("detalles_exportacion.json", JSON.stringify(jsonDetalles, null, 4));

        // 4. Generar el archivo ZIP y forzar su descarga
        const contenidoZip = await zip.generateAsync({ type: "blob" });
        
        const libName = (window.selectedLibraryName || "Anticithera").replace(/[^a-z0-9]/gi, '_');
        const docType = (window.selectedDocType || "Export").replace(/[^a-z0-9]/gi, '_');
        const nombreZip = `${libName}_${docType}_${new Date().getTime()}.zip`;
        saveAs(contenidoZip, nombreZip);

        // Subir al servidor si hay sesión activa
        if (typeof userSession !== 'undefined' && userSession && userSession.token) {
            showToast(t("toast_uploading_backup"));
            const formData = new FormData();
            formData.append('file', contenidoZip);

            try {
                const response = await fetch(`${API_BASE_URL}/files/upload?fileName=${encodeURIComponent(nombreZip)}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userSession.token}`
                    },
                    body: contenidoZip // Enviamos el blob directamente
                });

                if (response.ok) {
                    showToast(t("toast_backup_saved"));
                } else {
                    console.error("Error al subir el ZIP");
                }
            } catch (err) {
                console.error("Error de red al subir ZIP:", err);
            }
        }

        showToast(t("toast_export_success"));

    } catch (error) {
        console.error("Error crítico durante la exportación:", error);
        showToast(t("toast_export_error"));
    }
}

// Función auxiliar usando la variable db directamente
function obtenerTodosDeIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}



async function menuImportarZip() {
    // Le damos al usuario la opción de pegar una URL o dejarlo en blanco para archivo local
    const url = prompt(t("prompt_restore_zip"));

    if (url !== null && url.trim() !== "") {
        // Opción A: Descargar y restaurar desde URL (Ej. GitHub)
        try {
            showToast(t("toast_downloading_zip"));
            const response = await fetch(url);
            if (!response.ok) throw new Error("No se pudo acceder a la URL");
            const blob = await response.blob();
            procesarZipRestauracion(blob);
        } catch (error) {
            console.error(error);
            showToast(t("toast_network_error_zip"));
        }
    } else if (url !== null) {
        // Opción B: Listar archivos del servidor si hay sesión, o abrir local
        if (typeof userSession !== 'undefined' && userSession && userSession.token) {
            try {
                showToast(t("toast_querying_backups"));
                const response = await fetch(`${API_BASE_URL}/files/list`, {
                    headers: { 'Authorization': `Bearer ${userSession.token}` }
                });
                const zips = await response.json();

                if (zips.length > 0) {
                    let mensaje = t("prompt_backups_list");
                    zips.forEach((z, i) => {
                        mensaje += `${i + 1}. ${z.nombreArchivo} (${z.fechaCreacion})\n`;
                    });
                    mensaje += t("prompt_backups_list_local_opt");

                    const seleccion = prompt(mensaje);
                    if (seleccion && seleccion.toUpperCase() === 'L') {
                        document.getElementById('zipUploadInput').click();
                    } else if (seleccion && !isNaN(seleccion) && zips[seleccion - 1]) {
                        const zipId = zips[seleccion - 1].id;
                        showToast(t("toast_downloading_backup"));
                        const dlResp = await fetch(`${API_BASE_URL}/files/download/${zipId}`, {
                            headers: { 'Authorization': `Bearer ${userSession.token}` }
                        });
                        const blob = await dlResp.blob();
                        procesarZipRestauracion(blob);
                    }
                } else {
                    showToast(t("toast_no_backups"));
                    document.getElementById('zipUploadInput').click();
                }
            } catch (err) {
                console.error("Error al listar ZIPs:", err);
                document.getElementById('zipUploadInput').click();
            }
        } else {
            document.getElementById('zipUploadInput').click();
        }
    }
}

// Función puente para el input de archivo local
function manejarArchivoZipLocal(event) {
    const file = event.target.files[0];
    if (!file) return;
    procesarZipRestauracion(file);
    event.target.value = ''; // Reseteamos el input
}

// El motor principal de descompresión e indexación
async function procesarZipRestauracion(blobZip) {
    if (typeof db === 'undefined' || !db) {
        showToast(t("toast_db_not_ready"));
        return;
    }

    showToast(t("toast_restoring"));

    try {
        const zip = await JSZip.loadAsync(blobZip);

        // 1. Verificar el formato de Anticithera
        const archivoDetalles = zip.file("detalles_exportacion.json");
        if (!archivoDetalles) {
            showToast(t("toast_zip_invalid_format"));
            return;
        }

        const detallesStr = await archivoDetalles.async("string");
        const detalles = JSON.parse(detallesStr);

        let elementosRestaurados = 0;

        // 2. Iterar sobre el mapa JSON y recuperar elementos
        for (const item of detalles.elementos) {
            if (item.tipo_registro === 'recurso') {
                const fileObj = zip.file(`Archivos_Libreria/${item.nombre}`);
                if (fileObj) {
                    // Esperamos a que se extraiga el archivo...
                    const fileBlob = await fileObj.async("blob");
                    const mimeType = fileBlob.type || 'application/octet-stream';
                    const realFile = new File([fileBlob], item.nombre, { type: mimeType });

                    // ¡LA SOLUCIÓN! Abrimos la base de datos DESPUÉS del await
                    const txRes = db.transaction(['resources', 'activity'], 'readwrite');
                    
                    txRes.objectStore('resources').put({
                        id: item.id || 'res_restored_' + Date.now() + Math.random(),
                        name: item.nombre,
                        type: item.formato || 'Recurso Restaurado',
                        date: item.fecha_creacion || new Date().toLocaleDateString(),
                        blob: realFile,
                        metadata: item.metadata || null,
                        createdAt: item.fecha_creacion || new Date().toISOString()
                    });

                    const justNowText = currentLanguage === 'es' ? 'Justo ahora' : 'Just now';
                    txRes.objectStore('activity').put({
                        id: Date.now() + Math.random(),
                        name: `Restaurado: ${item.nombre}`,
                        type: 'restore',
                        time: justNowText
                    });
                    elementosRestaurados++;
                }
            } else if (item.tipo_registro === 'nota') {
                const nombreSeguro = (item.nombre || 'Sin_Titulo').replace(/[^a-záéíóúñ0-9]/gi, '_').substring(0, 50);
                const fileObj = zip.file(`Bloc_de_Notas_y_Fichas/${nombreSeguro}.md`);

                let content = "";
                if (fileObj) {
                    // Esperamos a que se extraiga el texto...
                    const mdContent = await fileObj.async("string");
                    content = mdContent.replace(/^# .*\n\n/, '');
                }

                // ¡LA SOLUCIÓN! Abrimos la base de datos para las notas DESPUÉS del await
                const txNote = db.transaction('notes', 'readwrite');
                
                txNote.objectStore('notes').put({
                    id: item.id || 'note_restored_' + Date.now() + Math.random(),
                    title: item.nombre,
                    content: content,
                    type: item.formato || 'nota',
                    updatedAt: item.fecha_actualizacion || new Date().toISOString()
                });
                elementosRestaurados++;
            }
        }

        // 3. Refrescar la interfaz
        setTimeout(() => {
            if (typeof renderLibrary === 'function') renderLibrary();
            if (typeof loadActivity === 'function') loadActivity();
            if (typeof updateStats === 'function') updateStats();
            if (typeof renderNotesList === 'function') renderNotesList();

            showToast(t("toast_restoration_success").replace("{count}", elementosRestaurados));
            lucide.createIcons();
        }, 800);

    } catch (error) {
        console.error("Error crítico durante la restauración:", error);
        showToast(t("toast_decompress_error"));
    }
}