/**
 * One-Time Seed Script: Color Base Names Dictionary
 * 
 * Purpose: Populate the `color_base_names` table with a static perceptual color dictionary
 * 
 * Requirements:
 * - Read CSV file with columns: name,hex
 * - Validate HEX format
 * - Convert HEX → LAB using hexToLab
 * - Validate LAB ranges (L: 0-100, a: -128-127, b: -128-127)
 * - Insert into color_base_names table
 * - Process sequentially (not in parallel)
 * - Fail loudly on any error
 * 
 * Usage:
 *   npx tsx scripts/seedColorBaseName.ts
 * 
 * CSV Format:
 *   name,hex
 *   Red,FF0000
 *   Blue,0000FF
 * 
 * IMPORTANT: This script should be safe to run once. It will not overwrite existing rows.
 */

// Load environment variables from .env file
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { hexToLab, isValidHex } from '../src/utils/colors/labConversion';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

const CSV_FILE_PATH = path.join(__dirname, 'color_dictionary.csv');
const LOG_INTERVAL = 50; // Log progress every N rows
const EPSILON = 0.00001; // Tolerance for floating-point precision errors

// ============================================================================
// Validation
// ============================================================================

function validateEnvironment() {
  if (!SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!SUPABASE_SECRET_KEY) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable');
  }
}

function validateLab(lab: { l: number; a: number; b: number }, hex: string) {
  const { l, a, b } = lab;
  
  // Allow small epsilon for floating-point precision errors
  if (l < (0 - EPSILON) || l > (100 + EPSILON)) {
    throw new Error(`Invalid LAB L value for ${hex}: ${l} (must be 0-100)`);
  }
  
  if (a < (-128 - EPSILON) || a > (127 + EPSILON)) {
    throw new Error(`Invalid LAB a value for ${hex}: ${a} (must be -128 to 127)`);
  }
  
  if (b < (-128 - EPSILON) || b > (127 + EPSILON)) {
    throw new Error(`Invalid LAB b value for ${hex}: ${b} (must be -128 to 127)`);
  }
}

// Clamp LAB values to valid ranges to handle floating-point precision
function clampLab(lab: { l: number; a: number; b: number }): { l: number; a: number; b: number } {
  return {
    l: Math.max(0, Math.min(100, lab.l)),
    a: Math.max(-128, Math.min(127, lab.a)),
    b: Math.max(-128, Math.min(127, lab.b)),
  };
}

// ============================================================================
// CSV Parsing
// ============================================================================

interface ColorRow {
  name: string;
  hex: string;
}

function parseCSV(csvContent: string): ColorRow[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }
  
  // Parse header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const nameIndex = header.indexOf('name');
  const hexIndex = header.indexOf('hex');
  
  if (nameIndex === -1 || hexIndex === -1) {
    throw new Error('CSV must have "name" and "hex" columns');
  }
  
  // Parse rows
  const rows: ColorRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const parts = line.split(',');
    
    if (parts.length < Math.max(nameIndex, hexIndex) + 1) {
      throw new Error(`Row ${i + 1} has insufficient columns: ${line}`);
    }
    
    const name = parts[nameIndex].trim();
    const hex = parts[hexIndex].trim();
    
    if (!name) {
      throw new Error(`Row ${i + 1} has empty name: ${line}`);
    }
    
    if (!hex) {
      throw new Error(`Row ${i + 1} has empty hex: ${line}`);
    }
    
    rows.push({ name, hex });
  }
  
  return rows;
}

// ============================================================================
// Main Seeding Logic
// ============================================================================

async function seedColorBaseNames() {
  console.log('🚀 Starting Color Base Names Seeding...\n');
  
  // Step 1: Validate environment
  console.log('✓ Validating environment variables...');
  validateEnvironment();
  
  // Step 2: Initialize Supabase client
  console.log('✓ Initializing Supabase client...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Step 3: Read CSV file
  console.log(`✓ Reading CSV file: ${CSV_FILE_PATH}...`);
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
  }
  
  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  
  // Step 4: Parse CSV
  console.log('✓ Parsing CSV...');
  const rows = parseCSV(csvContent);
  console.log(`✓ Found ${rows.length} color entries\n`);
  
  // Step 5: Check for existing data
  const { count, error: countError } = await supabase
    .from('color_base_names')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Failed to check existing data: ${countError.message}`);
  }
  
  if (count && count > 0) {
    console.log(`⚠️  Warning: Table already contains ${count} rows`);
    console.log('This script will attempt to insert new rows, skipping duplicates based on HEX uniqueness.\n');
  }
  
  // Step 6: Process each row sequentially
  console.log('📝 Processing colors...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    
    try {
      // Normalize HEX
      let normalizedHex = row.hex.trim().toUpperCase();
      
      // Remove # if present
      if (normalizedHex.startsWith('#')) {
        normalizedHex = normalizedHex.substring(1);
      }
      
      // Validate HEX format
      if (!isValidHex(normalizedHex)) {
        throw new Error(`Invalid HEX format: ${row.hex}`);
      }
      
      // Add # prefix for storage
      const hexWithHash = `#${normalizedHex}`;
      
      // Convert HEX → LAB
      let lab = hexToLab(hexWithHash);
      
      // Validate LAB ranges (with epsilon tolerance)
      validateLab(lab, hexWithHash);
      
      // Clamp to valid ranges to handle floating-point precision
      lab = clampLab(lab);
      
      // Insert into database
      const { error: insertError } = await supabase
        .from('color_base_names')
        .insert({
          name: row.name,
          hex: hexWithHash,
          lab_l: lab.l,
          lab_a: lab.a,
          lab_b: lab.b,
        });
      
      if (insertError) {
        // Check if it's a duplicate key error (unique constraint on hex)
        if (insertError.code === '23505') {
          skipCount++;
          if (rowNumber % LOG_INTERVAL === 0) {
            console.log(`⏭️  Row ${rowNumber}/${rows.length}: Skipped ${row.name} (${hexWithHash}) - already exists`);
          }
        } else {
          throw insertError;
        }
      } else {
        successCount++;
        if (rowNumber % LOG_INTERVAL === 0) {
          console.log(`✓ Row ${rowNumber}/${rows.length}: ${row.name} (${hexWithHash}) → LAB(${lab.l.toFixed(2)}, ${lab.a.toFixed(2)}, ${lab.b.toFixed(2)})`);
        }
      }
      
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error processing row ${rowNumber}:`);
      console.error(`   Name: ${row.name}`);
      console.error(`   HEX: ${row.hex}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
      
      // Fail loudly - stop on first error
      throw new Error(`Seeding failed at row ${rowNumber}. Fix the error and try again.`);
    }
  }
  
  // Step 7: Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`Total rows processed: ${rows.length}`);
  console.log(`Successfully inserted: ${successCount}`);
  console.log(`Skipped (duplicates): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// Run Script
// ============================================================================

seedColorBaseNames()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal Error:');
    console.error(error);
    process.exit(1);
  });
