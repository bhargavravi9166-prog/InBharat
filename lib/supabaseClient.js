import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://peuptnczmieeutgjexmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldXB0bnp4bWl4ZXV0Z2plcG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDMyNDYsImV4cCI6MjEwNjgxOTI0Nn0.4Qrc47Ow1-S5AvqMb25HrwjHTGkj-7wlVcoG-fxavqU';

export const supabase = createClient(supabaseUrl, supabaseKey);
