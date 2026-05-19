// --- SISTEMA DE TERMINAL / PANEL DE BIENVENIDA Y DASHBOARD ---

window.selectedDocType = '';
window.selectedLibraryName = '';

// Diccionario de Plantillas Académicas según el Tipo de Documento
const templatesData = {
    'Artículo': [
        {
            name: "IEEE Conference Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "0.75 in / 1.91 cm",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/ieee-conference-template/grfzhhncsfqn"
        },
        {
            name: "ACII 2022 Template (Affective Computing)",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "IEEE Standard",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/acii-2022-template/gqhfwdctrpby"
        },
        {
            name: "IEEE SIEDS 2026 Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "IEEE Standard",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/sieds-template-2026/vdxyvwwwpdqw"
        },
        {
            name: "IEEE INTELEC 2024 Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "IEEE Standard",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/ieee-intelec2024-template/rbbrrwmnskbr"
        }
    ],
    'Tesis': [
        {
            name: "Classic Thesis Template",
            source: "Overleaf",
            typography: "Palatino / Minion Pro",
            margins: "Left: 3.5cm / Right: 2.5cm",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/classic-thesis-style/ysqzqrmtqjqw"
        },
        {
            name: "MIT Thesis Template (Libraries 2024)",
            source: "Overleaf",
            typography: "Computer Modern",
            margins: "MIT Standard",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/mit-thesis-template/wnpqzjmqfvjk"
        }
    ],
    'Tesina': [
        {
            name: "University Dissertation Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "2.54 cm (APA 7th)",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/university-dissertation-template/fqzhqjmgvrcd"
        },
        {
            name: "Simple Monograph / Basic Article",
            source: "Authorea",
            typography: "Garamond",
            margins: "3.0 cm (Wide)",
            columns: 1,
            url: "https://www.authorea.com/templates/simple-article-template"
        },
        {
            name: "Reykjavik University IEEE Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "A4 Standard",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/ieee-conference-template-for-reykjavik-university/ssfhnqtdmgqs"
        }
    ],
    'Ensayo': [
        {
            name: "APA 7th Edition Student Paper",
            source: "Overleaf",
            typography: "Times New Roman / Georgia",
            margins: "2.54 cm (All sides)",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/apa-7th-edition-student-paper/jpmkpjzfntgh"
        },
        {
            name: "MLA Style Essay Template",
            source: "Overleaf",
            typography: "Times New Roman 12pt",
            margins: "1.0 in (2.54 cm)",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/mla-template-2024/txbhfkjflsjq"
        }
    ],
    'Personalizado': [
        {
            name: "Generic Academic Draft",
            source: "Authorea",
            typography: "Inter / Sans-Serif",
            margins: "2.0 cm (Moderate)",
            columns: 1,
            url: "https://www.authorea.com/templates/academic-draft"
        },
        {
            name: "Minimalist Research Proposal",
            source: "Overleaf",
            typography: "Georgia",
            margins: "2.5 cm (Normal)",
            columns: 1,
            url: "https://www.overleaf.com/latex/templates/research-proposal-template/lhqjwzqjmfpr"
        },
        {
            name: "PIRE Fellows Template (OSDC)",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "IEEE Letter",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/a-template-for-pire-fellows-to-present-research-results-using-the-open-science-data-cloud/kkncnjmgqgmz"
        },
        {
            name: "Mechatronics Conference Template",
            source: "Overleaf",
            typography: "Times New Roman",
            margins: "IEEE Standard",
            columns: 2,
            url: "https://www.overleaf.com/latex/templates/tempate-for-the-international-conference-on-mechatronics-mechatronika/pzbvgcwbgszh"
        }
    ]
};
// Seleccionar tipo de documento y desplegar la línea para nombrar la librería
function selectDocumentType(buttonEl, type) {
    window.selectedDocType = type;

    // Quitar clases activas a todos los botones del selector
    const buttons = document.querySelectorAll('.doc-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-[#8c7456]', 'text-white', 'border-amber-500');
        btn.classList.add('bg-stone-800/40', 'text-[#d2c1a5]', 'border-stone-700/60');
    });

    // Activar el botón seleccionado
    buttonEl.classList.remove('bg-stone-800/40', 'text-[#d2c1a5]', 'border-stone-700/60');
    buttonEl.classList.add('bg-[#8c7456]', 'text-white', 'border-amber-500');

    // Mostrar la línea para nombrar la librería
    const nameContainer = document.getElementById('library-name-container');
    if (nameContainer) {
        nameContainer.classList.remove('hidden');
    }
}

