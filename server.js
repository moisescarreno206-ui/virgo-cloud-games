const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3000;

// Directorio donde se almacenan y sirven los juegos
const gamesDir = path.join(__dirname, 'public_games');
if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir);

// Función para descargar y descomprimir automáticamente el ZIP de Google Drive
function descargarYDescomprimir(nombreJuego, fileId) {
    const destinoJuego = path.join(gamesDir, nombreJuego);
    const archivoZipLocal = path.join(__dirname, `${nombreJuego}.zip`);

    if (!fs.existsSync(destinoJuego)) {
        console.log(`[Cloud Engine] Descargando ${nombreJuego} desde Google Drive...`);
        const urlDirecta = `https://docs.google.com/uc?export=download&id=${fileId}`;
        const file = fs.createWriteStream(archivoZipLocal);

        https.get(urlDirecta, function(response) {
            // Manejar redirecciones de Google Drive si es necesario
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, function(redirectResponse) {
                    redirectResponse.pipe(file);
                    finalizarDescarga(file, archivoZipLocal, destinoJuego, nombreJuego);
                });
            } else {
                response.pipe(file);
                finalizarDescarga(file, archivoZipLocal, destinoJuego, nombreJuego);
            }
        }).on('error', function(err) {
            console.error(`[Error Cloud] No se pudo descargar ${nombreJuego}:`, err.message);
        });
    } else {
        console.log(`[Cloud Engine] ${nombreJuego} ya listo en servidor.`);
    }
}

function finalizarDescarga(fileStream, zipPath, destinoPath, nombreJuego) {
    fileStream.on('finish', () => {
        fileStream.close(() => {
            console.log(`[Cloud Engine] Descomprimiendo ${nombreJuego}...`);
            try {
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(destinoPath, true);
                console.log(`[Cloud Engine] ¡${nombreJuego} desempacado y listo para streaming!`);
                // Limpiar el archivo ZIP para ahorrar espacio en la nube
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            } catch (err) {
                console.error(`[Error Unzip] Falló extracción de ${nombreJuego}:`, err);
            }
        });
    });
}

// 📌 CONFIGURACIÓN DE JUEGOS CON TUS IDS DE GOOGLE DRIVE:
// Reemplaza 'ID_RECONQUISTA' y 'ID_KUNOICHI' por el ID de tus archivos compartidos
// Ejemplo: descargarYDescomprimir('reconquista', '1A2b3C4d5E6f7G8h9I0j');
// descargarYDescomprimir('reconquista', 'TU_ID_DE_GOOGLE_DRIVE_RECONQUISTA');
// descargarYDescomprimir('kunoichi', 'TU_ID_DE_GOOGLE_DRIVE_KUNOICHI');

// Servir archivos estáticos descomprimidos
app.use(express.static(gamesDir));

// API del catálogo para Virgo Gamer
app.get('/api/catalogo', (req, res) => {
    res.json([
        {
            id: 'reconquista',
            nombre: 'Princess Reconquista',
            estado: 'Disponible',
            ruta: '/reconquista/index.html'
        },
        {
            id: 'kunoichi',
            nombre: 'Kunoichi Ninja',
            estado: 'Disponible',
            ruta: '/kunoichi/index.html'
        }
    ]);
});

app.listen(PORT, () => {
    console.log(`🚀 Nodo Cloud Virgo Gamer activo en puerto ${PORT}`);
});
