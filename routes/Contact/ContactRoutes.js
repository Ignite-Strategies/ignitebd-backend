import express from 'express';
import prisma from '../../db.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { applyPipelineTriggers } from '../../services/PipelineTriggerService.js';
import { inferWebsiteFromEmail } from '../../services/CompanyEnrichmentService.js';

const router = express.Router();

/**
 * GET /api/contacts?companyHQId=xxx
 * List all contacts for a company (filtered by CompanyHQId)
 * 
 * Query params:
 * - companyHQId (required) - The CompanyHQId (tenant identifier)
 * - pipeline (optional) - Filter by pipeline string value
 * - stage (optional) - Filter by stage string value
 * 
 * Returns:
 * - success: true
 * - contacts: Array of Contact objects with pipeline and contactCompany relations
 */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyHQId, pipeline, stage } = req.query;

    // Validate companyHQId
    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'companyHQId is required'
      });
    }

    // Build where clause
    const where = {
      crmId: companyHQId  // Direct CompanyHQId relationship (renamed from companyId to crmId)
    };

    // Add pipeline filter if provided
    if (pipeline) {
      where.pipeline = {
        pipeline: pipeline
      };
    }

    // Add stage filter if provided
    if (stage) {
      where.pipeline = {
        ...where.pipeline,
        stage: stage
      };
    }

    // Fetch contacts with relations
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        pipeline: true,  // Include Pipeline model
        contactCompany: true  // Include Company they work for
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('❌ GetContacts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts',
      details: error.message
    });
  }
});

/**
 * GET /api/contacts/:contactId
 * Get single contact by ID
 * 
 * Returns:
 * - success: true
 * - contact: Contact object with pipeline and contactCompany relations
 */
router.get('/:contactId', verifyFirebaseToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        pipeline: true,
        contactCompany: true
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    return res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ GetContact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch contact',
      details: error.message
    });
  }
});

