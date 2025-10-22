import { Router, Request, Response } from 'express';

const router = Router();

// Mock authentication - just sets a demo session
router.post('/mock', (req: Request, res: Response) => {
  const { email } = req.body;
  
  // Set session data
  if (req.session) {
    req.session.user = {
      id: 'demo-' + Date.now(),
      email: email || 'founder@demo.co'
    };
  }
  
  res.json({ 
    success: true, 
    message: 'Mock auth successful',
    user: req.session?.user
  });
});

// Get current user from session
router.get('/me', (req: Request, res: Response) => {
  if (req.session?.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json(null);
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session = null;
  res.json({ success: true });
});

export default router;

