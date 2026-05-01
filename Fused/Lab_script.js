/**
 * Módulo de Laboratorio para Anticithera
 * Gestión de Jupyter Notebooks y renderizado HTML plano con soporte completo para imágenes.
 */

function initLaboratorio() {
    console.log("Laboratorio de Inteligencia Científica Inicializado");
    loadNotebooksList();
}

/**
 * Función auxiliar para normalizar el contenido de las celdas
 */
function getSafeContent(source) {
    if (!source) return "";
    if (Array.isArray(source)) return source.join("");
    return source.toString();
}

/**
 * Carga y renderiza la lista de notebooks disponibles en el panel lateral
 */
async function loadNotebooksList() {
    const listContainer = document.getElementById('lab-notebooks-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="text-center py-10"><p class="text-[10px] uppercase font-bold text-stone-400 animate-pulse">Buscando notebooks...</p></div>';

    try {
        const tx = db.transaction('resources', 'readonly');
        const store = tx.objectStore('resources');
        const notebooks = [];

        store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                if (cursor.value.name.toLowerCase().endsWith('.ipynb')) {
                    notebooks.push(cursor.value);
                }
                cursor.continue();
            } else {
                renderNotebooksSidebar(notebooks);
            }
        };
    } catch (err) {
        console.error("Error al cargar lista de notebooks:", err);
        listContainer.innerHTML = '<p class="text-red-500 text-[10px] text-center">Error al cargar recursos</p>';
    }
}

