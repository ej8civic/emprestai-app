-- Spec 003, T1. Aditiva: colunas anuláveis, item sem foto continua listado.
ALTER TABLE "equipment"
  ADD COLUMN "image_url"        text,
  ADD COLUMN "image_source"     text,
  ADD COLUMN "image_author"     text,
  ADD COLUMN "image_license"    text,
  ADD COLUMN "image_source_url" text;
