#!/usr/bin/env node

// Simple performance test for the optimized CSV loader
import { csvLoader } from './src/services/csvLoader.js';
import fs from 'fs';

async function testPerformance() {
  console.log('🧪 Testing CSV Loader Performance...\n');
  
  // Check file size first
  try {
    const stats = fs.statSync('./public/data.csv');
    console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📁 File modified: ${stats.mtime}\n`);
  } catch (error) {
    console.error('❌ Cannot find data.csv file');
    return;
  }
  
  // Test different row limits
  const testSizes = [1000, 5000, 10000, 25000];
  
  for (const maxRows of testSizes) {
    console.log(`\n📊 Testing with ${maxRows} rows:`);
    console.log('─'.repeat(40));
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    try {
      const result = await csvLoader.loadCSV('./public/data.csv', maxRows);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const duration = (endTime - startTime) / 1000;
      const memoryDiff = endMemory - startMemory;
      
      if (result.success) {
        console.log(`✅ Success: ${result.data.length} rows loaded`);
        console.log(`⏱️  Time: ${duration.toFixed(2)}s`);
        console.log(`🧠 Memory: +${memoryDiff.toFixed(1)}MB`);
        console.log(`📈 Rate: ${(result.data.length / duration).toFixed(0)} rows/sec`);
        if (result.totalRows > result.data.length) {
          console.log(`📊 Total available: ${result.totalRows} rows`);
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Performance test complete!');
}

testPerformance().catch(console.error);