/**
 * POST /api/contacts
 * Create a new contact
 * 
 * Body:
 * - crmId (required) - CompanyHQId (tenant identifier) - renamed from companyId for clarity
 * - firstName (optional)
 * - lastName (optional)
 * - goesBy (optional)
 * - email (optional)
 * - phone (optional)
 * - title (optional)
 * - contactCompanyId (optional) - Reference to Company they work for
 * - contactCompanyName (optional) - If provided, will create/find Company
 * - pipeline (optional) - Pipeline string value
 * - stage (optional) - Stage string value
 * - buyerDecision (optional)
 * - howMet (optional)
 * - notes (optional)
 * 
 * Returns:
 * - success: true
 * - contact: Created Contact object with relations
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const {
      crmId,  // CompanyHQId (renamed from companyId for clarity)
      firstName,
      lastName,
      goesBy,
      email,
      phone,
      title,
      contactCompanyId,
      contactCompanyName,  // If provided, create/find Company
      pipeline,
      stage,
      buyerDecision,
      howMet,
      notes
    } = req.body;

    // Validate crmId (CompanyHQId)
    if (!crmId) {
      return res.status(400).json({
        success: false,
        error: 'crmId (CompanyHQId) is required'
      });
    }

    // Verify CompanyHQ exists
    const companyHQ = await prisma.companyHQ.findUnique({
      where: { id: crmId }
    });

    if (!companyHQ) {
      return res.status(404).json({
        success: false,
        error: 'CompanyHQ not found'
      });
    }

    // Handle Company creation/finding if contactCompanyName is provided
    let finalContactCompanyId = contactCompanyId;
    if (contactCompanyName && !contactCompanyId) {
      // Normalize company name for lookup (trim, case-insensitive)
      const normalizedCompanyName = contactCompanyName.trim();
      
      // Find or create Company (case-insensitive lookup)
      const allCompanies = await prisma.company.findMany({
        where: {
          companyHQId: crmId
        }
      });
      
      // Find existing company by normalized name (case-insensitive)
      let company = allCompanies.find(c => 
        c.companyName && c.companyName.trim().toLowerCase() === normalizedCompanyName.toLowerCase()
      );
      
      if (company) {
        // Fetch full company record
        company = await prisma.company.findUnique({
          where: { id: company.id }
        });
      }

      if (!company) {
        company = await prisma.company.create({
          data: {
            companyHQId: crmId,
            companyName: normalizedCompanyName  // Store normalized name
          }
        });
        console.log(`✅ Created new company: ${normalizedCompanyName} for companyHQId: ${crmId}`);
      } else {
        console.log(`✅ Found existing company: ${company.companyName} (id: ${company.id})`);
      }

      finalContactCompanyId = company.id;
    }

    // Check if contact already exists (by email + crmId for uniqueness)
    let contact;
    if (email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          crmId: crmId,
          email: email
        },
        include: {
          pipeline: true,
          contactCompany: true
        }
      });

      if (existingContact) {
        console.log('⚠️ Contact already exists with this email - updating instead of creating:', existingContact.id);
        
        // Update existing contact
        contact = await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            firstName: firstName || existingContact.firstName,
            lastName: lastName || existingContact.lastName,
            goesBy: goesBy || existingContact.goesBy,
            phone: phone || existingContact.phone,
            title: title || existingContact.title,
            contactCompanyId: finalContactCompanyId || existingContact.contactCompanyId,
            buyerDecision: buyerDecision || existingContact.buyerDecision,
            howMet: howMet || existingContact.howMet,
            notes: notes || existingContact.notes
          },
          include: {
            pipeline: true,
            contactCompany: true
          }
        });

        // Update Pipeline if provided
        if (pipeline) {
          await prisma.pipeline.upsert({
            where: { contactId: contact.id },
            update: {
              pipeline: pipeline,
              stage: stage || null
            },
            create: {
              contactId: contact.id,
              pipeline: pipeline,
              stage: stage || null
            }
          });

          // Re-fetch with updated pipeline
          contact = await prisma.contact.findUnique({
            where: { id: contact.id },
            include: {
              pipeline: true,
              contactCompany: true
            }
          });
        }

        console.log('✅ Contact updated:', contact.id);
      } else {
        // Create new contact
        contact = await prisma.contact.create({
          data: {
            crmId: crmId,
            firstName: firstName || null,
            lastName: lastName || null,
            goesBy: goesBy || null,
            email: email ? email.toLowerCase().trim() : null,
            phone: phone || null,
            title: title || null,
            contactCompanyId: finalContactCompanyId || null,
            buyerDecision: buyerDecision || null,
            howMet: howMet || null,
            notes: notes || null,
            // Create Pipeline if pipeline/stage provided
            ...(pipeline && {
              pipeline: {
                create: {
                  pipeline: pipeline,
                  stage: stage || null
                }
              }
            })
          },
          include: {
            pipeline: true,
            contactCompany: true
          }
        });

        console.log('✅ Contact created:', contact.id);
      }
    } else {
      // No email provided - create new contact (can't check for duplicates)
      contact = await prisma.contact.create({
        data: {
          crmId: crmId,
          firstName: firstName || null,
          lastName: lastName || null,
          goesBy: goesBy || null,
          email: email || null,
          phone: phone || null,
          title: title || null,
          contactCompanyId: finalContactCompanyId || null,
          buyerDecision: buyerDecision || null,
          howMet: howMet || null,
          notes: notes || null,
          // Create Pipeline if pipeline/stage provided
          ...(pipeline && {
            pipeline: {
              create: {
                pipeline: pipeline,
                stage: stage || null
              }
            }
          })
        },
        include: {
          pipeline: true,
          contactCompany: true
        }
      });

      console.log('✅ Contact created (no email):', contact.id);
    }

    return res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ CreateContact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      details: error.message
    });
  }
});

/**
 * POST /api/contacts/universal-create
 * Universal contact creation route (handles Contact + Company + Pipeline in one call)
 * Used by ContactManual form
 * 
 * Body:
 * - contact: { crmId, firstName, lastName, goesBy, email, phone, title, buyerDecision, howMet, notes }
 * - company: { companyName, address, industry, revenue, yearsInBusiness } (optional)
 * - pipeline: { pipeline, stage } (optional)
 * 
 * Returns:
 * - success: true
 * - contact: Created Contact object with relations
 */
