-- Add "Enable Invoice Editing" setting
ALTER TABLE "Settings" ADD COLUMN "enableInvoiceEdit" BOOLEAN NOT NULL DEFAULT false;