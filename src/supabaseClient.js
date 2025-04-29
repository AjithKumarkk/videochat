import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://donqjpjmrddtavteszsv.supabase.co' // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbnFqcGptcmRkdGF2dGVzenN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQxMzYsImV4cCI6MjA2MTUyMDEzNn0.S1nomYksVPkOVY-FUWE_SMYYcGGoRYFBtyTuZEzX6l4' // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey)