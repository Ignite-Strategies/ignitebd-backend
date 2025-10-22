// Test script for the simplified assessment demo
import assessmentDemoService from './services/AssessmentDemoService.js';

const testAssessment = {
  name: "John Smith",
  company: "TechStart Inc",
  industry: "SaaS",
  workTooMuch: "often",
  assignTasks: "sometimes",
  wantMoreClients: "yes",
  revenueGrowthPercent: 50,
  totalVolume: 1000000,
  bdSpend: 25000
};

console.log('🧪 Testing simplified assessment demo...');
console.log('Input:', testAssessment);

assessmentDemoService(testAssessment)
  .then(result => {
    console.log('\n✅ Assessment Demo Result:');
    console.log('Success:', result.success);
    console.log('\n📝 Relate with User:');
    console.log(result.assessmentDemo.relateWithUser);
    console.log('\n🎯 Growth Needs:');
    console.log(result.assessmentDemo.growthNeeds);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
