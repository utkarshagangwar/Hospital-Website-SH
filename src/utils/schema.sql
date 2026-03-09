-- ============================================================================
-- HOSPITAL MANAGEMENT DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLE 1: profiles (for staff accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'doctor', 'receptionist')) DEFAULT 'receptionist',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: patients
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  address TEXT,
  blood_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABLE 3: appointments
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'paid', 'unpaid', 'rejected')) DEFAULT 'pending',
  notes TEXT,
  patient_name TEXT,
  appointment_type TEXT,
  fees INTEGER DEFAULT 0,
  paid_amount INTEGER DEFAULT 0,
  mobile_number TEXT,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 4: medical_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  diagnosis TEXT,
  prescription TEXT,
  visit_date DATE,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 5: doctors (public-facing doctor profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  specialization TEXT,
  qualification TEXT,
  experience_years INTEGER,
  bio TEXT,
  image_url TEXT,
  available_days TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 6: reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 7: contact_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 8: audit_logs (for DPDPA compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id UUID,
  target_table TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES RLS
-- ============================================================================
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can insert/update profiles
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- PATIENTS RLS
-- ============================================================================
-- Staff (admin, doctor, receptionist) can read patients
CREATE POLICY "Staff can read patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'receptionist')
    )
  );

-- Staff can insert/update patients
CREATE POLICY "Staff can manage patients" ON patients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'receptionist')
    )
  );

-- ============================================================================
-- APPOINTMENTS RLS
-- ============================================================================
-- Staff can read appointments
CREATE POLICY "Staff can read appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'receptionist')
    )
  );

-- Staff can manage appointments
CREATE POLICY "Staff can manage appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'receptionist')
    )
  );

-- Anyone can create appointment (for public booking)
CREATE POLICY "Anyone can create appointment" ON appointments
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- MEDICAL RECORDS RLS
-- ============================================================================
-- Authenticated users can read medical records
CREATE POLICY "Authenticated can read medical records" ON medical_records
  FOR SELECT USING (auth.role() = 'authenticated');

-- Staff can manage medical records
CREATE POLICY "Staff can manage medical records" ON medical_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- DOCTORS RLS (public-facing)
-- ============================================================================
-- Anyone can read doctors
CREATE POLICY "Anyone can read doctors" ON doctors
  FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage doctors" ON doctors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- REVIEWS RLS
-- ============================================================================
-- Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews" ON reviews
  FOR SELECT USING (is_approved = true);

-- Anyone can insert a review
CREATE POLICY "Anyone can insert review" ON reviews
  FOR INSERT WITH CHECK (true);

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update reviews (approve/reject)
CREATE POLICY "Admins can update reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- CONTACT MESSAGES RLS
-- ============================================================================
-- Anyone can insert a contact message
CREATE POLICY "Anyone can insert contact" ON contact_messages
  FOR INSERT WITH CHECK (true);

-- Admins can read contact messages
CREATE POLICY "Admins can read contact" ON contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- AUDIT LOGS RLS
-- ============================================================================
-- Admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Service role can insert audit logs (for API routes)
CREATE POLICY "Service can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED DATA: Sample doctors (optional - run manually if needed)
-- ============================================================================
-- INSERT INTO doctors (full_name, specialization, qualification, experience_years, bio, available_days)
-- VALUES 
--   ('Dr. John Smith', 'Cardiology', 'MD, FACC', 15, 'Expert in heart diseases and cardiac surgery', 'Mon,Tue,Wed,Thu,Fri'),
--   ('Dr. Sarah Johnson', 'Pediatrics', 'MD, DCH', 10, 'Specialized in child healthcare', 'Mon,Wed,Fri');

-- ============================================================================
-- TABLE 9: services (hospital services managed from admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read services" ON services FOR SELECT USING (true);

-- ============================================================================
-- TABLE 10: hospital_settings (OPD hours, contact info, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hospital_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE hospital_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read settings" ON hospital_settings FOR SELECT USING (true);

-- ============================================================================
-- EXTEND existing tables with admin-required columns
-- ============================================================================

-- Extend appointments with admin fields (fees, payment, patient name, type)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS fees INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_amount INTEGER DEFAULT 0;

-- Extend doctors table with admin fields (schedule, qualifications as JSONB)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS opd_hours TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS opd_schedule JSONB;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications JSONB;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specializations JSONB;