function renderNotebooksSidebar(notebooks) {
    const listContainer = document.getElementById('lab-notebooks-list');
    if (notebooks.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10">
                <p class="text-[10px] uppercase font-bold text-stone-400 italic">No hay notebooks importados</p>
            </div>`;
        return;
    }

    listContainer.innerHTML = '';
    notebooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(nb => {
        const item = document.createElement('div');
        item.className = "p-3 bg-white/50 border border-stone-300/50 rounded-lg cursor-pointer hover:bg-white hover:border-amber-700 transition-all group flex items-center gap-3";
        item.onclick = () => openNotebookInLab(nb.id);

        item.innerHTML = `
            <div class="p-2 bg-amber-50 rounded text-amber-900 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                <i data-lucide="layout" class="w-3.5 h-3.5"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-stone-700 truncate">${escapeHtml(nb.name)}</h4>
                <p class="text-[8px] uppercase font-bold text-stone-400 mt-0.5">${new Date(nb.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        listContainer.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeLabNotebook() {
    document.getElementById('lab-notebook-view').classList.add('hidden');
    document.getElementById('lab-no-selection').classList.remove('hidden');
}

/**
 * Normaliza los datos de salida de Jupyter (asegura que text sea string, no array)
 */
function normalizeOutputData(data) {
    const normalized = {};
    for (let key in data) {
        const value = data[key];
        if (Array.isArray(value)) {
            normalized[key] = value.join('');
        } else if (typeof value === 'string') {
            normalized[key] = value;
        } else {
            normalized[key] = value;
        }
    }
    return normalized;
}

/**
 * Renderiza un notebook cargado desde IndexedDB como HTML plano
 */
async function openNotebookInLab(id) {
    if (typeof navigateTo === 'function') navigateTo('laboratorio');

    document.getElementById('lab-no-selection').classList.add('hidden');
    document.getElementById('lab-notebook-view').classList.remove('hidden');

    const container = document.getElementById('lab-notebook-content');
    const titleEl = document.getElementById('lab-notebook-title');

    container.innerHTML = '<div class="py-20 flex flex-col items-center justify-center animate-pulse"><i data-lucide="cpu" class="w-12 h-12 text-amber-800 mb-4 animate-bounce"></i><p class="text-sm font-bold uppercase text-stone-500 tracking-widest">Renderizando notebook...</p></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const tx = db.transaction('resources', 'readonly');
        const store = tx.objectStore('resources');

        store.get(id).onsuccess = async (e) => {
            const res = e.target.result;
            if (!res) return;

            titleEl.innerText = res.name;
            const nbText = await res.blob.text();

            try {
                const nbData = JSON.parse(nbText);
                container.innerHTML = '';

                const notebookDiv = document.createElement('div');
                notebookDiv.className = 'notebook-renderer max-w-none prose prose-stone prose-sm lg:prose-base';
                container.appendChild(notebookDiv);

                if (nbData.cells && Array.isArray(nbData.cells)) {
                    for (let idx = 0; idx < nbData.cells.length; idx++) {
                        const cell = nbData.cells[idx];
                        const cellDiv = document.createElement('div');
                        cellDiv.className = 'notebook-cell mb-8 border-l-2 border-stone-200 pl-4';

                        if (cell.cell_type === 'markdown') {
                            const markdownContent = getSafeContent(cell.source);
                            // Procesar markdown con marked, que manejará las imágenes correctamente
                            let html = await marked.parse(markdownContent);
                            // Sanitizar pero permitir imágenes
                            html = DOMPurify.sanitize(html, {
                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                    'ul', 'ol', 'li', 'a', 'img', 'code', 'pre', 'span', 'div', 'blockquote',
                                    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'figure', 'figcaption'],
                                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'width', 'height', 'style']
                            });
                            const mdDiv = document.createElement('div');
                            mdDiv.className = 'markdown-cell';
                            mdDiv.innerHTML = html;
                            cellDiv.appendChild(mdDiv);
                        }
                        else if (cell.cell_type === 'code') {
                            const codeContent = getSafeContent(cell.source);
                            const codeBlock = document.createElement('div');
                            codeBlock.className = 'code-cell mb-4';

                            let lang = 'python';
                            if (cell.metadata && cell.metadata.language) lang = cell.metadata.language;
                            else if (cell.metadata && cell.metadata.kernel) lang = cell.metadata.kernel.language || 'python';

                            const pre = document.createElement('pre');
                            const code = document.createElement('code');
                            code.className = `language-${lang}`;
                            code.textContent = codeContent;
                            pre.appendChild(code);
                            codeBlock.appendChild(pre);

                            if (typeof Prism !== 'undefined') {
                                Prism.highlightElement(code);
                            }

                            cellDiv.appendChild(codeBlock);

                            if (cell.outputs && cell.outputs.length > 0) {
                                const outputsDiv = document.createElement('div');
                                outputsDiv.className = 'outputs-area mt-3 space-y-3';
                                for (const output of cell.outputs) {
                                    const outputDiv = document.createElement('div');
                                    outputDiv.className = 'output-item bg-stone-50 rounded p-3 border border-stone-200';
                                    await renderOutput(output, outputDiv);
                                    outputsDiv.appendChild(outputDiv);
                                }
                                cellDiv.appendChild(outputsDiv);
                            }
                        }
                        else if (cell.cell_type === 'raw') {
                            const rawContent = getSafeContent(cell.source);
                            const rawDiv = document.createElement('div');
                            rawDiv.className = 'raw-cell text-stone-500 text-sm italic';
                            rawDiv.textContent = rawContent;
                            cellDiv.appendChild(rawDiv);
                        }

                        notebookDiv.appendChild(cellDiv);
                    }
                }

                if (window.MathJax) {
                    await MathJax.typesetPromise([container]);
                }

            } catch (parseErr) {
                console.error("Error al renderizar notebook:", parseErr);
                container.innerHTML = `<div class="p-8 text-red-800 bg-red-50 border border-red-200 rounded-xl font-bold">Error al procesar el notebook: ${escapeHtml(parseErr.message)}</div>`;
            }
        };
    } catch (err) {
        console.error("Error crítico de lectura:", err);
        container.innerHTML = `<div class="p-8 text-red-800 bg-red-50 border border-red-200 rounded-xl font-bold">Error fatal al cargar el notebook: ${escapeHtml(err.message)}</div>`;
    }
}

/**
 * Renderiza una salida de celda de Jupyter con soporte completo para imágenes
 */
async function renderOutput(output, container) {
    container.innerHTML = '';

    if (output.output_type === 'stream') {
        let text = '';
        if (Array.isArray(output.text)) {
            text = output.text.join('');
        } else if (typeof output.text === 'string') {
            text = output.text;
        } else {
            text = String(output.text || '');
        }
        const pre = document.createElement('pre');
        pre.className = 'output-stream text-sm font-mono whitespace-pre-wrap bg-stone-100 p-2 rounded';
        pre.textContent = text;
        container.appendChild(pre);
    }
    else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
        let data = output.data;
        if (!data) return;

        // Normalizar datos (convertir arrays a strings)
        data = normalizeOutputData(data);

        // Priorizar HTML
        if (data['text/html']) {
            let html = data['text/html'];
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['div', 'span', 'p', 'img', 'svg', 'path', 'circle', 'rect', 'g', 'line',
                    'polyline', 'polygon', 'text', 'tspan', 'table', 'tr', 'td', 'th', 'thead',
                    'tbody', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i'],
                ALLOWED_ATTR: ['src', 'alt', 'width', 'height', 'style', 'class', 'id', 'd', 'fill', 'stroke',
                    'stroke-width', 'viewBox', 'xmlns', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry']
            });
            const div = document.createElement('div');
            div.className = 'output-html overflow-x-auto';
            div.innerHTML = html;
            container.appendChild(div);
        }
        // Imagen PNG (base64)
        else if (data['image/png']) {
            let imgSrc = data['image/png'];
            if (!imgSrc.startsWith('data:image')) {
                imgSrc = `data:image/png;base64,${imgSrc}`;
            }
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'max-w-full h-auto border rounded shadow-sm my-2';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            container.appendChild(img);
        }
        // Imagen JPEG (base64)
        else if (data['image/jpeg']) {
            let imgSrc = data['image/jpeg'];
            if (!imgSrc.startsWith('data:image')) {
                imgSrc = `data:image/jpeg;base64,${imgSrc}`;
            }
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'max-w-full h-auto border rounded shadow-sm my-2';
            img.style.maxWidth = '100%';
            container.appendChild(img);
        }
        // Imagen GIF (base64)
        else if (data['image/gif']) {
            let imgSrc = data['image/gif'];
            if (!imgSrc.startsWith('data:image')) {
                imgSrc = `data:image/gif;base64,${imgSrc}`;
            }
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'max-w-full h-auto my-2';
            container.appendChild(img);
        }
        // SVG (puede venir como texto plano)
        else if (data['image/svg+xml']) {
            let svg = data['image/svg+xml'];
            svg = DOMPurify.sanitize(svg);
            const div = document.createElement('div');
            div.className = 'output-svg';
            div.innerHTML = svg;
            container.appendChild(div);
        }
        // Texto plano (a veces contiene representaciones de imágenes)
        else if (data['text/plain']) {
            const text = data['text/plain'];
            const pre = document.createElement('pre');
            pre.className = 'output-plain text-sm font-mono whitespace-pre-wrap';
            pre.textContent = text;
            container.appendChild(pre);
        }
        else {
            // Intentar encontrar cualquier imagen en los datos
            let foundImage = false;
            for (let key in data) {
                if (key.startsWith('image/')) {
                    let imgSrc = data[key];
                    if (!imgSrc.startsWith('data:image')) {
                        imgSrc = `data:${key};base64,${imgSrc}`;
                    }
                    const img = document.createElement('img');
                    img.src = imgSrc;
                    img.className = 'max-w-full h-auto my-2';
                    container.appendChild(img);
                    foundImage = true;
                    break;
                }
            }

            if (!foundImage) {
                const pre = document.createElement('pre');
                pre.className = 'text-xs text-stone-500 overflow-x-auto';
                pre.textContent = JSON.stringify(data, null, 2);
                container.appendChild(pre);
            }
        }
    }
    else if (output.output_type === 'error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'output-error text-red-700 bg-red-50 p-2 rounded border border-red-200 font-mono text-sm';
        const errorName = output.ename || 'Error';
        const errorValue = output.evalue || '';
        let traceback = '';
        if (Array.isArray(output.traceback)) {
            traceback = output.traceback.join('\n');
        } else if (output.traceback) {
            traceback = String(output.traceback);
        }
        errorDiv.innerHTML = `<strong>${escapeHtml(errorName)}</strong>: ${escapeHtml(errorValue)}<pre class="mt-2 text-xs overflow-x-auto">${escapeHtml(traceback)}</pre>`;
        container.appendChild(errorDiv);
    }
    else {
        const pre = document.createElement('pre');
        pre.className = 'text-xs text-stone-500 overflow-x-auto';
        pre.textContent = JSON.stringify(output, null, 2);
        container.appendChild(pre);
    }
}

/**
 * Escapa caracteres especiales para prevenir XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Función global para abrir notebook (expuesta para usar desde otros módulos)
 */
window.openNotebookInLab = openNotebookInLab;