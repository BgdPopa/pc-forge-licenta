-- Accelerează căutarea full-text din catalog pe numele și descrierea produsului.
CREATE INDEX "products_full_text_idx"
ON "products"
USING GIN (
  to_tsvector(
    'simple',
    COALESCE("name", '') || ' ' || COALESCE("description", '')
  )
);
