const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');
const app = express();

// Configurer la connexion à MySQL
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

// Middleware CORS
app.use(cors());

// Endpoint GET /api/data
app.get('/api/data', (req, res) => {
  // Requêtes SQL pour récupérer les données de plusieurs tables
  const queries = {
    axes: 'SELECT * FROM axes',
    subaxes: 'SELECT * FROM subaxes',
    recommendations: 'SELECT * FROM recommendations',
    questions: 'SELECT * FROM questions',
    responses: 'SELECT * FROM responses',
  };

  const results = {};

  // Fonction pour exécuter les requêtes de manière séquentielle
  const executeQuery = (key, sql, callback) => {
    connection.query(sql, (err, data) => {
      if (err) {
        console.error(`Erreur lors de la récupération des données depuis la table ${key}:`, err);
        res.status(500).json({ error: `Erreur lors de la récupération des données de la table ${key}` });
        return;
      }
      results[key] = data;
      callback();
    });
  };

  // Exécuter les requêtes de manière séquentielle
  const keys = Object.keys(queries);
  const executeNextQuery = (index) => {
    if (index >= keys.length) {
      res.json(results);
      return;
    }
    const key = keys[index];
    executeQuery(key, queries[key], () => executeNextQuery(index + 1));
  };

  executeNextQuery(0);
});

// Endpoint GET /api/diagnostic
app.get('/api/diagnostic', (req, res) => {
  const userId = req.query.userId || 1; // assuming user_id is 1 if not provided

  const query = `
    SELECT 
    q.subaxis_id,
    AVG(us.score) AS average_score
FROM 
    Questions q
JOIN 
    UserScores us ON us.question_id = q.question_id
WHERE 
    us.user_id = 1
GROUP BY 
    q.subaxis_id;

  `;

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Erreur lors du calcul des scores moyens par sous-axe:', error);
      return res.status(500).json({ error: 'Erreur lors du calcul des scores moyens par sous-axe' });
    }

    const recommendations = results.map(row => {
      let recommendation;
      if (row.average_score >= 1.5) {
        recommendation = 'well_mastered';
      } else if (row.average_score >= 0.5) {
        recommendation = 'improvement_needed';
      } else {
        recommendation = 'not_addressed';
      }

      return {
        subaxis_id: row.subaxis_id,
        average_score: row.average_score,
        recommendation: recommendation
      };
    });

    res.json(recommendations);
  });
});

// Autres configurations et middleware

const port = 3001; // Port sur lequel votre serveur backend écoute
app.listen(port, () => {
  console.log(`Serveur backend démarré sur le port ${port}`);
});


