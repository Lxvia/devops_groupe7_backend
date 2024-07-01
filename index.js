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

// Middleware CORS et JSON
app.use(cors());
app.use(express.json()); // Pour parser les requêtes avec JSON

// Endpoint GET /api/data pour récupérer les données initiales
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

// Endpoint POST /api/users pour créer un nouvel utilisateur
app.post('/api/users', (req, res) => {
  const { name } = req.body; // Récupérer 'name' depuis le corps de la requête

  if (!name) {
    return res.status(400).json({ error: 'Invalid request. Please provide a name.' });
  }

  // Valeurs en dur pour password_hash et email (NON SÉCURISÉ, À ÉVITER EN PRODUCTION)
  const passwordHash = 'password_hash_value'; // Valeur en dur du hachage du mot de passe
  const email = 'example@example.com'; // Adresse email en dur
  const role = 'user';

  const query = 'INSERT INTO Users (name, password_hash, email, role) VALUES (?, ?, ?, ?)';
  connection.query(query, [name, passwordHash, email, role], (err, results) => {
    if (err) {
      console.error('Erreur lors de la création de l\'utilisateur:', err);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }

    res.status(200).json({ userId: results.insertId });
  });
});

// Endpoint GET /api/users pour récupérer les utilisateurs avec userId et name
app.get('/api/users', (req, res) => {
  const query = 'SELECT user_id AS userId, name FROM Users';
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
    res.status(200).json(results);
  });
});


// Endpoint POST /api/responses pour enregistrer les réponses
app.post('/api/responses', (req, res) => {
  const { responses, userId } = req.body;

  if (!responses || !userId) {
    return res.status(400).json({ error: 'Invalid request. Please provide responses and userId.' });
  }

  const values = Object.keys(responses).map(questionId => [
    userId,
    parseInt(questionId, 10),
    parseInt(responses[questionId], 10)
  ]);

  const query = `
    INSERT INTO UserScores (user_id, question_id, score)
    VALUES ?
    ON DUPLICATE KEY UPDATE
    score = VALUES(score)
  `;

  connection.query(query, [values], (err, results) => {
    if (err) {
      console.error('Erreur lors de l\'insertion des réponses:', err);
      return res.status(500).json({ error: 'Erreur lors de l\'insertion des réponses' });
    }

    res.status(200).json({ message: 'Réponses enregistrées avec succès' });
  });
});

// Endpoint GET /api/resultat/:userId pour récupérer les scores moyens par sous-axe et les recommandations
app.get('/api/resultat/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT 
      q.subaxis_id,
      AVG(us.score) AS average_score
    FROM 
      Questions q
    JOIN 
      UserScores us ON us.question_id = q.question_id
    WHERE 
      us.user_id = ?
    GROUP BY 
      q.subaxis_id;
  `;

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Erreur lors du calcul des scores moyens par sous-axe:', error);
      return res.status(500).json({ error: 'Erreur lors du calcul des scores moyens par sous-axe' });
    }

    // Récupération des recommandations basées sur average_score
    const scoresWithRecommendations = results.map(row => {
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

    res.json(scoresWithRecommendations);
  });
});



const port = 3001; // Port sur lequel votre serveur backend écoute
app.listen(port, () => {
  console.log(`Serveur backend démarré sur le port ${port}`);
});

