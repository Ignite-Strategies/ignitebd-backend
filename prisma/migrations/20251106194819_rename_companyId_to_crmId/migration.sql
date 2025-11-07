-- Rename companyId to crmId in contacts table for clarity
-- companyId was confusing because it's actually CompanyHQId (tenant identifier)
-- crmId makes it clear this is the CRM/tenant identifier, not the company they work for

ALTER TABLE "contacts" RENAME COLUMN "companyId" TO "crmId";