router.post('/universal-create', verifyFirebaseToken, async (req, res) => {
  try {
    const { contact: contactData, company: companyData, pipeline: pipelineData } = req.body;

    // Validate contact data
    if (!contactData || !contactData.crmId) {
      return res.status(400).json({
        success: false,
        error: 'contact.crmId (CompanyHQId) is required'
      });
    }

    const crmId = contactData.crmId;

    // Verify CompanyHQ exists
    const companyHQ = await prisma.companyHQ.findUnique({
      where: { id: crmId }
    });

    if (!companyHQ) {
      return res.status(404).json({
        success: false,
        error: 'CompanyHQ not found'
      });
    }

    // Handle Company creation/finding if companyData is provided
    let contactCompanyId = contactData.contactCompanyId || null;
    if (companyData && companyData.companyName) {
      // Normalize company name for lookup (trim, case-insensitive)
      const normalizedCompanyName = companyData.companyName.trim();
      
      // Infer website from email if not provided
      let websiteUrl = companyData.website || companyData.url || companyData.companyURL;
      if (!websiteUrl && contactData.email) {
        websiteUrl = inferWebsiteFromEmail(contactData.email);
        if (websiteUrl) {
          console.log(`✅ Inferred website from email: ${websiteUrl}`);
        }
      }

      // Find or create Company (case-insensitive lookup)
      const allCompanies = await prisma.company.findMany({
        where: {
          companyHQId: crmId
        }
      });
      
      // Find existing company by normalized name (case-insensitive)
      let company = allCompanies.find(c => 
        c.companyName && c.companyName.trim().toLowerCase() === normalizedCompanyName.toLowerCase()
      );
      
      if (company) {
        // Fetch full company record
        company = await prisma.company.findUnique({
          where: { id: company.id }
        });
      }

      if (!company) {
        company = await prisma.company.create({
          data: {
            companyHQId: crmId,
            companyName: normalizedCompanyName,  // Store normalized name
            address: companyData.address || null,
            industry: companyData.industry || null,
            website: websiteUrl || null,  // Store inferred or manually entered website
            revenue: companyData.revenue || null,
            yearsInBusiness: companyData.yearsInBusiness || null
          }
        });
        console.log(`✅ Created new company: ${normalizedCompanyName} for companyHQId: ${crmId}`);
        if (websiteUrl) {
          console.log(`✅ Stored website URL: ${websiteUrl}`);
        }
      } else {
        console.log(`✅ Found existing company: ${company.companyName} (id: ${company.id})`);
        if (websiteUrl && !company.website) {
          // Company exists but no website - update with inferred URL
          company = await prisma.company.update({
            where: { id: company.id },
            data: { website: websiteUrl }
          });
          console.log(`✅ Updated company with inferred website URL: ${websiteUrl}`);
        }
      }

      contactCompanyId = company.id;
    } else if (contactData.email) {
      // No company data provided, but we have email - could create company from email domain
      // For now, we'll just log it (user can add company later)
      const inferredUrl = inferWebsiteFromEmail(contactData.email);
      if (inferredUrl) {
        console.log(`💡 Could create company from email domain: ${inferredUrl}`);
      }
    }

    // Check if contact already exists (by email + crmId for uniqueness)
    let contact;
    if (contactData.email) {
      // Normalize email for comparison (lowercase, trimmed)
      const normalizedEmail = contactData.email.toLowerCase().trim();
      
      // Find contacts with matching email (case-insensitive by normalizing in query)
      const allContacts = await prisma.contact.findMany({
        where: {
          crmId: crmId,
          email: { not: null }
        }
      });
      
      // Find existing contact by normalized email comparison
      const existingContact = allContacts.find(c => 
        c.email && c.email.toLowerCase().trim() === normalizedEmail
      );
      
      // If found, fetch full contact with relations and update
      if (existingContact) {
        console.log('⚠️ Contact already exists with this email - updating instead of creating:', existingContact.id);
        
        // Update existing contact
        contact = await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            firstName: contactData.firstName || existingContact.firstName,
            lastName: contactData.lastName || existingContact.lastName,
            goesBy: contactData.goesBy || existingContact.goesBy,
            phone: contactData.phone || existingContact.phone,
            title: contactData.title || existingContact.title,
            contactCompanyId: contactCompanyId || existingContact.contactCompanyId,
            buyerDecision: contactData.buyerDecision || existingContact.buyerDecision,
            howMet: contactData.howMet || existingContact.howMet,
            notes: contactData.notes || existingContact.notes
          },
          include: {
            pipeline: true,
            contactCompany: true
          }
        });

        // Update Pipeline if provided
        if (pipelineData && pipelineData.pipeline) {
          await prisma.pipeline.upsert({
            where: { contactId: contact.id },
            update: {
              pipeline: pipelineData.pipeline,
              stage: pipelineData.stage || null
            },
            create: {
              contactId: contact.id,
              pipeline: pipelineData.pipeline,
              stage: pipelineData.stage || null
            }
          });

          // Re-fetch with updated pipeline
          contact = await prisma.contact.findUnique({
            where: { id: contact.id },
            include: {
              pipeline: true,
              contactCompany: true
            }
          });
        }

        console.log('✅ Contact updated (universal):', contact.id);
      } else {
        // Create new contact
        contact = await prisma.contact.create({
          data: {
            crmId: crmId,
            firstName: contactData.firstName || null,
            lastName: contactData.lastName || null,
            goesBy: contactData.goesBy || null,
            email: contactData.email ? contactData.email.toLowerCase().trim() : null,
            phone: contactData.phone || null,
            title: contactData.title || null,
            contactCompanyId: contactCompanyId,
            buyerDecision: contactData.buyerDecision || null,
            howMet: contactData.howMet || null,
            notes: contactData.notes || null,
            // Create Pipeline if pipelineData provided
            ...(pipelineData && pipelineData.pipeline && {
              pipeline: {
                create: {
                  pipeline: pipelineData.pipeline,
                  stage: pipelineData.stage || null
                }
              }
            })
          },
          include: {
            pipeline: true,
            contactCompany: true
          }
        });

        console.log('✅ Contact created (universal):', contact.id);
      }
    } else {
      // No email provided - create new contact (can't check for duplicates)
        contact = await prisma.contact.create({
          data: {
            crmId: crmId,
            firstName: contactData.firstName || null,
            lastName: contactData.lastName || null,
            goesBy: contactData.goesBy || null,
            email: contactData.email || null,
            phone: contactData.phone || null,
            title: contactData.title || null,
            contactCompanyId: contactCompanyId,
            buyerDecision: contactData.buyerDecision || null,
            howMet: contactData.howMet || null,
            notes: contactData.notes || null,
          // Create Pipeline if pipelineData provided
          ...(pipelineData && pipelineData.pipeline && {
            pipeline: {
              create: {
                pipeline: pipelineData.pipeline,
                stage: pipelineData.stage || null
              }
            }
          })
        },
        include: {
          pipeline: true,
          contactCompany: true
        }
      });

      console.log('✅ Contact created (universal, no email):', contact.id);
    }

    return res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ UniversalCreateContact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      details: error.message
    });
  }
});

