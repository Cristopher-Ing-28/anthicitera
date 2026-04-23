// --- CONFIGURACIÓN GOOGLE DRIVE ---
        // Reemplaza esto con las claves de Google Cloud
        const API_KEY = 'AIzaSyB-kK6HqEFlEWYzk5yZvG4m2pqcMWqJMNw';
        const CLIENT_ID = '404597250756-sjq7tuf12qd4h9d588ee2drif1sq1o9m.apps.googleusercontent.com';
        const APP_ID = '404597250756'; 
        const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'; 

        let tokenClient;
        let accessToken = null;
        let pickerApiLoaded = false;

        // --- CONFIGURACIÓN PDF.JS ---
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

        let db;
        let currentNoteId = null;
        let pdfDoc = null;
        let pageNum = 1;
        let scale = 1.3;
        let rotation = 0;
        let selectedText = "";
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const textLayerDiv = document.getElementById('text-layer');
        const fab = document.getElementById('selectionFAB');
        const floatingBtn = fab; // Compatibilidad heredada

        // --- INICIALIZACIÓN DE LIBRERÍAS DE GOOGLE DRIVE ---
        window.addEventListener('load', () => {
            if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                gapi.load('client:picker', () => {
                    gapi.client.load('drive', 'v3');
                    pickerApiLoaded = true;
                });

                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (response) => {
                        if (response.error !== undefined) {
                            console.error("Error en autenticación:", response);
                            return;
                        }
                        accessToken = response.access_token;
                        abrirGooglePicker();
                    },
                });
            } else {
                console.warn("Las librerías de Google no pudieron cargar.");
            }
        });

        function iniciarImportacionDrive() {
            if (!accessToken) {
                tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                abrirGooglePicker();
            }
        }

        function abrirGooglePicker() {
            if (pickerApiLoaded && accessToken) {
                const view = new google.picker.View(google.picker.ViewId.DOCS);
                
                const picker = new google.picker.PickerBuilder()
                    .enableFeature(google.picker.Feature.NAV_HIDDEN)
                    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                    .setDeveloperKey(API_KEY)
                    .setAppId(APP_ID)
                    .setOAuthToken(accessToken)
                    .addView(view)
                    .setCallback(manejarArchivoSeleccionado)
                    .build();
                picker.setVisible(true);
            }
        }

