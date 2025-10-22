import { Router } from 'express';

const router = Router();

// Mock authentication endpoint
router.post('/mock', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  // Set a mock session
  req.session.user = {
    id: 'demo-user',
    email: email
  };
  
  res.json({ 
    message: 'Authentication successful',
    user: req.session.user
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.json(null);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ message: 'Logged out successfully' });
});

export default router;
