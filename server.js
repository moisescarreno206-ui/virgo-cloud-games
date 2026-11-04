const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Directorio donde se almacenan y sirven los juegos en el servidor
const gamesDir = path.join(__dirname, 'public_games');

// Servir archivos estáticos del catálogo de juegos de Virgo Gamer
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