async function manejarArchivoSeleccionado(data) {
    if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        const fileId = doc.id;
        let fileName = doc.name;
        const mimeType = doc.mimeType;

        showToast(`Descargando de Drive: ${fileName}...`);

        try {
            let url;
            
            // ¡EL TRUCO! Detectamos si es un formato nativo de Google Workspace
            if (mimeType === 'application/vnd.google-apps.document') {
                // Es un Google Doc, le decimos a la API que lo exporte como Word (.docx)
                url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
                // Le aseguramos la extensión al nombre para que tu sistema lo reconozca
                if (!fileName.endsWith('.docx')) fileName += '.docx';
                
            } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
                // Es un Google Sheet, lo exportamos como Excel (.xlsx)
                url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
                if (!fileName.endsWith('.xlsx')) fileName += '.xlsx';
                
            } else if (mimeType === 'application/vnd.google-apps.presentation') {
                // Es un Google Slide, lo exportamos como PowerPoint (.pptx)
                url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation`;
                if (!fileName.endsWith('.pptx')) fileName += '.pptx';
                
            } else {
                // Es un archivo normal (PDF, o un documento de Office ya existente)
                url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            }

            // Hacemos la petición con la URL correcta según el tipo de archivo
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if(!response.ok) {
                // Capturamos el error exacto para saber qué falló
                const errText = await response.text();
                console.error("Error detallado de Drive API:", errText);
                throw new Error("No se pudo descargar o exportar el archivo");
            }

            const blob = await response.blob();
            
            // Convertimos a File estándar
            const downloadedFile = new File([blob], fileName, { type: blob.type });

            // Lo pasamos a tu ecosistema de Anticithera
            if(typeof processDroppedFile === 'function') {
                processDroppedFile(downloadedFile); 
            }

        } catch (error) {
            console.error("Error en la integración con Google Drive:", error);
            showToast("Hubo un problema descargando el archivo de Drive.");
        }
    }
}

        // --- BASE DE DATOS (INDEXEDDB) ---
        const initDB = () => {
            const request = indexedDB.open('AnticitheraDB', 3);
            request.onupgradeneeded = (e) => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains('resources')) {
                    dbInstance.createObjectStore('resources', { keyPath: 'id' });
                }
                if (!dbInstance.objectStoreNames.contains('notes')) {
                    dbInstance.createObjectStore('notes', { keyPath: 'id' });
                }
                if (!dbInstance.objectStoreNames.contains('activity')) {
                    dbInstance.createObjectStore('activity', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                db = e.target.result;
                updateStats();
                loadActivity();
                renderResources();
            };
        };

        // --- VISOR DE PDF (PDF.JS) ---
        async function openPdfViewer(resourceId) {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');
            const req = store.get(resourceId);

            req.onsuccess = async () => {
                const res = req.result;
                if (!res || !res.blob) {
                    showToast("No hay archivo binario disponible.");
                    return;
                }

                document.getElementById('pdf-viewer-overlay').classList.remove('hidden');
                document.getElementById('pdf-viewer-title').innerText = res.name;

                const url = URL.createObjectURL(res.blob);
                const loadingTask = pdfjsLib.getDocument(url);
                pdfDoc = await loadingTask.promise;
                document.getElementById('page-count').textContent = pdfDoc.numPages;
                pageNum = 1;
                renderPage(pageNum);
            };
        }

        async function renderPage(num) {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale, rotation });

            // Render Canvas
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const renderContext = { canvasContext: ctx, viewport: viewport };
            await page.render(renderContext).promise;

            // Render Text Layer
            textLayerDiv.innerHTML = '';
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.width = `${viewport.width}px`;

            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });

            document.getElementById('page-num').textContent = num;
        }

        function changePage(delta) {
            if (!pdfDoc || pageNum + delta < 1 || pageNum + delta > pdfDoc.numPages) return;
            pageNum += delta;
            renderPage(pageNum);
        }

        function zoomPdf(delta) { scale += delta; renderPage(pageNum); }
        function rotatePdf() { rotation = (rotation + 90) % 360; renderPage(pageNum); }
        function closePdfViewer() {
            document.getElementById('pdf-viewer-overlay').classList.add('hidden');
            pdfDoc = null;
            floatingBtn.classList.add('hidden');
        }

        // --- MANEJO DE SELECCIÓN ---
        document.addEventListener('mouseup', (e) => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            // Caso 1: Selección en PDF
            if (text && textLayerDiv && textLayerDiv.contains(selection.anchorNode)) {
                selectedText = text;
                fab.style.left = `${e.pageX}px`;
                fab.style.top = `${e.pageY - 40}px`;
                fab.classList.remove('hidden');
            }
            // Caso 2: Clic fuera para limpiar (si no hay selección activa)
            else if (!text) {
                if (!fab.contains(e.target)) {
                    fab.classList.add('hidden');
                }
            }
        });

        fab.onclick = () => {
            openFichaModal();
            fab.classList.add('hidden');
        };

        function openFichaModal() {
            document.getElementById('ficha-text-preview').innerText = selectedText;
            
            // Lógica inteligente para detectar el visor activo y extraer su título
            let docTitle = "Documento Desconocido";
            let page = "N/A";

            if (!document.getElementById('pdf-viewer-overlay').classList.contains('hidden')) {
                // Si estamos en un PDF
                docTitle = document.getElementById('pdf-viewer-title').innerText;
                page = pageNum;
            } else if (!document.getElementById('office-viewer-overlay').classList.contains('hidden')) {
                // Si estamos en Word, Excel, etc.
                docTitle = document.getElementById('office-title').innerText;
                page = "Única"; // Estos documentos no están paginados en la web
            } else if (!document.getElementById('notebook-viewer-overlay').classList.contains('hidden')) {
                // Si estamos en un Notebook de Jupyter
                docTitle = document.getElementById('notebook-title').innerText;
                page = "Celda"; 
            }

            // Inyectar los metadatos correctos en la ventana de creación
            document.getElementById('ficha-ref').value = docTitle;
            document.getElementById('ficha-page').value = page;
            document.getElementById('ficha-comment').value = '';
            document.getElementById('ficha-modal').classList.remove('hidden');
        }

        const saveFicha = () => {
            const comment = document.getElementById('ficha-comment').value;
            const ref = document.getElementById('ficha-ref').value;
            const pg = document.getElementById('ficha-page').value;
            const text = document.getElementById('ficha-text-preview').innerText;

            if (!comment) return showToast("El comentario es obligatorio");

            const id = 'note_ficha_' + Date.now();
            const note = {
                id,
                title: `FICHA: ${ref} (Pág. ${pg})`,
                content: `FRAGMENTO:\n"${text}"\n\nCOMENTARIO:\n${comment}\n\nORIGEN: ${ref} | PÁGINA: ${pg}`,
                type: 'ficha',
                updatedAt: new Date().toISOString()
            };

            const tx = db.transaction('notes', 'readwrite');
            tx.objectStore('notes').put(note);
            tx.oncomplete = () => {
                closeModal('ficha-modal');
                showToast("Ficha bibliográfica almacenada con éxito");
                window.getSelection().removeAllRanges();
            };
        };

        // --- EXTRACCIÓN DE METADATOS (CROSSREF / OPENALEX) ---
        async function fetchAcademicMetadata(doi) {
            try {
                // Primero intentamos Crossref
                const crossrefUrl = `https://api.crossref.org/works/${doi}`;
                const response = await fetch(crossrefUrl);
                if (response.ok) {
                    const data = await response.json();
                    return formatMetadata(data.message, 'Crossref');
                }

                // Fallback a OpenAlex
                const openAlexUrl = `https://api.openalex.org/works/https://doi.org/${doi}`;
                const resAlex = await fetch(openAlexUrl);
                if (resAlex.ok) {
                    const data = await resAlex.json();
                    return formatMetadata(data, 'OpenAlex');
                }
            } catch (err) {
                console.error("Error fetching metadata:", err);
            }
            return null;
        }

        function formatMetadata(raw, source) {
            // Unificar formatos de distintas APIs
            if (source === 'Crossref') {
                return {
                    title: raw.title ? raw.title[0] : 'Sin título',
                    authors: raw.author ? raw.author.map(a => `${a.family}, ${a.given[0]}.`).join('; ') : 'Autor desconocido',
                    journal: raw['container-title'] ? raw['container-title'][0] : 'Publicación desconocida',
                    year: raw.issued?.['date-parts']?.[0]?.[0] || 'n.d.',
                    doi: raw.DOI,
                    type: raw.type,
                    source: source
                };
            } else {
                return {
                    title: raw.display_name || 'Sin título',
                    authors: raw.authorships ? raw.authorships.map(a => a.author.display_name).join('; ') : 'Autor desconocido',
                    journal: raw.host_venue?.display_name || 'Publicación desconocida',
                    year: raw.publication_year || 'n.d.',
                    doi: raw.doi?.replace('https://doi.org/', ''),
                    type: raw.type,
                    source: source
                };
            }
        }

        // --- GENERADOR DE CITAS ---
        function getCitations(m) {
            const firstAuthor = m.authors.split(';')[0];
            const cleanTitle = m.title.endsWith('.') ? m.title : m.title + '.';

            return {
                APA: `${m.authors} (${m.year}). ${cleanTitle} ${m.journal}. https://doi.org/${m.doi}`,
                MLA: `${m.authors}. "${cleanTitle}" ${m.journal}, ${m.year}.`,
                Chicago: `${m.authors}. "${cleanTitle}" ${m.journal} (${m.year}). https://doi.org/${m.doi}`,
                BibTeX: `@article{ref_${m.doi.replace(/[^a-z0-9]/gi, '_')},\n  author = {${m.authors}},\n  title = {${m.title}},\n  journal = {${m.journal}},\n  year = {${m.year}},\n  doi = {${m.doi}}\n}`
            };
        }

        function showMetadataModal(resourceId) {
            const tx = db.transaction('resources', 'readonly');
            const store = tx.objectStore('resources');
            const req = store.get(resourceId);

            req.onsuccess = () => {
                const res = req.result;
                const m = res.metadata || { title: res.name, authors: 'N/A', journal: 'N/A', year: 'N/A', doi: 'N/A' };
                const citations = getCitations(m);

                const body = document.getElementById('metadata-body');
                body.innerHTML = `
                    <div class="grid grid-cols-2 gap-4 border-b border-stone-100 pb-6">
                        <div class="col-span-2">
                            <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">Título del Artículo</span>
                            <h4 class="text-xl font-bold italic text-stone-800">${m.title}</h4>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">Autores</span>
                            <p class="text-sm text-stone-600">${m.authors}</p>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">Publicación / Revista</span>
                            <p class="text-sm text-stone-600">${m.journal}</p>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">Año</span>
                            <p class="text-sm text-stone-600">${m.year}</p>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase font-bold text-stone-400 block mb-1">DOI Identificador</span>
                            <p class="text-sm text-stone-600 mono">${m.doi}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4 pt-4">
                        <h5 class="text-xs font-bold uppercase tracking-widest text-amber-900">Formatos de Citación</h5>
                        ${Object.entries(citations).map(([format, text]) => `
                            <div class="p-3 bg-stone-50 rounded border border-stone-200 relative group">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[9px] font-bold text-stone-400 uppercase">${format}</span>
                                    <button onclick="copyText(this, \`${text.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)" class="text-stone-300 hover:text-amber-800 transition-colors">
                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                                <p class="text-[11px] leading-relaxed text-stone-600 italic select-all">${text.replace(/\n/g, '<br>')}</p>
                            </div>
                        `).join('')}
                    </div>
                `;

                document.getElementById('metadata-modal').classList.remove('hidden');
                lucide.createIcons();
            };
        }

        function copyText(btn, text) {
            navigator.clipboard.writeText(text);
            const icon = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
            lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = icon;
                lucide.createIcons();
            }, 2000);
            showToast("Cita copiada al portapapeles");
        }

        // --- IMPORTACIÓN POR DOI ---
        async function importByDoi() {
            const doi = document.getElementById('doiInput').value.trim();
            if (!doi) return;

            showToast("Consultando DOI...");
            const meta = await fetchAcademicMetadata(doi);

            if (!meta) {
                showToast("No se pudo resolver el DOI.");
                return;
            }

            // En un entorno ideal, intentaríamos buscar el PDF en Unpaywall o similar.
            // Aquí guardamos el registro con los metadatos.
            const resource = {
                id: 'res_' + Date.now(),
                name: meta.title,
                type: 'Articulo (DOI)',
                date: new Date().toLocaleDateString(),
                metadata: meta,
                blob: null,
                createdAt: new Date()
            };

            const tx = db.transaction(['resources', 'activity'], 'readwrite');
            tx.objectStore('resources').add(resource);
            tx.objectStore('activity').add({
                id: Date.now(),
                name: `Importado: ${meta.title.substring(0, 20)}...`,
                type: 'doi-import',
                time: 'Justo ahora'
            });

            tx.oncomplete = () => {
                renderResources();
                loadActivity();
                updateStats();
                document.getElementById('doiInput').value = '';
                showToast("DOI importado exitosamente");
                showMetadataModal(resource.id);
            };
        }

        // --- GESTIÓN DE ARCHIVOS ---
        const handleFileUpload = async (e) => {
            const file = e.target.files ? e.target.files[0] : null;
            if (!file) return;

            showToast("Procesando PDF...");

            const resourceId = 'res_' + Date.now();
            const resource = {
                id: resourceId,
                name: file.name,
                type: 'PDF Local',
                date: new Date().toLocaleDateString(),
                blob: file,
                metadata: null,
                createdAt: new Date()
            };

            const tx = db.transaction(['resources', 'activity'], 'readwrite');
            tx.objectStore('resources').add(resource);
            tx.objectStore('activity').add({
                id: Date.now(),
                name: `Subida: ${file.name}`,
                type: 'upload',
                time: 'Reciente'
            });

            tx.oncomplete = () => {
                renderLibrary();
                loadActivity();
                updateStats();
                showToast("Archivo almacenado en biblioteca");
            };
        };

        // --- IMPORTACIÓN OBSIDIAN (.MD) ---
        const handleObsidianUpload = async (e) => {
            const file = e.target.files ? e.target.files[0] : null;
            if (!file) return;

            const text = await file.text();
            showToast("Procesando nota de Obsidian...");

            // 1. Parsing Frontmatter
            const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
            let tags = [];
            let cleanContent = text;
            if (fmMatch) {
                const fm = fmMatch[1];
                const tagsMatch = fm.match(/tags:\s*\[?(.*?)\]?/);
                if (tagsMatch) {
                    tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^#/, ''));
                }
                cleanContent = text.replace(fmMatch[0], '').trim();
            }

            // 2. Procesar Wikilinks [[Link]] -> Formato Clickable
            // Almacenamos el texto original pero procesado para que el visor de notas lo reconozca
            const processedContent = cleanContent.replace(/\[\[(.*?)\]\]/g, (match, link) => {
                return `🔗 [[${link}]]`;
            });

            const id = 'note_obs_' + Date.now();
            const note = {
                id,
                title: file.name.replace('.md', ''),
                content: processedContent,
                tags: tags,
                type: 'obsidian',
                updatedAt: new Date().toISOString()
            };

            const tx = db.transaction(['notes', 'activity'], 'readwrite');
            tx.objectStore('notes').add(note);
            tx.objectStore('activity').add({
                id: Date.now(),
                name: `Obsidian: ${note.title}`,
                type: 'obsidian-import',
                time: 'Justo ahora'
            });

            tx.oncomplete = () => {
                showToast("Nota de Obsidian importada al Bloc");
                renderLibrary();
                loadActivity();
            };
        };

        // --- VISOR UNIVERSAL DE OFFICE (DOCX, XLSX, ODS, PPTX, ODT) ---
        const handleOfficeUpload = async (e) => {
            const file = e.target.files ? e.target.files[0] : null;
            if (!file) return;
            showToast("Indexando Documento...");

            const id = 'res_off_' + Date.now();
            const resource = {
                id,
                name: file.name,
                type: 'Documento Office',
                date: new Date().toLocaleDateString(),
                blob: file, // Guardamos el archivo original
                createdAt: new Date()
            };

            const tx = db.transaction(['resources', 'activity'], 'readwrite');
            tx.objectStore('resources').add(resource);
            tx.objectStore('activity').add({
                id: Date.now(),
                name: `Doc: ${file.name}`,
                type: 'office-import',
                time: 'Justo ahora'
            });

            tx.oncomplete = () => {
                renderLibrary();
                loadActivity();
                showToast("Documento añadido");
            };
        };

        async function openOfficeViewer(id) {
            const tx = db.transaction('resources', 'readonly');
            tx.objectStore('resources').get(id).onsuccess = async (e) => {
                const res = e.target.result;
                const arrayBuffer = await res.blob.arrayBuffer();
                const container = document.getElementById('office-content-area');
                const titleEl = document.getElementById('office-title');
                const badgeEl = document.getElementById('office-type-badge');

                titleEl.innerText = res.name;
                container.innerHTML = 'Procesando contenido...';
                document.getElementById('office-viewer-overlay').classList.remove('hidden');

try {
                    if (res.name.endsWith('.docx')) {
                        badgeEl.innerText = "Soporte Word Nativo";
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        // Envolvemos en Tailwind Typography para un formato de lectura impecable
                        container.innerHTML = `<div class="prose prose-stone max-w-none prose-headings:font-bold prose-headings:text-stone-800 prose-p:text-stone-600 prose-a:text-amber-700">${result.value}</div>`;
                    }
                    else if (res.name.endsWith('.xlsx') || res.name.endsWith('.ods')) {
                        badgeEl.innerText = "Hoja de Cálculo";
                        const workbook = XLSX.read(arrayBuffer);
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const htmlString = XLSX.utils.sheet_to_html(firstSheet);
                        
                        // Envolvemos la tabla en un contenedor scrolleable
                        container.innerHTML = `<div class="spreadsheet-container">${htmlString}</div>`;
                        
                        // Inyectamos estilos de tabla profesional directamente al DOM generado
                        const table = container.querySelector('table');
                        if (table) {
                            table.className = "w-full text-sm text-left border-collapse bg-white";
                            container.querySelectorAll('td, th').forEach(cell => {
                                cell.className = "border border-stone-200 px-4 py-2 text-stone-600 whitespace-nowrap";
                            });
                            // Estilo para la primera fila (asumiendo que son los encabezados)
                            container.querySelectorAll('tr:first-child td').forEach(cell => {
                                cell.classList.add('bg-stone-100', 'font-bold', 'text-stone-800', 'uppercase', 'text-[10px]', 'tracking-wider');
                            });
                        }
                    }
                    else {
                        // Pantalla de error elegante para PPTX u otros
                        container.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-center text-stone-400 space-y-4 py-20">
                                <i data-lucide="monitor-x" class="w-16 h-16 text-stone-300"></i>
                                <h3 class="text-xl font-bold text-stone-600">Visualización no soportada</h3>
                                <p class="text-sm max-w-md leading-relaxed">El formato de <b>${res.name}</b> requiere un motor gráfico externo.</p>
                                <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs mt-4">
                                    <i data-lucide="lightbulb" class="w-4 h-4 inline-block mr-1 mb-0.5"></i>
                                    <b>Recomendación del Ecosistema:</b> Exporta tus presentaciones (PPTX) a formato PDF antes de subirlas para aprovechar el visor integrado.
                                </div>
                            </div>`;
                    }
                } catch (err) {
                    container.innerHTML = `
                        <div class="p-8 text-center text-red-500 bg-red-50 rounded border border-red-200">
                            <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2"></i>
                            <p>Error al renderizar el documento: ${err.message}</p>
                        </div>`;
                }
                lucide.createIcons();
            };
        }

        function closeOfficeViewer() {
            document.getElementById('office-viewer-overlay').classList.add('hidden');
        }

        // --- SISTEMA UNIVERSAL DE CITAS (FAB) ---
        let universalSelectedText = "";
        // El fab ya está definido arriba como constante global

        function handleSelectionEvent(e) {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 5) {
                selectedText = text;
                // Posicionamiento inteligente del botón flotante
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                fab.style.left = `${rect.left + (rect.width / 2)}px`;
                fab.style.top = `${rect.top + window.scrollY - 40}px`;
                fab.classList.remove('hidden');
            } else {
                fab.classList.add('hidden');
            }
        }

        // Escuchar clics globales para cerrar el FAB si se hace clic fuera
        document.addEventListener('mousedown', (e) => {
            if (!fab.contains(e.target) && !window.getSelection().toString()) {
                fab.classList.add('hidden');
            }
        });

        const handleNotebookUpload = async (e) => {
            const file = e.target.files ? e.target.files[0] : null;
            if (!file) return;

            const text = await file.text();
            try {
                JSON.parse(text); // Validar JSON
                showToast("Indexando Notebook...");

                const id = 'res_nb_' + Date.now();
                const resource = {
                    id,
                    name: file.name,
                    type: 'Notebook (Local)',
                    date: new Date().toLocaleDateString(),
                    blob: new Blob([text], { type: 'application/json' }),
                    createdAt: new Date()
                };

                const tx = db.transaction(['resources', 'activity'], 'readwrite');
                tx.objectStore('resources').add(resource);
                tx.objectStore('activity').add({
                    id: Date.now(),
                    name: `Notebook: ${file.name}`,
                    type: 'notebook-import',
                    time: 'Reciente'
                });

                tx.oncomplete = () => {
                    renderLibrary();
                    loadActivity();
                    showToast("Notebook añadido a la biblioteca");
                };
            } catch (err) {
                showToast("Error: El archivo no es un .ipynb válido");
            }
        };

        async function openNotebookViewer(id) {
            const tx = db.transaction('resources', 'readonly');
            tx.objectStore('resources').get(id).onsuccess = async (e) => {
                const res = e.target.result;
                const text = await res.blob.text();
                const nb = JSON.parse(text);

                document.getElementById('notebook-viewer-overlay').classList.remove('hidden');
                document.getElementById('notebook-title').innerText = res.name;

                const container = document.getElementById('notebook-content-area');
                container.innerHTML = '';

                nb.cells.forEach(cell => {
                    const cellDiv = document.createElement('div');
                    cellDiv.className = "mb-6";

                    if (cell.cell_type === 'markdown') {
                        const mdDiv = document.createElement('div');
                        mdDiv.className = "text-sm leading-relaxed text-stone-800 prose prose-stone max-w-none";
                        mdDiv.innerHTML = marked.parse(cell.source.join(''));
                        cellDiv.appendChild(mdDiv);
                    }
                    else if (cell.cell_type === 'code') {
                        const code = cell.source.join('');
                        const pre = document.createElement('pre');
                        pre.className = "rounded-lg !bg-stone-50 border border-stone-200 !p-4 !text-xs overflow-x-auto";
                        pre.innerHTML = `<code class="language-python">${Prism.highlight(code, Prism.languages.python, 'python')}</code>`;
                        cellDiv.appendChild(pre);

                        if (cell.outputs && cell.outputs.length > 0) {
                            const outContainer = document.createElement('div');
                            outContainer.className = "mt-3 space-y-2 border-l-2 border-stone-200 pl-4";

                            cell.outputs.forEach(out => {
                                const outDiv = document.createElement('div');
                                outDiv.className = "text-[11px] font-mono text-stone-600 overflow-x-auto";

                                if (out.output_type === 'stream') {
                                    outDiv.innerText = out.text.join('');
                                }
                                else if (out.data) {
                                    if (out.data['image/png']) {
                                        const img = document.createElement('img');
                                        img.src = `data:image/png;base64,${out.data['image/png']}`;
                                        img.className = "max-w-full rounded mt-2 border border-stone-100";
                                        outDiv.appendChild(img);
                                    } else if (out.data['text/html']) {
                                        outDiv.innerHTML = out.data['text/html'].join('');
                                    } else if (out.data['text/plain']) {
                                        outDiv.innerText = out.data['text/plain'].join('');
                                    }
                                }
                                outContainer.appendChild(outDiv);
                            });
                            cellDiv.appendChild(outContainer);
                        }
                    }
                    container.appendChild(cellDiv);
                });

                if (window.MathJax) MathJax.typesetPromise([container]);
                lucide.createIcons();
            };
        }

        function closeNotebookViewer() {
            document.getElementById('notebook-viewer-overlay').classList.add('hidden');
        }

        // Navegación por Wikilinks
        async function navigateByWikilink(linkText) {
            // Limpiar el texto del link
            const target = linkText.replace('[[', '').replace(']]', '').trim();

            // Buscar en Recursos (PDFs)
            const resTx = db.transaction('resources', 'readonly');
            resTx.objectStore('resources').openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (cursor.value.name.toLowerCase().includes(target.toLowerCase())) {
                        openPdfViewer(cursor.value.id);
                        return;
                    }
                    cursor.continue();
                } else {
                    // Si no está en recursos, buscar en Notas
                    const noteTx = db.transaction('notes', 'readonly');
                    noteTx.objectStore('notes').openCursor().onsuccess = (ev) => {
                        const nCursor = ev.target.result;
                        if (nCursor) {
                            if (nCursor.value.title.toLowerCase() === target.toLowerCase()) {
                                navigateTo('notas');
                                loadNote(nCursor.value.id);
                                return;
                            }
                            nCursor.continue();
                        } else {
                            showToast(`No se encontró destino para: ${target}`);
                        }
                    };
                }
            };
        }


        // --- RENDERIZADO UNIFICADO DE LA LIBRERÍA (BÚSQUEDA AVANZADA) ---
        const renderLibrary = async () => {
            const grid = document.getElementById('resources-grid');
            if (!grid) return;
            grid.innerHTML = '';

            const query = document.getElementById('advSearchInput').value.toLowerCase();
            const typeFilter = document.getElementById('advTypeFilter').value;
            const folderFilter = document.getElementById('advFolderFilter').value;

            let allItems = [];

            // 1. Obtener Recursos (PDFs)
            const resTx = db.transaction('resources', 'readonly');
            resTx.objectStore('resources').openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const res = cursor.value;
                    const matchesType = typeFilter === 'all' ||
                        (typeFilter === 'pdf' && (res.type === 'PDF Local' || res.type === 'Articulo (DOI)')) ||
                        (typeFilter === 'office' && res.type === 'Documento Office') ||
                        (typeFilter === 'obsidian' && res.type === 'Notebook (Local)');
                    const matchesQuery = !query || res.name.toLowerCase().includes(query) || (res.metadata && res.metadata.title.toLowerCase().includes(query));
                    const matchesFolder = folderFilter === 'all' || res.folder === folderFilter;

                    if (matchesType && matchesQuery && matchesFolder) {
                        allItems.push({ ...res, entryType: 'resource' });
                    }
                    cursor.continue();
                } else {
                    // 2. Obtener Notas/Fichas
                    const noteTx = db.transaction('notes', 'readonly');
                    noteTx.objectStore('notes').openCursor().onsuccess = (ev) => {
                        const nCursor = ev.target.result;
                        if (nCursor) {
                            const note = nCursor.value;
                            const matchesType = typeFilter === 'all' ||
                                (typeFilter === 'note' && !note.type) ||
                                (typeFilter === 'ficha' && note.type === 'ficha') ||
                                (typeFilter === 'obsidian' && note.type === 'obsidian');

                            const matchesQuery = !query || note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
                            const matchesFolder = folderFilter === 'all' || note.folder === folderFilter;

                            if (matchesType && matchesQuery && matchesFolder) {
                                allItems.push({ ...note, entryType: 'note', name: note.title });
                            }
                            nCursor.continue();
                        } else {
                            displayItems(allItems);
                            updateTagsFilter(allItems);
                        }
                    };
                }
            };
        };

        const displayItems = (items) => {
            const grid = document.getElementById('resources-grid');
            items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).forEach(item => {
                const card = document.createElement('div');
                card.className = "glass-card p-5 rounded-xl group hover:border-amber-700 transition-all flex flex-col animate-fade shadow-sm hover:shadow-lg";

                let icon = 'file-text';
                let typeLabel = 'PDF Local';
                let action = '';

                if (item.entryType === 'resource') {
                    icon = item.blob ? 'file-text' : 'link';
                    const name = item.name.toLowerCase();
                    if (name.endsWith('.ipynb')) icon = 'layout';
                    if (name.endsWith('.docx')) icon = 'file-text';
                    if (name.endsWith('.xlsx') || name.endsWith('.ods')) icon = 'table';

                    typeLabel = item.type;
                    action = item.blob ? (
                        name.endsWith('.ipynb') ? `openNotebookViewer('${item.id}')` :
                            (name.endsWith('.pdf') ? `openPdfViewer('${item.id}')` : `openOfficeViewer('${item.id}')`)
                    ) : (item.metadata ? `window.open('https://doi.org/${item.metadata.doi}', '_blank')` : '');
                } else {
                    icon = item.type === 'ficha' ? 'plus-square' : (item.type === 'obsidian' ? 'file-type' : 'pen-tool');
                    typeLabel = item.type === 'ficha' ? 'Ficha' : (item.type === 'obsidian' ? 'Obsidian' : 'Nota');
                    action = `navigateTo('notas'); loadNote('${item.id}');`;
                }

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-2 bg-amber-50 rounded text-amber-900 border border-amber-200">
                            <i data-lucide="${icon}" class="w-4 h-4"></i>
                        </div>
                        <div class="flex gap-2 relative">
                            <button onclick="toggleTagMenu(event, '${item.id}')" class="text-stone-400 hover:text-amber-700 transition-colors" title="Categorizar">
                                <i data-lucide="tag" class="w-4 h-4"></i>
                            </button>
                            <div id="tag-menu-${item.id}" class="tag-menu">
                                <div class="tag-menu-item" onclick="setItemFolder('${item.id}', '${item.entryType}', 'investigacion')">
                                    Investigación
                                </div>
                                <div class="tag-menu-item" onclick="setItemFolder('${item.id}', '${item.entryType}', 'borradores')">
                                    Borrador
                                </div>
                                <div class="tag-menu-item" onclick="setItemFolder('${item.id}', '${item.entryType}', 'favoritos')">
                                    Favoritos
                                </div>
                                <div class="tag-menu-item border-t border-stone-100" onclick="setItemFolder('${item.id}', '${item.entryType}', 'all')">
                                    <i data-lucide="x" class="w-3 h-3"></i> Quitar Etiqueta
                                </div>
                            </div>
                            ${item.entryType === 'resource' ? `<button onclick="showMetadataModal('${item.id}')" class="text-stone-400 hover:text-blue-600"><i data-lucide="info" class="w-4 h-4"></i></button>` : ''}
                            <button onclick="deleteResourceOrNote('${item.id}', '${item.entryType}')" class="text-stone-400 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                    <h3 class="font-bold italic text-stone-800 mb-1 leading-tight line-clamp-2 cursor-pointer hover:text-amber-800" onclick="${action}">
                        ${item.name}
                    </h3>
                    <div class="mt-4 flex flex-wrap gap-1">
                        ${(item.tags || []).map(t => `<span class="px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[8px] rounded uppercase font-bold tracking-tighter">#${t}</span>`).join('')}
                    </div>
                    <div class="flex justify-between items-center mt-auto pt-3 border-t border-stone-100 mt-4">
                        <div class="flex flex-col gap-1">
                            <p class="text-[10px] uppercase font-bold text-stone-400">${typeLabel} • ${new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
                            ${item.folder ? `<span class="tag-badge tag-${item.folder} w-fit">${item.folder}</span>` : ''}
                        </div>
                        ${item.entryType === 'resource' ? `<button onclick="filterFichasByRef('${item.name.replace(/'/g, "\\'")}')" class="text-[9px] font-bold text-amber-900 hover:underline">Fichas</button>` : ''}
                    </div>
                `;
                grid.appendChild(card);
            });
            lucide.createIcons();
        };

        // --- SISTEMA DE ETIQUETADO ---
        function toggleTagMenu(event, id) {
            event.stopPropagation();
            const menu = document.getElementById(`tag-menu-${id}`);
            const isActive = menu.classList.contains('active');

            // Cerrar todos los menús abiertos
            document.querySelectorAll('.tag-menu').forEach(m => m.classList.remove('active'));

            if (!isActive) {
                menu.classList.add('active');
            }
        }

        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('.tag-menu').forEach(m => m.classList.remove('active'));
        });

        async function setItemFolder(id, entryType, folder) {
            const storeName = entryType === 'resource' ? 'resources' : 'notes';
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            store.get(id).onsuccess = (e) => {
                const item = e.target.result;
                if (!item) return;

                if (folder === 'all') {
                    delete item.folder;
                } else {
                    item.folder = folder;
                }

                item.updatedAt = new Date().toISOString();
                store.put(item);

                tx.oncomplete = () => {
                    showToast(`Categoría: ${folder === 'all' ? 'Removida' : folder.toUpperCase()}`);
                    renderLibrary();
                };
            };
        }

        const deleteResourceOrNote = (id, entryType) => {
            if (!confirm("¿Seguro de eliminar este registro del ecosistema?")) return;
            const storeName = entryType === 'resource' ? 'resources' : 'notes';
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(id);
            tx.oncomplete = () => {
                renderLibrary();
                updateStats();
                showToast("Registro eliminado");
            };
        };

        const updateTagsFilter = (items) => {
            const tagContainer = document.getElementById('adv-tag-filters');
            const tags = new Set();
            items.forEach(i => (i.tags || []).forEach(t => tags.add(t)));

            const currentTagsHTML = tagContainer.innerHTML.split('</span>')[0] + '</span>';
            tagContainer.innerHTML = currentTagsHTML + Array.from(tags).slice(0, 10).map(t => `
                <button onclick="addTagToSearch('${t}')" class="px-2 py-0.5 bg-white border border-stone-200 rounded-full text-[9px] text-stone-500 hover:border-amber-600 transition-all font-medium">#${t}</button>
            `).join('');
        };

        const addTagToSearch = (tag) => {
            const input = document.getElementById('advSearchInput');
            input.value = tag;
            renderLibrary();
        };

        const renderResources = () => renderLibrary(); // Compatibilidad

        const deleteResource = (id) => {
            deleteResourceOrNote(id, 'resource');
        };

        // --- GESTIÓN DE NOTAS ---
        const saveCurrentNote = () => {
            const title = document.getElementById('note-title').value || 'Sin Título';
            const content = document.getElementById('note-content').value;

            if (!content) return showToast("La nota está vacía");

            const id = currentNoteId || 'note_' + Date.now();
            const note = {
                id,
                title,
                content,
                updatedAt: new Date().toISOString()
            };

            const tx = db.transaction('notes', 'readwrite');
            tx.objectStore('notes').put(note);
            tx.oncomplete = () => {
                currentNoteId = id;
                renderNotesList();
                showToast("Reflexión sellada en IndexedDB");
            };
        };

        const renderNotesList = () => {
            const list = document.getElementById('notes-list');
            list.innerHTML = '';
            const tx = db.transaction('notes', 'readonly');
            tx.objectStore('notes').openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const n = cursor.value;
                    const item = document.createElement('div');
                    item.className = `p-3 rounded cursor-pointer transition-all border ${currentNoteId === n.id ? 'bg-white border-amber-300 shadow-sm' : 'border-transparent hover:bg-stone-200'}`;
                    item.onclick = () => loadNote(n.id);
                    item.innerHTML = `
                        <h5 class="text-xs font-bold italic truncate">${n.title}</h5>
                        <p class="text-[9px] uppercase font-bold text-stone-400">${new Date(n.updatedAt).toLocaleDateString()}</p>
                    `;
                    list.appendChild(item);
                    cursor.continue();
                }
            };
        };

        const loadNote = (id) => {
            const tx = db.transaction('notes', 'readonly');
            tx.objectStore('notes').get(id).onsuccess = (e) => {
                const n = e.target.result;
                currentNoteId = n.id;
                document.getElementById('note-title').value = n.title;

                // Si es obsidian, añadimos un listener para los wikilinks en el contenido (simulado con clicks sobre el texto)
                document.getElementById('note-content').value = n.content;
                renderNotesList();
            };
        };

        // Escuchar clics en el bloc de notas para interceptar wikilinks
        document.getElementById('note-content').addEventListener('dblclick', function (e) {
            const text = this.value;
            const start = this.selectionStart;
            const end = this.selectionEnd;

            // Si el usuario hace doble clic o selecciona algo que parece un [[wikilink]]
            const match = text.substring(0, start).match(/\[\[[^\]]*$/);
            const matchEnd = text.substring(start).match(/^[^\]]*\]\]/);

            if (match && matchEnd) {
                const fullLink = match[0] + matchEnd[0];
                navigateByWikilink(fullLink);
            }
        });

        const createNewNote = () => {
            currentNoteId = null;
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            renderNotesList();
        };

        const filterFichasByRef = (refName) => {
            navigateTo('notas');
            const list = document.getElementById('notes-list');
            list.innerHTML = '';
            const tx = db.transaction('notes', 'readonly');
            tx.objectStore('notes').openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const n = cursor.value;
                    if (n.title.includes(`FICHA: ${refName}`)) {
                        const item = document.createElement('div');
                        item.className = `p-3 rounded cursor-pointer transition-all border border-amber-300 bg-amber-50/30 shadow-sm mb-2`;
                        item.onclick = () => loadNote(n.id);
                        item.innerHTML = `
                            <h5 class="text-xs font-bold italic truncate font-mono">${n.title}</h5>
                            <p class="text-[9px] uppercase font-bold text-stone-400">${new Date(n.updatedAt).toLocaleDateString()}</p>
                        `;
                        list.appendChild(item);
                    }
                    cursor.continue();
                }
            };
            showToast(`Filtrando fichas de: ${refName}`);
        };

        // --- EXPORTACIÓN DE NOTAS ---
        function exportNote(format) {
            const title = document.getElementById('note-title').value || 'Sin_Titulo';
            const content = document.getElementById('note-content').value;

            if (!content) return showToast("No hay contenido para exportar");

            if (format === 'md') {
                const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown;charset=utf-8' });
                saveAs(blob, `${title.replace(/\s+/g, '_')}.md`);
                showToast("Archivo Markdown exportado");
            }
            else if (format === 'pdf') {
                const printContainer = document.getElementById('print-section');
                printContainer.innerHTML = `
                    <h1>${title}</h1>
                    <div class="note-content">${marked.parse(content)}</div>
                    <div class="metadata">
                        Exportado desde Anticithera Hub - ${new Date().toLocaleString()}<br>
                        Local ID: ${currentNoteId || 'N/A'}
                    </div>
                `;
                window.print();
            }
           else if (format === 'docx') {
                // Generamos un HTML robusto que Word reconozca como documento
                const htmlContent = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>${title}</title></head>
                    <body style="font-family: 'Times New Roman', serif;">
                        <h1 style="text-align: center; border-bottom: 1px solid black; padding-bottom: 10px;">${title}</h1>
                        <div style="margin-top: 20px; line-height: 1.5;">${marked.parse(content)}</div>
                        <p style="margin-top: 50px; font-size: 10pt; color: #666;">Exportado desde Anticithera Hub - ${new Date().toLocaleDateString()}</p>
                    ${'</'}body>
                    ${'</'}html>
                `;
                const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
                saveAs(blob, `${title.replace(/\s+/g, '_')}.doc`);
                showToast("Archivo DOC exportado (formato Word)");
            }
        }

        // --- BUSCADOR GLOBAL ---
        let searchTimeout;
        const searchInput = document.getElementById('globalSearchInput');
        const searchResultsOverlay = document.getElementById('search-results-overlay');
        const searchResultsList = document.getElementById('search-results-list');

        function handleGlobalSearch(query) {
            clearTimeout(searchTimeout);
            if (!query || query.length < 2) {
                searchResultsOverlay.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(async () => {
                const results = [];
                const q = query.toLowerCase();

                // Buscar en Recursos
                const resTx = db.transaction('resources', 'readonly');
                const resStore = resTx.objectStore('resources');
                resStore.openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const val = cursor.value;
                        const matchInName = val.name.toLowerCase().includes(q);
                        const matchInMeta = val.metadata && (
                            val.metadata.title.toLowerCase().includes(q) ||
                            val.metadata.authors.toLowerCase().includes(q) ||
                            val.metadata.journal.toLowerCase().includes(q)
                        );

                        if (matchInName || matchInMeta) {
                            results.push({
                                type: 'resource',
                                id: val.id,
                                title: val.name,
                                subtitle: val.metadata ? `${val.metadata.authors} (${val.metadata.year})` : 'Archivo Local',
                                icon: val.blob ? 'file-text' : 'link'
                            });
                        }
                        cursor.continue();
                    } else {
                        // Buscar en Notas/Fichas
                        const noteTx = db.transaction('notes', 'readonly');
                        const noteStore = noteTx.objectStore('notes');
                        noteStore.openCursor().onsuccess = (ev) => {
                            const nCursor = ev.target.result;
                            if (nCursor) {
                                const nVal = nCursor.value;
                                const matchInTitle = nVal.title.toLowerCase().includes(q);
                                const matchInContent = nVal.content.toLowerCase().includes(q);

                                if (matchInTitle || matchInContent) {
                                    results.push({
                                        type: 'note',
                                        id: nVal.id,
                                        title: nVal.title,
                                        subtitle: nVal.content.substring(0, 60) + '...',
                                        icon: nVal.type === 'ficha' ? 'plus-square' : (nVal.type === 'obsidian' ? 'file-type' : 'pen-tool')
                                    });
                                }
                                nCursor.continue();
                            } else {
                                renderSearchResults(results);
                            }
                        };
                    }
                };
            }, 150);
        }

        function renderSearchResults(results) {
            if (results.length === 0) {
                searchResultsList.innerHTML = '<div class="p-4 text-xs italic text-stone-400 text-center">No se encontraron coincidencias</div>';
            } else {
                searchResultsList.innerHTML = results.map(r => `
                    <div onclick="goToResult('${r.type}', '${r.id}')" class="p-3 hover:bg-stone-100 rounded-lg cursor-pointer flex items-center gap-3 transition-colors border border-transparent hover:border-stone-200">
                        <div class="p-2 bg-stone-100 rounded text-stone-500">
                            <i data-lucide="${r.icon}" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <h4 class="text-xs font-bold text-stone-800 truncate">${r.title}</h4>
                            <p class="text-[10px] text-stone-500 truncate">${r.subtitle}</p>
                        </div>
                        <div class="text-[8px] font-bold uppercase text-stone-300 tracking-widest">${r.type === 'resource' ? 'Documento' : 'Entrada'}</div>
                    </div>
                `).join('');
                lucide.createIcons();
            }
            searchResultsOverlay.classList.remove('hidden');
        }

        function goToResult(type, id) {
            searchResultsOverlay.classList.add('hidden');
            searchInput.value = '';

            if (type === 'resource') {
                openPdfViewer(id);
            } else {
                navigateTo('notas');
                loadNote(id);
            }
        }

        // Cerrar buscador con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') searchResultsOverlay.classList.add('hidden');
        });

        // --- INTERFAZ ---
        const navigateTo = (viewId) => {
            document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

            document.getElementById(`view-${viewId}`).classList.remove('hidden');
            document.getElementById(`nav-${viewId}`).classList.add('active');

            if (viewId === 'libreria') renderLibrary();
            if (viewId === 'notas') renderNotesList();
        };

        const loadActivity = () => {
            const container = document.getElementById('recent-activity');
            const tx = db.transaction('activity', 'readonly');
            const items = [];
            tx.objectStore('activity').openCursor().onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    items.push(cursor.value);
                    cursor.continue();
                } else {
                    container.innerHTML = items.reverse().slice(0, 5).map(i => `
                        <div class="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-stone-200">
                            <div class="flex items-center gap-3">
                                <div class="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
                                <span class="font-bold text-stone-700 text-xs">${i.name}</span>
                            </div>
                            <span class="text-[9px] uppercase font-bold text-stone-400">${i.time}</span>
                        </div>
                    `).join('') || '<div class="p-4 text-xs italic text-stone-400 text-center">Sin actividad reciente registrada</div>';
                }
            };
        };

        const updateStats = () => {
            const tx = db.transaction('resources', 'readonly');
            tx.objectStore('resources').count().onsuccess = (e) => {
                document.getElementById('stat-pdf-count').innerText = e.target.result;
            };
        };

        const showToast = (msg) => {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.classList.remove('opacity-0');
            t.classList.add('opacity-100');
            setTimeout(() => {
                t.classList.add('opacity-0');
                t.classList.remove('opacity-100');
            }, 3000);
        };

        const closeModal = (id) => document.getElementById(id).classList.add('hidden');

        setInterval(() => {
            document.getElementById('clock').innerText = new Date().toLocaleTimeString();
        }, 1000);

        // --- EXPLORADOR DE ARCHIVOS LOCAL (File System Access API) ---
        const btnOpenFolder = document.getElementById('btn-open-folder');
        const explorerTree = document.getElementById('file-explorer-tree');

        if (btnOpenFolder) {
            btnOpenFolder.addEventListener('click', async () => {
                try {
                    // Solicitar acceso al directorio local (Solo lectura)
                    const dirHandle = await window.showDirectoryPicker({
                        mode: 'read'
                    });

                    explorerTree.innerHTML = '';
                    await renderDirectoryTree(dirHandle, explorerTree, 0);
                    showToast("Directorio vinculado exitosamente");
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error("Error al acceder a la carpeta:", err);
                        showToast("Error al cargar la carpeta local");
                    }
                }
            });
        }

        async function renderDirectoryTree(dirHandle, parentElement, depth) {
            const paddingLeft = depth * 12; // Indentación progresiva

            // Ordenar: primero carpetas, luego archivos alfabéticamente
            const entries = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry);
            }
            entries.sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });

            for (const entry of entries) {
                // Ignorar carpetas ocultas comunes como .git
                if (entry.name.startsWith('.')) continue;

                const itemDiv = document.createElement('div');
                // Estilos para que coincida con la paleta de Anticithera
                itemDiv.className = `flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-[#e4d6b8] transition-colors truncate text-[11px] font-medium`;
                itemDiv.style.paddingLeft = `${paddingLeft + 8}px`;

                const iconName = entry.kind === 'directory' ? 'folder' : getFileIconForExplorer(entry.name);
                const iconColor = entry.kind === 'directory' ? 'text-amber-700' : 'text-stone-500';

                itemDiv.innerHTML = `
                    <i data-lucide="${iconName}" class="w-3.5 h-3.5 ${iconColor} flex-shrink-0 transition-transform"></i>
                    <span class="truncate select-none">${entry.name}</span>
                `;

                if (entry.kind === 'directory') {
                    // Contenedor para subcarpetas (oculto por defecto)
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'hidden flex-col';

                    itemDiv.onclick = async (e) => {
                        e.stopPropagation();
                        const isHidden = childrenContainer.classList.contains('hidden');
                        const iconEl = itemDiv.querySelector('i');

                        if (isHidden) {
                            // Cargar contenido perezosamente (lazy load) al expandir
                            if (childrenContainer.innerHTML === '') {
                                await renderDirectoryTree(entry, childrenContainer, depth + 1);
                            }
                            childrenContainer.classList.remove('hidden');
                            iconEl.setAttribute('data-lucide', 'folder-open');
                            iconEl.classList.add('text-amber-800');
                        } else {
                            childrenContainer.classList.add('hidden');
                            iconEl.setAttribute('data-lucide', 'folder');
                            iconEl.classList.remove('text-amber-800');
                        }
                        lucide.createIcons();
                    };

                    parentElement.appendChild(itemDiv);
                    parentElement.appendChild(childrenContainer);
                } else {
                    // Hacer el elemento arrastrable
                    itemDiv.draggable = true;

                    // Al iniciar el arrastre, guardamos la referencia en una variable global
                    itemDiv.ondragstart = (e) => {
                        window.draggedFileHandle = entry;
                        e.dataTransfer.effectAllowed = 'copy';
                        itemDiv.classList.add('opacity-50'); // Efecto visual
                    };

                    // Al terminar, limpiamos
                    itemDiv.ondragend = (e) => {
                        window.draggedFileHandle = null;
                        itemDiv.classList.remove('opacity-50');
                    };

                    itemDiv.onclick = async (e) => {
                        e.stopPropagation();
                        // Acción al hacer clic en un archivo
                        showToast(`Archivo: ${entry.name}`);
                    };
                    parentElement.appendChild(itemDiv);
                }
            }
            lucide.createIcons();
        }

        // Asignador de íconos basado en la extensión del archivo
        function getFileIconForExplorer(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            if (['pdf'].includes(ext)) return 'file-text';
            if (['md'].includes(ext)) return 'file-type';
            if (['ipynb'].includes(ext)) return 'layout';
            if (['docx', 'doc'].includes(ext)) return 'file-text';
            if (['xlsx', 'ods', 'csv'].includes(ext)) return 'table';
            if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'image';
            if (['html', 'css', 'js', 'json', 'py'].includes(ext)) return 'code';
            return 'file';
        }

        // --- SISTEMA DE ARRASTRAR Y SOLTAR DESDE EL EXPLORADOR LOCAL ---

        // Variable global para mantener la referencia del archivo en movimiento
        window.draggedFileHandle = null;

        const viewContainer = document.getElementById('view-container');

        // Permitir que el contenedor acepte elementos arrastrados
        viewContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necesario para permitir el "drop"
            e.dataTransfer.dropEffect = 'copy';
            viewContainer.classList.add('bg-[#e4d6b8]', 'transition-colors'); // Efecto visual al sobrevolar
        });

        viewContainer.addEventListener('dragleave', (e) => {
            viewContainer.classList.remove('bg-[#e4d6b8]');
        });

        // Manejar el evento de soltar
        viewContainer.addEventListener('drop', async (e) => {
            e.preventDefault();
            viewContainer.classList.remove('bg-[#e4d6b8]');

            // Verificar si el elemento soltado viene de nuestro explorador local
            if (window.draggedFileHandle) {
                try {
                    // Extraer el archivo real (File object) a partir del Handle
                    const file = await window.draggedFileHandle.getFile();
                    processDroppedFile(file);
                } catch (err) {
                    console.error("Error al leer el archivo arrastrado:", err);
                    showToast("Error al leer el archivo. Verifica los permisos.");
                }
                window.draggedFileHandle = null; // Limpiar
            }
        });

        // Enrutador: Envía el archivo a la función de ingesta correspondiente
        function processDroppedFile(file) {
            const ext = file.name.split('.').pop().toLowerCase();

            // Creamos un evento falso (Mock Event) para reutilizar tus funciones existentes
            const fakeEvent = { target: { files: [file] } };

            if (['pdf'].includes(ext)) {
                handleFileUpload(fakeEvent);
            } else if (['md'].includes(ext)) {
                handleObsidianUpload(fakeEvent);
            } else if (['ipynb'].includes(ext)) {
                handleNotebookUpload(fakeEvent);
            } else if (['docx', 'xlsx', 'ods', 'pptx', 'odt'].includes(ext)) {
                handleOfficeUpload(fakeEvent);
            } else {
                showToast(`Formato .${ext} no soportado para importación.`);
            }
        }

        window.onload = () => {
            initDB();
            lucide.createIcons();
        };