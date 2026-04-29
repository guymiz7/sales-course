-- Multi-attachments per lesson (URL or uploaded file)
CREATE TABLE IF NOT EXISTS public.lesson_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'file', -- file | image | video | audio | url
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_attachments_lesson_idx
  ON public.lesson_attachments (lesson_id, order_num);

ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "lesson_attachments_select_all" ON public.lesson_attachments
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lesson_attachments_admin_all" ON public.lesson_attachments
    FOR ALL USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
