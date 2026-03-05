-- ================================================
-- SALES COURSE PLATFORM - Supabase Schema
-- Copy-paste this into Supabase SQL Editor
-- ================================================

-- 1. Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'student', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cohorts (מחזורים)
CREATE TABLE public.cohorts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User ↔ Cohort (enrollment)
CREATE TABLE public.user_cohorts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id)
);

-- 5. Lessons
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  google_drive_file_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Questions
CREATE TABLE public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Question reads (per-user read tracking)
CREATE TABLE public.question_reads (
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (question_id, user_id)
);

-- 8. Replies
CREATE TABLE public.replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- users: can read own row; admin reads all
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- courses, cohorts, lessons: all authenticated users read; admin writes
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "courses_all" ON public.courses FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "cohorts_select" ON public.cohorts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cohorts_all" ON public.cohorts FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "lessons_select" ON public.lessons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lessons_all" ON public.lessons FOR ALL USING (public.get_my_role() = 'admin');

-- user_cohorts: student sees own; admin sees all
CREATE POLICY "user_cohorts_select" ON public.user_cohorts FOR SELECT
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "user_cohorts_insert" ON public.user_cohorts FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- questions: student sees public in own cohort + own private; admin sees all
CREATE POLICY "questions_select" ON public.questions FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR (
      is_private = FALSE
      AND cohort_id IN (SELECT cohort_id FROM public.user_cohorts WHERE user_id = auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "questions_insert" ON public.questions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "questions_update" ON public.questions FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- question_reads: each user manages own reads
CREATE POLICY "reads_select" ON public.question_reads FOR SELECT
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "reads_insert" ON public.question_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- replies: all authenticated users read; admin writes
CREATE POLICY "replies_select" ON public.replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "replies_insert" ON public.replies FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- ================================================
-- TRIGGER: auto-create user profile on signup
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- MAKE YOURSELF ADMIN (run after first signup)
-- Replace 'your@email.com' with your email
-- ================================================

-- UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
