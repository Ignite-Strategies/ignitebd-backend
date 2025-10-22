import { Router, Request, Response } from 'express';

const router = Router();

// Simulate Google Ads campaign
router.post('/ads/simulate', (req: Request, res: Response) => {
  const { budget, estCPC, convRate } = req.body;

  if (typeof budget !== 'number' || typeof estCPC !== 'number' || typeof convRate !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  // Calculate metrics
  const clicks = Math.floor(budget / Math.max(estCPC, 0.01));
  const leads = Math.floor(clicks * convRate);
  const estCPA = leads > 0 ? Math.round(budget / leads) : Infinity;

  // Generate tactical notes
  const notes = [
    '🎯 Tighten keywords to target founder/exec titles',
    '🎨 Test 3 creative variants: problem-focused, stat-heavy, and testimonial',
    '🔄 Add event-based retargeting for website visitors',
    '📊 Set up conversion tracking for demo requests'
  ];

  res.json({
    clicks,
    leads,
    estCPA: estCPA === Infinity ? 'N/A' : estCPA,
    budget,
    notes: notes.slice(0, 3),
    summary: `With $${budget} at $${estCPC}/click and ${Math.round(convRate * 100)}% conversion, expect ~${clicks} clicks → ${leads} leads`
  });
});

// Activate event outreach
router.post('/events/activate', (req: Request, res: Response) => {
  const { eventId, seats = 1 } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  // Mock event data
  const events: Record<string, any> = {
    'saas-summit': { name: 'SaaS Summit 2025', attendees: 350 },
    'founder-forum': { name: 'Founder Forum Q2', attendees: 120 },
    'tech-connect': { name: 'Tech Connect NYC', attendees: 500 }
  };

  const event = events[eventId] || { name: 'Demo Event', attendees: 200 };

  // Generate activation plan
  const tasks = [
    `📋 Export ${event.name} attendee list from event platform`,
    `✉️ Send 3-touch email sequence: pre-event intro, day-of meeting invite, post-event follow-up`,
    `📱 Post event recap + key insights to LinkedIn within 24hrs`,
    `🤝 Schedule 1:1 coffee chats with top 5 priority contacts`
  ];

  const suggestedContacts = [
    { name: 'Sarah Chen', email: 'sarah.chen@demo.co', title: 'VP Growth' },
    { name: 'Marcus Williams', email: 'marcus@startup.io', title: 'Founder & CEO' },
    { name: 'Priya Patel', email: 'priya@scaleup.com', title: 'Head of Sales' }
  ];

  const messageTemplate = `Hi {{firstName}},

Great connecting at ${event.name}! I loved your perspective on activation accounting.

I'm helping founders turn growth plans into trackable momentum using our Ignite Coefficient framework. Would you be open to a 15-min demo to see if it's a fit for {{company}}?

Best,
Joel`;

  res.json({
    eventName: event.name,
    tasks,
    suggestedContacts,
    messageTemplate,
    estimatedReach: Math.floor(event.attendees * 0.6),
    priority: 'high'
  });
});

// Generate content plan
router.post('/content/generate', (req: Request, res: Response) => {
  const contentPlan = {
    week: new Date().toISOString().split('T')[0],
    slots: [
      {
        type: 'long',
        title: 'Why Activation Accounting beats traditional finance for founders',
        format: 'LinkedIn article',
        estTime: '2-3 hours',
        cta: 'Link to Ignite demo'
      },
      {
        type: 'short',
        title: 'The Ignite Coefficient formula (visual explainer)',
        format: 'Carousel post',
        estTime: '45 min',
        cta: 'Download calculator'
      },
      {
        type: 'community',
        title: 'Poll: What % of revenue do you reinvest in growth?',
        format: 'LinkedIn poll',
        estTime: '15 min',
        cta: 'Comment with results'
      }
    ],
    themes: ['Activation Accounting', 'Founder Metrics', 'Revenue Planning'],
    hashtags: ['#FounderMetrics', '#ActivationAccounting', '#B2BGrowth']
  };

  res.json(contentPlan);
});

export default router;

