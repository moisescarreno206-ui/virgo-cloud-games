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

// Función secuencial para descargar y descomprimir de forma ordenada
function descargarYDescomprimirSecuencial(juegos, indice = 0) {
    if (indice >= juegos.length) {
        console.log('[Cloud Engine] ¡Todos los juegos del catálogo han sido procesados con éxito!');
        return;
    }

    const { nombre, fileId } = juegos[indice];
    const destinoJuego = path.join(gamesDir, nombre);
    const archivoZipLocal = path.join(__dirname, `${nombre}.zip`);

    if (!fs.existsSync(destinoJuego)) {
        console.log(`[Cloud Engine] Descargando ${nombre} desde Google Drive...`);
        const urlDirecta = `https://docs.google.com/uc?export=download&confirm=t&id=${fileId}`;
        const file = fs.createWriteStream(archivoZipLocal);

        https.get(urlDirecta, function(response) {
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, function(redirectResponse) {
                    redirectResponse.pipe(file);
                    finalizarYContinuar(file, archivoZipLocal, destinoJuego, nombre, juegos, indice);
                });
            } else {
                response.pipe(file);
                finalizarYContinuar(file, archivoZipLocal, destinoJuego, nombre, juegos, indice);
            }
        }).on('error', function(err) {
            console.error(`[Error Cloud] No se pudo descargar ${nombre}:`, err.message);
            // Continuar con el siguiente aunque haya error
            descargarYDescomprimirSecuencial(juegos, indice + 1);
        });
    } else {
        console.log(`[Cloud Engine] ${nombre} ya listo en servidor.`);
        descargarYDescomprimirSecuencial(juegos, indice + 1);
    }
}

function finalizarYContinuar(fileStream, zipPath, destinoPath, nombreJuego, listaJuegos, indiceActual) {
    fileStream.on('finish', () => {
        fileStream.close(() => {
            console.log(`[Cloud Engine] Descomprimiendo ${nombreJuego}...`);
            try {
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(destinoPath, true);
                console.log(`[Cloud Engine] ¡${nombreJuego} desempacado y listo para streaming!`);
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            } catch (err) {
                console.error(`[Error Unzip] Falló extracción de ${nombreJuego}:`, err);
            }
            // Pasar al siguiente juego de la lista
            descargarYDescomprimirSecuencial(listaJuegos, indiceActual + 1);
        });
    });
}

// 📌 LISTA DE JUEGOS A PROCESAR EN ORDEN:
const listaDeJuegos = [
    { nombre: 'reconquista', fileId: '16swqXpHUI2Dmh4pp2Z9VWXWC5SmPcCik' },
    { nombre: 'kunoichi', fileId: '1Vmojmgmausk4WXXxxldKRu9G13S7KtqR' }
];

// Iniciar proceso en cadena
descargarYDescomprimirSecuencial(listaDeJuegos);

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
