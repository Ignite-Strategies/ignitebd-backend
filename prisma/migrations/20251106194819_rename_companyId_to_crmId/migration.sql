-- Rename companyId to crmId in contacts table for clarity
-- companyId was confusing because it's actually CompanyHQId (tenant identifier)
-- crmId makes it clear this is the CRM/tenant identifier, not the company they work for

-- Check if companyId column exists and rename it, otherwise do nothing (idempotent)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'companyId'
    ) THEN
        ALTER TABLE "contacts" RENAME COLUMN "companyId" TO "crmId";
    END IF;
END $$;

