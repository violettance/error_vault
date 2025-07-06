-- Create emails table for landing page email collection
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_emails_email ON public.emails(email);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (for email collection)
CREATE POLICY "Allow email inserts" ON public.emails
    FOR INSERT WITH CHECK (true);

-- Create policy to allow selects (for admin access)
CREATE POLICY "Allow email selects" ON public.emails
    FOR SELECT USING (true); 