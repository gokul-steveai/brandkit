-- Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('viewer', 'author', 'admin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_kits table
CREATE TABLE public.brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    
    -- Brand colors (stored as JSON array)
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    additional_colors JSONB DEFAULT '[]'::jsonb,
    
    -- Typography
    heading_font TEXT,
    body_font TEXT,
    
    -- Logo URLs
    logo_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    
    -- Brand voice and style
    brand_voice TEXT,
    tagline TEXT,
    
    -- Progress tracking (0-100)
    completion_percentage INTEGER DEFAULT 0,
    
    -- Metadata
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_kit_categories junction table
CREATE TABLE public.brand_kit_categories (
    brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (brand_kit_id, category_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_categories ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
            AND role = _role
    )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles 
    WHERE user_id = _user_id 
    ORDER BY 
        CASE role 
            WHEN 'admin' THEN 1 
            WHEN 'author' THEN 2 
            WHEN 'viewer' THEN 3 
        END
    LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- RLS Policies for brand_kits
CREATE POLICY "Viewers can view brand kits they have access to"
ON public.brand_kits FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authors can create brand kits"
ON public.brand_kits FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND (public.has_role(auth.uid(), 'author') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Authors can update their own brand kits"
ON public.brand_kits FOR UPDATE
TO authenticated
USING (
    (user_id = auth.uid() AND (public.has_role(auth.uid(), 'author') OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    (user_id = auth.uid() AND (public.has_role(auth.uid(), 'author') OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authors can delete their own brand kits"
ON public.brand_kits FOR DELETE
TO authenticated
USING (
    (user_id = auth.uid() AND (public.has_role(auth.uid(), 'author') OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Anyone can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for brand_kit_categories
CREATE POLICY "Users can view brand kit categories"
ON public.brand_kit_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authors can manage their brand kit categories"
ON public.brand_kit_categories FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.brand_kits 
        WHERE id = brand_kit_id 
        AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Function to handle new user signup (creates profile and assigns default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    -- Assign default 'author' role (so users can create brand kits)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'author');
    
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_kits_updated_at
    BEFORE UPDATE ON public.brand_kits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
    ('Technology', 'Tech companies and startups'),
    ('E-commerce', 'Online retail and shopping'),
    ('Healthcare', 'Medical and health services'),
    ('Finance', 'Banking and financial services'),
    ('Education', 'Schools and learning platforms'),
    ('Food & Beverage', 'Restaurants and food brands'),
    ('Travel', 'Tourism and hospitality'),
    ('Entertainment', 'Media and entertainment'),
    ('Other', 'Miscellaneous brands');