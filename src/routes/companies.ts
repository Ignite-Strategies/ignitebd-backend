import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Create company
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, address, annualRev, adminId } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const company = await prisma.company.create({
      data: {
        name,
        address,
        annualRev: annualRev ? parseFloat(annualRev) : null,
        adminId
      },
      include: {
        admin: true
      }
    });

    res.json(company);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Get company by ID
router.get('/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        admin: true,
        staff: true,
        prospects: true,
        customers: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Update company
router.put('/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { name, address, annualRev } = req.body;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        address,
        annualRev: annualRev ? parseFloat(annualRev) : null
      }
    });

    res.json(company);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Add staff member to company
router.post('/:companyId/staff', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        staff: {
          connect: { id: userId }
        }
      },
      include: {
        staff: true
      }
    });

    res.json(company);
  } catch (err) {
    console.error('Error adding staff member:', err);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

export default router;