/**
 * PUT /api/contacts/:contactId
 * Update a contact
 * 
 * Body: Same as POST, all fields optional
 * Can also update pipeline/stage via pipeline object
 * 
 * Returns:
 * - success: true
 * - contact: Updated Contact object with relations
 */
router.put('/:contactId', verifyFirebaseToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const {
      firstName,
      lastName,
      goesBy,
      email,
      phone,
      title,
      contactCompanyId,
      buyerDecision,
      howMet,
      notes,
      pipeline,  // Pipeline update
      stage      // Stage update
    } = req.body;

    // Check if contact exists
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Build update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (goesBy !== undefined) updateData.goesBy = goesBy;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (title !== undefined) updateData.title = title;
    if (contactCompanyId !== undefined) updateData.contactCompanyId = contactCompanyId;
    if (buyerDecision !== undefined) updateData.buyerDecision = buyerDecision;
    if (howMet !== undefined) updateData.howMet = howMet;
    if (notes !== undefined) updateData.notes = notes;

    // Update contact
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        pipeline: true,
        contactCompany: true
      }
    });

    // Handle Pipeline update if provided
    if (pipeline !== undefined || stage !== undefined) {
      // Get current pipeline to check for triggers
      const currentPipeline = await prisma.pipeline.findUnique({
        where: { contactId: contactId }
      });

      const newPipeline = pipeline !== undefined ? pipeline : (currentPipeline?.pipeline || 'prospect');
      const newStage = stage !== undefined ? stage : (currentPipeline?.stage || null);

      // Check for pipeline triggers (e.g., contract-signed → client kickoff)
      const convertedContact = await applyPipelineTriggers(contactId, newPipeline, newStage);

      if (convertedContact) {
        // Pipeline was auto-converted, return converted contact
        return res.json({
          success: true,
          contact: convertedContact,
          converted: true
        });
      }

      // No conversion, proceed with normal update
      const pipelineUpdate = {};
      if (pipeline !== undefined) pipelineUpdate.pipeline = pipeline;
      if (stage !== undefined) pipelineUpdate.stage = stage;

      // Upsert Pipeline
      await prisma.pipeline.upsert({
        where: { contactId: contactId },
        update: pipelineUpdate,
        create: {
          contactId: contactId,
          pipeline: pipeline || 'prospect',
          stage: stage || null
        }
      });

      // Re-fetch contact with updated pipeline
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          pipeline: true,
          contactCompany: true
        }
      });

      return res.json({
        success: true,
        contact: updatedContact
      });
    }

    console.log('✅ Contact updated:', contact.id);

    return res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('❌ UpdateContact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update contact',
      details: error.message
    });
  }
});

