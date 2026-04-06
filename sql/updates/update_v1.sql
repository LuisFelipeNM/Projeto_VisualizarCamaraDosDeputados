ALTER TABLE camara_deputados.discursos
ADD COLUMN IF NOT EXISTS resumo LONGTEXT;

ALTER TABLE camara_deputados.discursos
DROP COLUMN IF EXISTS nome_arquivo;