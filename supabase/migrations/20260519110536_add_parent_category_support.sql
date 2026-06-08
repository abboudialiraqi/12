/*
  # Add parent_id to categories for sub-category support

  1. Changes
    - Add `parent_id` column (nullable FK to categories.id) so categories can be nested one level deep
    - Index on parent_id for fast child lookups

  2. Notes
    - Existing rows keep parent_id = NULL (they remain top-level)
    - Deleting a parent sets children's parent_id to NULL (SET NULL)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE categories
      ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
  END IF;
END $$;