/**
 * POST /api/contacts/cleanup-duplicates
 * Clean up duplicate contacts (keeps the oldest one, deletes the rest)
 * 
 * Query params:
 * - companyHQId (required) - The CompanyHQId (tenant identifier)
 * 
 * Returns:
 * - success: true
 * - deleted: Number of duplicate contacts deleted
 * - kept: Number of contacts kept (one per email)
 */
router.post('/cleanup-duplicates', verifyFirebaseToken, async (req, res) => {
  try {
    const { companyHQId } = req.query;

    if (!companyHQId) {
      return res.status(400).json({
        success: false,
        error: 'companyHQId is required'
      });
    }

    // Find all contacts with emails
    const contacts = await prisma.contact.findMany({
      where: {
        crmId: companyHQId,
        email: { not: null }
      },
      orderBy: {
        createdAt: 'asc' // Oldest first
      }
    });

    // Group by email
    const emailGroups = {};
    contacts.forEach(contact => {
      if (contact.email) {
        const email = contact.email.toLowerCase().trim();
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(contact);
      }
    });

    // For each email group, keep the first (oldest) and delete the rest
    let deletedCount = 0;
    const keptIds = [];

    for (const [email, group] of Object.entries(emailGroups)) {
      if (group.length > 1) {
        // Keep the first one (oldest)
        const keepContact = group[0];
        keptIds.push(keepContact.id);
        console.log(`📧 Email ${email}: Keeping ${keepContact.id}, deleting ${group.length - 1} duplicates`);

        // Delete the rest
        for (let i = 1; i < group.length; i++) {
          await prisma.contact.delete({
            where: { id: group[i].id }
          });
          deletedCount++;
        }
      } else {
        // Only one contact with this email - keep it
        keptIds.push(group[0].id);
      }
    }

    console.log(`✅ Cleanup complete: Deleted ${deletedCount} duplicates, kept ${keptIds.length} unique contacts`);

    return res.json({
      success: true,
      deleted: deletedCount,
      kept: keptIds.length
    });

  } catch (error) {
    console.error('❌ CleanupDuplicates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cleanup duplicates',
      details: error.message
    });
  }
});

/**
 * DELETE /api/contacts/:contactId
 * Delete a contact (cascades to Pipeline)
 * 
 * Returns:
 * - success: true
 * - message: "Contact deleted"
 */
router.delete('/:contactId', verifyFirebaseToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Delete contact (Pipeline will cascade delete)
    await prisma.contact.delete({
      where: { id: contactId }
    });

    console.log('✅ Contact deleted:', contactId);

    return res.json({
      success: true,
      message: 'Contact deleted'
    });

  } catch (error) {
    console.error('❌ DeleteContact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete contact',
      details: error.message
    });
  }
});

export default router;

