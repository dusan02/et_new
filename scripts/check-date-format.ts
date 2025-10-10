#!/usr/bin/env tsx

import { isoDate } from '../src/modules/shared/utils/date.utils.js';

console.log('📅 isoDate():', isoDate());
console.log('📅 new Date(isoDate() + T00:00:00.000Z):', new Date(isoDate() + 'T00:00:00.000Z').toISOString());

// Porovnaj s dátami v DB
const dbDate = new Date('2025-10-10T00:00:00.000Z');
const apiDate = new Date(isoDate() + 'T00:00:00.000Z');

console.log('📊 DB date:', dbDate.toISOString());
console.log('📊 API date:', apiDate.toISOString());
console.log('📊 Dates equal:', dbDate.getTime() === apiDate.getTime());
