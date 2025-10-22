import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// Create new company
router.post('/', async (req, res) => {
  try {
    const { name, address, yearsInBusiness, industry, annualRevenue, adminId } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ error: 'Company name and admin ID are required' });
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        address,
        yearsInBusiness,
        industry,
        annualRevenue,
        adminId
      },
      include: {
        admin: true
      }
    });

    console.log('✅ Company created:', company.id);
    res.json(company);

  } catch (error) {
    console.error('❌ Company creation failed:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Join existing company
router.post('/join', async (req, res) => {
  try {
    const { inviteCode, adminId } = req.body;

    if (!inviteCode || !adminId) {
      return res.status(400).json({ error: 'Invite code and admin ID are required' });
    }

    // Find company by invite code (you might want to add an inviteCode field to Company model)
    const company = await prisma.company.findFirst({
      where: { 
        // Assuming you have an inviteCode field, or you could use name as invite code for demo
        name: inviteCode 
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Add admin to company (you might need to create a CompanyMember model for many-to-many)
    // For now, we'll just return the company
    console.log('✅ Admin joined company:', company.id);
    res.json({ 
      message: 'Successfully joined company',
      companyId: company.id,
      company: company
    });

  } catch (error) {
    console.error('❌ Join company failed:', error);
    res.status(500).json({ error: 'Failed to join company' });
  }
});

// Get company by ID
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        admin: true,
        customers: true,
        prospects: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('❌ Failed to fetch company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Update company
router.put('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, address, yearsInBusiness, industry, annualRevenue } = req.body;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        address,
        yearsInBusiness,
        industry,
        annualRevenue
      }
    });

    console.log('✅ Company updated:', company.id);
    res.json(company);
  } catch (error) {
    console.error('❌ Company update failed:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

export default router;
