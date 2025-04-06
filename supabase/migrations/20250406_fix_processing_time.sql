
-- Módosítsuk az document_extraction_results tábla processing_time mezőjét BIGINT típusúra
ALTER TABLE public.document_extraction_results ALTER COLUMN processing_time TYPE BIGINT;

-- Hozzunk létre SQL függvényeket a document_ocr_logs és document_extraction_results táblák lekérdezéséhez
-- (Hogy elkerüljük a TypeScript típushibákat)
CREATE OR REPLACE FUNCTION public.get_ocr_logs()
RETURNS SETOF public.document_ocr_logs
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.document_ocr_logs ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_extraction_result(log_id UUID)
RETURNS SETOF public.document_extraction_results
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.document_extraction_results 
    WHERE ocr_log_id = log_id;
$$;
