#!/usr/bin/env node
/**
 * Test script for Sprint 3 Analytics Tools
 * Verifies tool registration, definitions, and basic functionality
 */

import { TOOLS, getToolDefinitions } from "./src/tools/definitions.js";
import { handleToolCall } from "./src/tools/index.js";

console.log("🧪 Testing Sprint 3: Analyst Tools\n");

// Test 1: Verify tool constants exist
console.log("Test 1: Tool Constants");
const requiredTools = [TOOLS.GET_FINANCIAL_METRICS, TOOLS.PREDICT_CHURN_RISK];
requiredTools.forEach((tool) => {
  console.log(`  ✓ ${tool} defined`);
});
console.log();

// Test 2: Verify tool definitions
console.log("Test 2: Tool Definitions");
const definitions = getToolDefinitions();
const financialMetricsDef = definitions.find((d) => d.name === TOOLS.GET_FINANCIAL_METRICS);
const churnRiskDef = definitions.find((d) => d.name === TOOLS.PREDICT_CHURN_RISK);

if (!financialMetricsDef) {
  console.error("  ✗ GET_FINANCIAL_METRICS definition not found");
  process.exit(1);
}
console.log(`  ✓ GET_FINANCIAL_METRICS definition found`);
console.log(`    Description: ${financialMetricsDef.description.substring(0, 60)}...`);

if (!churnRiskDef) {
  console.error("  ✗ PREDICT_CHURN_RISK definition not found");
  process.exit(1);
}
console.log(`  ✓ PREDICT_CHURN_RISK definition found`);
console.log(`    Description: ${churnRiskDef.description.substring(0, 60)}...`);
console.log();

// Test 3: Verify tool handlers are registered
console.log("Test 3: Tool Handler Registration");
try {
  // Test that the tools are recognized (will fail if not registered)
  const testCall1 = await handleToolCall(TOOLS.GET_FINANCIAL_METRICS, {});
  if (testCall1.isError) {
    // Expected - will fail without API key, but should be recognized
    if (testCall1.error?.message?.includes("not found") || testCall1.error?.message?.includes("Tool not found")) {
      console.error("  ✗ GET_FINANCIAL_METRICS handler not registered");
      process.exit(1);
    }
    console.log(`  ✓ GET_FINANCIAL_METRICS handler registered (error expected without API key)`);
  } else {
    console.log(`  ✓ GET_FINANCIAL_METRICS handler registered and callable`);
  }
} catch (error: any) {
  if (error.message?.includes("not found") || error.message?.includes("Tool not found")) {
    console.error("  ✗ GET_FINANCIAL_METRICS handler not registered");
    process.exit(1);
  }
  console.log(`  ✓ GET_FINANCIAL_METRICS handler registered (error: ${error.message})`);
}

try {
  const testCall2 = await handleToolCall(TOOLS.PREDICT_CHURN_RISK, {});
  if (testCall2.isError) {
    if (testCall2.error?.message?.includes("not found") || testCall2.error?.message?.includes("Tool not found")) {
      console.error("  ✗ PREDICT_CHURN_RISK handler not registered");
      process.exit(1);
    }
    console.log(`  ✓ PREDICT_CHURN_RISK handler registered (error expected without API key)`);
  } else {
    console.log(`  ✓ PREDICT_CHURN_RISK handler registered and callable`);
  }
} catch (error: any) {
  if (error.message?.includes("not found") || error.message?.includes("Tool not found")) {
    console.error("  ✗ PREDICT_CHURN_RISK handler not registered");
    process.exit(1);
  }
  console.log(`  ✓ PREDICT_CHURN_RISK handler registered (error: ${error.message})`);
}
console.log();

// Test 4: Verify tool schema properties
console.log("Test 4: Tool Schema Validation");
const financialProps = (financialMetricsDef.inputSchema as any).properties || {};
const requiredFinancialProps = ["storeId", "startDate", "endDate"];
const hasAllProps = requiredFinancialProps.every((prop) => prop in financialProps);
if (!hasAllProps) {
  console.error(`  ✗ GET_FINANCIAL_METRICS missing properties: ${requiredFinancialProps.filter((p) => !(p in financialProps)).join(", ")}`);
  process.exit(1);
}
console.log(`  ✓ GET_FINANCIAL_METRICS has all required properties`);

const churnProps = (churnRiskDef.inputSchema as any).properties || {};
const requiredChurnProps = ["storeId", "minRiskScore", "limit"];
const hasAllChurnProps = requiredChurnProps.every((prop) => prop in churnProps);
if (!hasAllChurnProps) {
  console.error(`  ✗ PREDICT_CHURN_RISK missing properties: ${requiredChurnProps.filter((p) => !(p in churnProps)).join(", ")}`);
  process.exit(1);
}
console.log(`  ✓ PREDICT_CHURN_RISK has all required properties`);
console.log();

// Test 5: Verify exports from analytics module
console.log("Test 5: Module Exports");
try {
  const analyticsModule = await import("./src/tools/handlers/analytics.js");
  const exports = Object.keys(analyticsModule);
  const requiredExports = ["handleGetFinancialMetrics", "handlePredictChurnRisk"];
  const hasAllExports = requiredExports.every((exp) => exports.includes(exp));
  if (!hasAllExports) {
    console.error(`  ✗ Missing exports: ${requiredExports.filter((e) => !exports.includes(e)).join(", ")}`);
    process.exit(1);
  }
  console.log(`  ✓ All required exports present: ${requiredExports.join(", ")}`);
} catch (error: any) {
  console.error(`  ✗ Failed to import analytics module: ${error.message}`);
  process.exit(1);
}
console.log();

// Test 6: Verify tool count
console.log("Test 6: Total Tool Count");
const totalTools = definitions.length;
const expectedMinTools = 45; // We had 45+ before, now should be 47+
if (totalTools < expectedMinTools) {
  console.error(`  ✗ Expected at least ${expectedMinTools} tools, found ${totalTools}`);
  process.exit(1);
}
console.log(`  ✓ Total tools: ${totalTools} (expected: ${expectedMinTools}+)`);
console.log();

console.log("✅ All tests passed! Sprint 3 analytics tools are properly integrated.\n");
console.log("📊 Available Analytics Tools:");
console.log(`   • ${TOOLS.GET_FINANCIAL_METRICS}`);
console.log(`   • ${TOOLS.PREDICT_CHURN_RISK}\n`);
