const mysql = require('mysql2');
const cors = require('cors');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'devops_groupe7_bdd',
  port: 3306
});

connection.connect(function(err) {
  if (err) {
    console.error('Erreur de connexion à MySQL:', err.stack);
    return;
  }
  console.log('Connecté à MySQL en tant qu\'ID', connection.threadId);
});

const express = require('express');
const app = express();


app.use(cors());

// Endpoint GET /api/data
app.get('/api/data', (req, res) => {
  // Requête SQL pour récupérer les données
  const sql = 'SELECT * FROM questions'; // Remplacez "votre_table" par le nom de votre table réelle

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des données depuis MySQL:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des données' });
      return;
    }
    // Renvoyer les données au format JSON
    res.json(results);
  });
});

// Autres configurations et middleware

const port = 3001; // Port sur lequel votre serveur backend écoute
app.listen(port, () => {
  console.log(`Serveur backend démarré sur le port ${port}`);
});