// Actualizar el nombre de la librería en memoria
function updateLibraryName(name) {
    window.selectedLibraryName = name;
}

// Crear la librería y transicionar al estado de Dashboard
function createLibrary() {
    const nameInput = document.getElementById('library-name-input');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        showToast("Por favor, ingresa un nombre para la librería.");
        return;
    }

    if (!window.selectedDocType) {
        showToast("Por favor, selecciona un tipo de documento primero.");
        return;
    }

    window.selectedLibraryName = name;
    localStorage.setItem('anticithera_library_name', name);
    localStorage.setItem('anticithera_library_type', window.selectedDocType);

    showTerminalDashboard();
    showToast(`Librería "${name}" creada con éxito.`);
}

// Volver al modo de configuración de la librería
function editLibrarySettings() {
    localStorage.removeItem('anticithera_library_name');
    localStorage.removeItem('anticithera_library_type');

    showTerminalWelcome();

    // Rellenar valores previos en el input
    setTimeout(() => {
        const nameInput = document.getElementById('library-name-input');
        if (nameInput) nameInput.value = window.selectedLibraryName;

        // Reactivar el botón del tipo correspondiente
        const buttons = document.querySelectorAll('.doc-type-btn');
        buttons.forEach(btn => {
            if (btn.innerText === window.selectedDocType) {
                btn.classList.remove('bg-stone-800/40', 'text-[#d2c1a5]', 'border-stone-700/60');
                btn.classList.add('bg-[#8c7456]', 'text-white', 'border-amber-500');
            }
        });

        const nameContainer = document.getElementById('library-name-container');
        if (nameContainer) nameContainer.classList.remove('hidden');
    }, 50);
}

// Mostrar vista de Bienvenida
function showTerminalWelcome() {
    const welcome = document.getElementById('terminal-welcome-state');
    const dashboard = document.getElementById('terminal-dashboard-state');
    if (welcome) welcome.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
}

// Mostrar vista de Dashboard del Proyecto
function showTerminalDashboard() {
    const welcome = document.getElementById('terminal-welcome-state');
    const dashboard = document.getElementById('terminal-dashboard-state');
    if (welcome) welcome.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    // Rellenar cabecera con el Nombre y Tipo de la librería
    const nameEl = document.getElementById('dashboard-library-name');
    const typeEl = document.getElementById('dashboard-document-type');
    if (nameEl) nameEl.innerText = window.selectedLibraryName;
    if (typeEl) typeEl.innerText = `TIPO: ${window.selectedDocType.toUpperCase()}`;

    // Cargar estadísticas, documentos y plantillas sugeridas
    updateStats();
    loadRecentDocs();
    loadRecentNotesCount();
    loadTemplates();

    lucide.createIcons();
}

// Verificar si existe una librería activa guardada en localStorage
function checkActiveLibrary() {
    const savedName = localStorage.getItem('anticithera_library_name');
    const savedType = localStorage.getItem('anticithera_library_type');

    if (savedName && savedType) {
        window.selectedLibraryName = savedName;
        window.selectedDocType = savedType;
        showTerminalDashboard();
    } else {
        showTerminalWelcome();
    }
}

// Cargar los últimos 3 documentos subidos a IndexedDB
function loadRecentDocs() {
    const container = document.getElementById('dashboard-recent-docs');
    if (!container || !db) return;

    const tx = db.transaction('resources', 'readonly');
    const items = [];
    tx.objectStore('resources').openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            items.push(cursor.value);
            cursor.continue();
        } else {
            // Ordenar por fecha de creación (descendente) y tomar los 3 primeros
            const recent = items
                .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                .slice(0, 3);

            container.innerHTML = recent.map(i => {
                let iconName = 'file';
                if (i.type.includes('pdf')) iconName = 'file-text';
                else if (i.type.includes('ipynb')) iconName = 'code-2';
                else if (i.type.includes('docx') || i.type.includes('word')) iconName = 'file-edit';

                return `
                    <div class="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-stone-200 hover:bg-white transition-all shadow-sm">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${iconName}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0">
                                <span class="font-bold text-stone-800 text-xs block leading-tight truncate max-w-[180px]">${i.name}</span>
                                <span class="text-[9px] text-stone-500 font-medium">${i.date || 'Reciente'} • ${i.type.toUpperCase()}</span>
                            </div>
                        </div>
                        <button onclick="navigateTo('libreria')" class="text-[9px] uppercase font-bold text-amber-900 tracking-wider hover:underline flex-shrink-0">
                            Ver
                        </button>
                    </div>
                `;
            }).join('') || '<div class="p-4 text-xs italic text-stone-400 text-center">No hay documentos en la librería todavía.</div>';

            lucide.createIcons();
        }
    };
}

