import { Router } from 'express';

const router = Router();

// Google Ads Simulator
router.post('/ads/simulate', (req, res) => {
  const { budget, estCPC, convRate } = req.body;
  
  if (typeof budget !== 'number' || typeof estCPC !== 'number' || typeof convRate !== 'number') {
    return res.status(400).json({ message: 'Invalid input: budget, estCPC, and convRate must be numbers' });
  }
  
  // Calculate metrics
  const clicks = Math.floor(budget / Math.max(estCPC, 1));
  const leads = Math.floor(clicks * convRate);
  const estCPA = leads > 0 ? budget / leads : Infinity;
  
  res.json({
    clicks,
    leads,
    estCPA: estCPA === Infinity ? 0 : Math.round(estCPA * 100) / 100,
    notes: [
      'Tighten keywords to improve quality score',
      'Test 3 different ad creatives',
      'Add event-based retargeting campaigns'
    ]
  });
});

// Events Outreach Activation
router.post('/events/activate', (req, res) => {
  const { eventId, seats } = req.body;
  
  res.json({
    tasks: [
      'Export attendee list from event platform',
      'Send 3-touch email sequence to warm leads',
      'Post event recap to LinkedIn with key insights'
    ],
    suggestedContacts: [
      { name: 'Sarah Johnson', email: 'sarah@techcorp.com' },
      { name: 'Mike Chen', email: 'mike@startup.io' },
      { name: 'Lisa Rodriguez', email: 'lisa@lawfirm.com' }
    ],
    messageTemplate: `Hi {{firstName}},

I noticed we both attended {{eventName}} and I was impressed by your insights on {{topic}}. 

I'd love to connect and share how we've helped similar businesses in your industry achieve {{outcome}}. 

Would you be open to a brief 15-minute call this week?

Best regards,
{{yourName}}`
  });
});

export default router;
