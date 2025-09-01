# RuleTune - Investor Demo Script
*The Future of Financial Crime Detection*

---

## Product Introduction (30 seconds)
Current AML solutions are fragmented – investigators struggle across multiple tools, taking weeks for analysis that should happen in minutes. Worse, analysts can't act on their insights - they depend on IT teams to build new rules based on what they discover.

**RuleTune** is our AI-enhanced investigation platform that puts the full analytics-to-rules pipeline directly in analysts' hands. They can investigate, engineer risk metrics, and immediately translate findings into actionable detection rules.

Let me show you the product by building a live financial crime investigation.

---

## Creating a New Investigation (2 minutes)

**DEMO: Landing Screen - Click "Create New Investigation"**

Let's start fresh. I'll create a new investigation called "High-Risk User Analysis" to demonstrate the complete workflow.

**DEMO: Add Markdown Cell for documentation**
First, I'll document what we're investigating:
*"Analyzing transaction patterns to identify users with suspicious fraud rates and cross-border activity"*

**DEMO: Add Data Cell with SQL query**
Now the core analysis. Like before, users can write their own SQL, but for more complex queries, AI can do this for them - here we can now allow quite general asks, and it'll interpret this with the knowledge of an experienced analyst already.

```
Show me my users with the most declines and frauds
```

**DEMO: Execute query**
Results in seconds. More importantly, a front-line analyst doesn't need to defer to their data team for writing their queries for them - it's all instant, and part of their investigation flow.

**DEMO: Add State Cell for computed risk metrics**
Here's where analytics transforms into actionable rules - computed risk states. I'll create real-time risk indicators:

```sql
-- User decline velocity (last 30 days)
COUNT(CASE WHEN decline = 1 AND txn_date_time >= datetime('now', '-30 days') THEN 1 END) OVER (PARTITION BY user_id)
```

This computed intelligence becomes part of the dataset, empowering analysts to write sophisticated rules based on their own analysis. Instead of requesting new fields from IT, analysts can engineer the exact risk metrics they need and immediately use them for rule creation. 

---

## Visualization & AI Analysis (1.5 minutes)

**DEMO: Add Chart Cell**
Now let's visualize patterns. I'll create a risk scatter plot showing transaction volume vs fraud rate, with geographic diversity as color coding.

**DEMO: Configure and render chart**
Patterns emerge instantly - what takes competitors' customers weeks of manual analysis. This speed advantage translates directly to ROI.

**DEMO: Add AI Cell**
Now our AI layer - trained on financial crime patterns and regulatory frameworks:

**DEMO: Query AI with "Analyze the patterns in this investigation"**

*AI Response: "Based on your analysis, I've identified critical patterns:
1. Users with 15+ countries show 3x higher fraud rates
2. High-volume, low-fraud users may indicate structuring
3. Geographic clusters suggest coordinated activity"*

We're packaging decades of AML expertise into software. This is domain AI that creates immediate value, not generic chatbots.

---

## Platform Economics & Network Effects (1 minute)

**DEMO: Save investigation as "High-Risk User Analysis"**

Here's our business model advantage - every investigation becomes a reusable asset.

**DEMO: Return to landing screen, show saved investigations**

Our customer library includes:
- Advanced Fraud Detection with ML Features
- Cross-Border Financial Network Analysis  
- Merchant Ecosystem & Network Analysis
- Our new "High-Risk User Analysis"

**DEMO: Open one of the pre-built investigations briefly**

This creates powerful network effects. Each customer investigation improves our template library. New customers get immediate value from the institutional knowledge of our entire user base.

Our customers aren't just buying software - they're buying access to the collective intelligence of the financial crime detection community. The more customers we add, the more valuable the platform becomes.

---

## Closing (30 seconds)

You just saw a comprehensive AML investigation built in minutes that traditionally takes weeks of analyst time.

Our solution delivers 10x productivity improvements with embedded AI expertise. 

Thank you for your time.

---
