/**
 * API endpoint to trigger automatic cleanup of old market snapshots
 * Can be called by cron jobs or scheduled tasks
 * 
 * Usage:
 * - Manual: GET /api/cleanup-snapshots
 * - With days: GET /api/cleanup-snapshots?days=20
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Get days parameter (default: 20)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const daysToKeep = daysParam ? parseInt(daysParam, 10) : 20;

    if (isNaN(daysToKeep) || daysToKeep < 1) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Call the cleanup function via Supabase RPC
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/cleanup_old_market_snapshots`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ days_to_keep: daysToKeep }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cleanup function error:', response.status, errorText);
      
      // If function doesn't exist yet, return instructions
      if (response.status === 404 || errorText.includes('function')) {
        return NextResponse.json(
          {
            error: 'Cleanup function not found. Please run migration: supabase/migrations/004_auto_cleanup_function.sql',
            instructions: 'Run the SQL migration in Supabase SQL Editor to create the cleanup function.',
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Cleanup failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Result is an array with one object
    const cleanupResult = Array.isArray(result) ? result[0] : result;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanupResult.deleted_count} old snapshots`,
      deleted_count: cleanupResult.deleted_count,
      remaining_count: cleanupResult.remaining_count,
      cutoff_date: cleanupResult.cleanup_date,
      days_kept: daysToKeep,
    });
  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that prefer POST
export const POST = GET;