// Cargar plantillas correspondientes al tipo de documento seleccionado
function loadTemplates() {
    const container = document.getElementById('dashboard-templates-container');
    if (!container) return;

    const docType = window.selectedDocType || 'Artículo';
    
    // Búsqueda insensible a mayúsculas/minúsculas y acentos
    const normalizeStr = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matchedKey = Object.keys(templatesData).find(key => normalizeStr(key) === normalizeStr(docType));
    const templates = templatesData[matchedKey] || templatesData['Artículo'];

    // Delay de micro-animación simulando una petición HTTP
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 space-y-2">
            <div class="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Buscando plantillas...</span>
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = templates.map(tmpl => {
            const isOverleaf = tmpl.source === 'Overleaf';
            const badgeBg = isOverleaf ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200';

            return `
                <div class="p-3.5 bg-white/60 rounded-xl border border-stone-200 hover:bg-white hover:border-amber-700/30 transition-all shadow-sm space-y-2.5 animate-fade">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <h4 class="font-bold text-stone-800 text-[12px] block leading-tight truncate">${tmpl.name}</h4>
                            <span class="inline-block mt-1 text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border ${badgeBg}">${tmpl.source}</span>
                        </div>
                        <a href="${tmpl.url}" target="_blank" class="text-[9px] uppercase font-extrabold text-amber-900 tracking-wider hover:underline flex items-center gap-0.5 whitespace-nowrap flex-shrink-0">
                            LaTeX <i data-lucide="external-link" class="w-2.5 h-2.5"></i>
                        </a>
                    </div>
                    
                    <!-- Detalles del diseño (Tipografía / Márgenes) -->
                    <div class="grid grid-cols-2 gap-3 py-1.5 border-t border-b border-stone-200/50 text-[9px] text-stone-500">
                        <div class="min-w-0">
                            <span class="font-bold block text-stone-600 uppercase text-[7px] tracking-wider mb-0.5">Tipografía</span>
                            <span class="flex items-center gap-1 truncate"><i data-lucide="type" class="w-3.5 h-3.5 text-stone-400 flex-shrink-0"></i> ${tmpl.typography}</span>
                        </div>
                        <div class="min-w-0">
                            <span class="font-bold block text-stone-600 uppercase text-[7px] tracking-wider mb-0.5">Márgenes</span>
                            <span class="flex items-center gap-1 truncate"><i data-lucide="square" class="w-3.5 h-3.5 text-stone-400 flex-shrink-0"></i> ${tmpl.margins}</span>
                        </div>
                    </div>
                    
                    <!-- Mini Preview Visual del Layout -->
                    <div class="h-9 bg-stone-100/50 border border-stone-200/60 rounded-lg p-1 flex flex-col justify-center">
                        <div class="flex gap-1 justify-between h-full w-full">
                            <div class="bg-white border border-dashed border-stone-300 w-full rounded flex gap-1 p-1 items-stretch">
                                ${tmpl.columns === 2 ? `
                                    <div class="bg-stone-200/50 w-1/2 rounded"></div>
                                    <div class="bg-stone-200/50 w-1/2 rounded"></div>
                                ` : `
                                    <div class="bg-stone-200/50 w-full rounded"></div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }, 450);
}

// Cargar estadísticas de recursos almacenados de IndexedDB
function updateStats() {
    if (!db) return;

    // Contar Recursos (Documentos)
    const tx = db.transaction('resources', 'readonly');
    tx.objectStore('resources').count().onsuccess = (e) => {
        const countEl = document.getElementById('dashboard-pdf-count');
        const countTerminalEl = document.getElementById('stat-pdf-count');
        if (countEl) countEl.innerText = e.target.result;
        if (countTerminalEl) countTerminalEl.innerText = e.target.result;
    };
}

// Cargar estadísticas de fichas y notas creadas de IndexedDB
function loadRecentNotesCount() {
    if (!db) return;
    const tx = db.transaction('notes', 'readonly');
    tx.objectStore('notes').count().onsuccess = (e) => {
        const countEl = document.getElementById('dashboard-notes-count');
        if (countEl) countEl.innerText = e.target.result;
    };
}

// Mantener compatibilidad con activity logs si el sistema principal los actualiza
function loadActivity() {
    // Implementación vacía para evitar errores si scripts.js intenta llamarla al refrescar
}
