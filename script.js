// ====================================================================
// PASO CRÍTICO: REEMPLACE ESTA LÍNEA CON SU ID DE CLIENTE REAL
// ====================================================================
const CLIENT_ID = '700704702423-b4gt8np6d4knjbe3dtmoqudu0nska9cv.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'; 

const ROOT_FOLDER_ID = 'root'; 
let currentFolderId = ROOT_FOLDER_ID;
let folderHistory = []; 
let currentFileList = []; // Almacena la lista de archivos para el filtrado

// Inicializa la librería gapi (las funciones initClient, updateSigninStatus, handleAuthClick son iguales)
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        
        document.getElementById('authorize-button').onclick = handleAuthClick;
        document.getElementById('back-button').onclick = goBack;
        
        // Nuevo: Asigna el evento 'input' al campo de filtro
        document.getElementById('filter-input').addEventListener('input', filterFiles);
        
    }).catch(error => {
        console.error("Error al inicializar el cliente de Google:", error);
    });
}

function updateSigninStatus(isSignedIn) {
    const authButton = document.getElementById('authorize-button');
    const driveContainer = document.getElementById('drive-container');
    
    if (isSignedIn) {
        authButton.style.display = 'none';
        driveContainer.style.display = 'block';
        listFolderContent(ROOT_FOLDER_ID); 
    } else {
        authButton.style.display = 'block';
        driveContainer.style.display = 'none';
    }
}

function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

// ====================================================================
// FUNCIONES DE NAVEGACIÓN Y CARGA
// ====================================================================

function listFolderContent(folderId, folderName = 'Mi Unidad') {
    const fileListBody = document.getElementById('file-list-body');
    const backButton = document.getElementById('back-button');
    fileListBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: gray;">Cargando contenido...</td></tr>';
    
    // Resetea la lista de archivos antes de la carga
    currentFileList = []; 
    document.getElementById('filter-input').value = '';

    const q = `'${folderId}' in parents and trashed = false`;

    gapi.client.drive.files.list({
        'q': q,
        // Solicitamos los campos necesarios para la tabla
        'fields': 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)', 
        'pageSize': 100 
    }).then(response => {
        currentFileList = response.result.files || []; // Almacena todos los archivos cargados
        renderFileList(currentFileList); // Renderiza la lista completa

        // Actualizar la interfaz
        currentFolderId = folderId;
        document.getElementById('current-folder-name').textContent = folderName;
        backButton.style.display = (folderId === ROOT_FOLDER_ID) ? 'none' : 'block';
        
    }).catch(error => {
        fileListBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error al cargar: ${error.result.error.message}</td></tr>`;
        console.error("Error de API de Drive:", error);
    });
}

// Función para renderizar la tabla completa (o filtrada)
function renderFileList(files) {
    const fileListBody = document.getElementById('file-list-body');
    fileListBody.innerHTML = ''; // Limpiar la tabla

    if (files.length === 0) {
        fileListBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: orange;">No se encontraron elementos.</td></tr>';
        return;
    }

    // 1. Mostrar las carpetas primero
    const folders = files.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    folders.forEach(folder => {
        fileListBody.appendChild(createTableRow(folder, true));
    });

    // 2. Mostrar los archivos después
    const regularFiles = files.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');
    regularFiles.forEach(file => {
        fileListBody.appendChild(createTableRow(file, false));
    });
}


// Crea una fila (tr) para la tabla
function createTableRow(item, isFolder) {
    const tr = document.createElement('tr');
    
    // Formatear las fechas
    const createdDate = new Date(item.createdTime).toLocaleDateString();
    const modifiedDate = new Date(item.modifiedTime).toLocaleDateString();
    
    // Celda del Nombre (clickable)
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `
        <span style="font-size: 1.1em; margin-right: 5px;">${isFolder ? '📁' : '📄'}</span>
        <a href="${item.webViewLink}" target="_blank" 
           class="${isFolder ? 'folder-link' : 'file-link'}"
           ${isFolder ? `onclick="navigateToFolder(event, '${item.id}', '${item.name}')"` : ''}>
            ${item.name}
        </a>
    `;

    // Celdas de metadatos
    tr.appendChild(nameCell);
    tr.insertCell().textContent = isFolder ? 'Carpeta' : item.mimeType;
    tr.insertCell().textContent = createdDate;
    tr.insertCell().textContent = modifiedDate;
    
    return tr;
}

// ====================================================================
// FUNCIONES DE MANEJO DE VISTAS (Navegación y Filtrado)
// ====================================================================

// Maneja el clic en una carpeta para navegar
function navigateToFolder(event, folderId, folderName) {
    event.preventDefault(); 
    
    if (currentFolderId !== folderId) {
        folderHistory.push({ id: currentFolderId, name: document.getElementById('current-folder-name').textContent });
    }
    
    listFolderContent(folderId, folderName);
}

// Maneja el botón de Volver
function goBack() {
    if (folderHistory.length > 0) {
        const previousFolder = folderHistory.pop();
        listFolderContent(previousFolder.id, previousFolder.name);
    }
}

// Filtra la lista de archivos mostrada en la tabla (no llama a la API)
function filterFiles() {
    const filterText = document.getElementById('filter-input').value.toLowerCase();
    
    // Si no hay texto de filtro, renderiza la lista completa
    if (!filterText) {
        renderFileList(currentFileList);
        return;
    }

    // Filtra los archivos almacenados localmente por el nombre
    const filteredFiles = currentFileList.filter(item => 
        item.name.toLowerCase().includes(filterText)
    );

    renderFileList(filteredFiles);
}

window.onload = handleClientLoad;