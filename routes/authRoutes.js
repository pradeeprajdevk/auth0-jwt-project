import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const router = express.Router();

// Initialize jwks-rsa client
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

// Get the key for verifying JWT
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
};

// Signup API
router.post('/signup', async (req, res) => {
  const { email, password, roles } = req.body;

  try {
    const response = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/dbconnections/signup`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        email,
        password,
        connection: 'Username-Password-Authentication',
        user_metadata: { roles },
      }
    );
    res.status(201).json(response.data);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Unable to process signup' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: 'password',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        username: email,
        password: password,
        connection: 'Username-Password-Authentication', // Ensure correct connection name
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        scope: 'openid profile email',
      }
    );

    const token = response.data.access_token;
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Login process failed' });
  }
});

router.get('/verify-token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).send('Token missing');
  }

  try {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).json({ message: 'Invalid token', error: err });
      }
      return res.json({ user: decoded });
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
