# Target Snowflake Architecture

Purpose: describe the future-state Snowflake-centric implementation target for the broader platform.
Audience: architecture and roadmap planning.
Status: future

Private Markets Debt Monitoring Platform — Pure Snowflake Architecture

## Architecture Overview

| Component | Snowflake Feature | Configuration |
|-----------|------------------|---------------|
| Frontend | SPCS (nginx + React) | 1 container, CPU_X64_XS |
| Backend | None | Frontend calls SQL API directly |
| Compute | Virtual Warehouses | WH_APP (X-SMALL), WH_PIPELINE (SMALL) |
| Storage | Internal Stage + Tables | Bronze/Silver/Gold/Marts |
| Processing | Streams + Tasks | Event-driven, 1-min schedule |
| AI/ML | Cortex AI Functions | PARSE_DOCUMENT, CLASSIFY_TEXT, etc. |
| Security | RLS + Native Auth | Row Access Policies, OAuth |
| Telemetry | Event Tables + ACCOUNT_USAGE | Full observability |

---

## 1. Compute Pool (SPCS)

```sql
CREATE COMPUTE POOL CP_FRONTEND
  MIN_NODES = 1
  MAX_NODES = 1
  INSTANCE_FAMILY = CPU_X64_XS
  AUTO_RESUME = TRUE
  AUTO_SUSPEND_SECS = 300;
```

### Frontend Service

```sql
CREATE SERVICE frontend
  IN COMPUTE POOL CP_FRONTEND
  FROM SPECIFICATION $$
  spec:
    containers:
    - name: nginx
      image: /sesamestreet/images/frontend:latest
    endpoints:
    - name: ui
      port: 80
      public: true
  $$
  LOG_LEVEL = INFO
  EVENT_TABLE_COLUMNS = (TIMESTAMP, RESOURCE_ATTRIBUTES, RECORD);
```

---

## 2. Virtual Warehouses

```sql
CREATE WAREHOUSE WH_APP
  WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;

CREATE WAREHOUSE WH_PIPELINE
  WAREHOUSE_SIZE = 'SMALL'
  AUTO_SUSPEND = 120
  AUTO_RESUME = TRUE;
```

| Warehouse | Size | Use Case |
|-----------|------|----------|
| WH_APP | X-SMALL | Frontend SQL API queries |
| WH_PIPELINE | SMALL | Tasks, Stored Procedures, Cortex AI |

---

## 3. Database & Schemas

```sql
CREATE DATABASE SESAMESTREET_PROD
  DATA_RETENTION_TIME_IN_DAYS = 90
  LOG_LEVEL = INFO
  TRACE_LEVEL = ON_EVENT;

CREATE SCHEMA BRONZE;
CREATE SCHEMA SILVER;
CREATE SCHEMA GOLD;
CREATE SCHEMA MARTS;
CREATE SCHEMA EVENTS;
```

### 3.1 BRONZE Schema (Raw Ingestion)

```sql
CREATE STAGE @BRONZE.DOCUMENTS
  DIRECTORY = (ENABLE = TRUE);

CREATE TABLE BRONZE.DOCUMENT_REGISTRY (
  document_id VARCHAR DEFAULT UUID_STRING(),
  stage_path VARCHAR NOT NULL,
  checksum VARCHAR(64),
  filename VARCHAR,
  mime_type VARCHAR,
  size_bytes INT,
  received_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  status VARCHAR DEFAULT 'pending',
  CONSTRAINT pk_doc PRIMARY KEY (document_id)
);

CREATE PIPE BRONZE.PIPE_DOCUMENTS
  AUTO_INGEST = TRUE
AS COPY INTO BRONZE.DOCUMENT_REGISTRY (stage_path, filename)
   FROM (SELECT $1, METADATA$FILENAME FROM @BRONZE.DOCUMENTS);
```

### 3.2 SILVER Schema (Extraction/Staging)

```sql
CREATE TRANSIENT TABLE SILVER.PROPOSED_FACTS (
  fact_id VARCHAR DEFAULT UUID_STRING(),
  document_id VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  value VARIANT,
  confidence FLOAT,
  source_citation VARIANT,
  tier INT DEFAULT 2,
  status VARCHAR DEFAULT 'pending',
  reviewed_by VARCHAR,
  reviewed_at TIMESTAMP_NTZ,
  CONSTRAINT pk_fact PRIMARY KEY (fact_id),
  CONSTRAINT fk_doc FOREIGN KEY (document_id) REFERENCES BRONZE.DOCUMENT_REGISTRY(document_id)
);

CREATE TABLE SILVER.EXTRACTION_LOG (
  run_id VARCHAR DEFAULT UUID_STRING(),
  document_id VARCHAR,
  tokens_used INT,
  model VARCHAR,
  duration_ms INT,
  completed_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### 3.3 GOLD Schema (Canonical Entities)

```sql
CREATE TABLE GOLD.CLIENT (
  client_id VARCHAR PRIMARY KEY,
  client_name VARCHAR NOT NULL,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE GOLD.INVESTMENT (
  investment_id VARCHAR PRIMARY KEY,
  client_id VARCHAR NOT NULL,
  investment_name VARCHAR NOT NULL,
  borrower_name VARCHAR,
  commitment NUMERIC(18,2),
  funded_amount NUMERIC(18,2),
  investment_type VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES GOLD.CLIENT(client_id)
);

CREATE TABLE GOLD.FINANCIAL_PERIOD (
  period_id VARCHAR PRIMARY KEY,
  investment_id VARCHAR NOT NULL,
  period_end_date DATE NOT NULL,
  reported_metrics VARIANT,
  ratios VARIANT,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT fk_inv FOREIGN KEY (investment_id) REFERENCES GOLD.INVESTMENT(investment_id)
);

CREATE TABLE GOLD.COVENANT (
  covenant_id VARCHAR PRIMARY KEY,
  investment_id VARCHAR NOT NULL,
  covenant_type VARCHAR NOT NULL,
  threshold_value NUMERIC(18,4),
  threshold_operator VARCHAR,
  frequency VARCHAR,
  CONSTRAINT fk_inv FOREIGN KEY (investment_id) REFERENCES GOLD.INVESTMENT(investment_id)
);

CREATE TABLE GOLD.COVENANT_TEST (
  test_id VARCHAR PRIMARY KEY,
  covenant_id VARCHAR NOT NULL,
  period_id VARCHAR NOT NULL,
  tested_value NUMERIC(18,4),
  passed BOOLEAN,
  tested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT fk_cov FOREIGN KEY (covenant_id) REFERENCES GOLD.COVENANT(covenant_id)
);

CREATE TABLE GOLD.ASSESSMENT (
  assessment_id VARCHAR PRIMARY KEY,
  investment_id VARCHAR NOT NULL,
  assessment_date DATE NOT NULL,
  grade VARCHAR(2),
  risk_score NUMERIC(5,2),
  trend VARCHAR,
  CONSTRAINT fk_inv FOREIGN KEY (investment_id) REFERENCES GOLD.INVESTMENT(investment_id)
);
```

### 3.4 MARTS Schema (Dynamic Tables)

```sql
CREATE DYNAMIC TABLE MARTS.DT_TOPSHEET
  TARGET_LAG = '1 minute'
  WAREHOUSE = WH_PIPELINE
AS
SELECT
  i.investment_id,
  i.investment_name,
  i.borrower_name,
  i.client_id,
  a.grade,
  a.risk_score,
  a.trend,
  fp.reported_metrics,
  fp.ratios,
  OBJECT_CONSTRUCT(
    'investment', OBJECT_CONSTRUCT(*),
    'latest_period', fp.*,
    'assessment', a.*
  ) AS data
FROM GOLD.INVESTMENT i
LEFT JOIN GOLD.ASSESSMENT a ON i.investment_id = a.investment_id
LEFT JOIN GOLD.FINANCIAL_PERIOD fp ON i.investment_id = fp.investment_id
QUALIFY ROW_NUMBER() OVER (PARTITION BY i.investment_id ORDER BY a.assessment_date DESC, fp.period_end_date DESC) = 1;

CREATE DYNAMIC TABLE MARTS.DT_PORTFOLIO
  TARGET_LAG = '5 minutes'
  WAREHOUSE = WH_PIPELINE
AS
SELECT
  client_id,
  COUNT(DISTINCT investment_id) AS deal_count,
  SUM(commitment) AS total_commitment,
  SUM(funded_amount) AS total_funded,
  COUNT(CASE WHEN a.grade IN ('A','B') THEN 1 END) AS healthy_count,
  COUNT(CASE WHEN a.grade IN ('D','E') THEN 1 END) AS watchlist_count
FROM GOLD.INVESTMENT i
LEFT JOIN GOLD.ASSESSMENT a USING (investment_id)
GROUP BY client_id;

CREATE DYNAMIC TABLE MARTS.DT_ALERTS
  TARGET_LAG = '1 minute'
  WAREHOUSE = WH_PIPELINE
AS
SELECT * FROM EVENTS.EVENT_LOG
WHERE event_type LIKE 'Alert%'
  AND created_at > DATEADD('day', -7, CURRENT_TIMESTAMP());
```

### 3.5 EVENTS Schema (Audit + Telemetry)

```sql
CREATE TABLE EVENTS.EVENT_LOG (
  event_id VARCHAR DEFAULT UUID_STRING(),
  event_type VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id VARCHAR,
  actor_id VARCHAR,
  payload VARIANT,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_event PRIMARY KEY (event_id)
);
REVOKE UPDATE, DELETE ON EVENTS.EVENT_LOG FROM ROLE PUBLIC;

CREATE EVENT TABLE EVENTS.SNOWFLAKE_EVENTS;

ALTER DATABASE SESAMESTREET_PROD SET
  LOG_LEVEL = INFO
  TRACE_LEVEL = ON_EVENT
  EVENT_TABLE = EVENTS.SNOWFLAKE_EVENTS;
```

---

## 4. Streams

```sql
CREATE STREAM STR_NEW_DOCS
  ON TABLE BRONZE.DOCUMENT_REGISTRY
  APPEND_ONLY = TRUE;

CREATE STREAM STR_APPROVED
  ON TABLE SILVER.PROPOSED_FACTS;

CREATE STREAM STR_GOLD
  ON SCHEMA GOLD;

CREATE STREAM STR_ALERTS
  ON TABLE EVENTS.EVENT_LOG;
```

---

## 5. Stored Procedures

### 5.1 Document Extraction

```sql
CREATE OR REPLACE PROCEDURE SP_EXTRACT_DOCUMENTS()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  ALTER SESSION SET QUERY_TAG = 'pipeline:extract';
  
  INSERT INTO SILVER.PROPOSED_FACTS (document_id, field_name, value, confidence)
  SELECT
    s.document_id,
    f.key AS field_name,
    f.value AS value,
    0.95 AS confidence
  FROM STR_NEW_DOCS s,
    LATERAL FLATTEN(
      SNOWFLAKE.CORTEX.PARSE_DOCUMENT(
        GET_PRESIGNED_URL(@BRONZE.DOCUMENTS, s.stage_path),
        {'mode': 'LAYOUT'}
      ):content
    ) f
  WHERE s.status = 'pending';
  
  UPDATE BRONZE.DOCUMENT_REGISTRY
  SET status = 'extracted'
  WHERE document_id IN (SELECT document_id FROM STR_NEW_DOCS);
  
  INSERT INTO EVENTS.EVENT_LOG (event_type, entity_type, entity_id, payload)
  SELECT 'DocumentExtracted', 'Document', document_id, 
         OBJECT_CONSTRUCT('filename', filename)
  FROM STR_NEW_DOCS;
  
  RETURN 'OK';
END;
$$;
```

### 5.2 Engine Cascade

```sql
CREATE OR REPLACE PROCEDURE SP_RUN_ENGINES()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  ALTER SESSION SET QUERY_TAG = 'pipeline:engines';
  
  CALL SP_TEST_COVENANTS();
  CALL SP_CALC_VARIANCE();
  CALL SP_CALC_GRADES();
  CALL SP_CHECK_ALERTS();
  
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE PROCEDURE SP_TEST_COVENANTS()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  INSERT INTO GOLD.COVENANT_TEST (covenant_id, period_id, tested_value, passed)
  SELECT
    c.covenant_id,
    fp.period_id,
    fp.ratios:debt_to_ebitda::NUMERIC AS tested_value,
    CASE c.threshold_operator
      WHEN '<' THEN fp.ratios:debt_to_ebitda < c.threshold_value
      WHEN '>' THEN fp.ratios:debt_to_ebitda > c.threshold_value
      WHEN '<=' THEN fp.ratios:debt_to_ebitda <= c.threshold_value
      WHEN '>=' THEN fp.ratios:debt_to_ebitda >= c.threshold_value
    END AS passed
  FROM GOLD.COVENANT c
  JOIN GOLD.FINANCIAL_PERIOD fp USING (investment_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM GOLD.COVENANT_TEST ct
    WHERE ct.covenant_id = c.covenant_id AND ct.period_id = fp.period_id
  );
  
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE PROCEDURE SP_CALC_GRADES()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  MERGE INTO GOLD.ASSESSMENT tgt
  USING (
    SELECT
      investment_id,
      CURRENT_DATE() AS assessment_date,
      CASE
        WHEN fail_rate = 0 THEN 'A'
        WHEN fail_rate < 0.1 THEN 'B'
        WHEN fail_rate < 0.3 THEN 'C'
        WHEN fail_rate < 0.5 THEN 'D'
        ELSE 'E'
      END AS grade,
      fail_rate * 100 AS risk_score
    FROM (
      SELECT investment_id,
             COUNT(CASE WHEN NOT passed THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) AS fail_rate
      FROM GOLD.COVENANT_TEST ct
      JOIN GOLD.COVENANT c USING (covenant_id)
      GROUP BY investment_id
    )
  ) src ON tgt.investment_id = src.investment_id AND tgt.assessment_date = src.assessment_date
  WHEN MATCHED THEN UPDATE SET grade = src.grade, risk_score = src.risk_score
  WHEN NOT MATCHED THEN INSERT (assessment_id, investment_id, assessment_date, grade, risk_score)
    VALUES (UUID_STRING(), src.investment_id, src.assessment_date, src.grade, src.risk_score);
  
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE PROCEDURE SP_CHECK_ALERTS()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  INSERT INTO EVENTS.EVENT_LOG (event_type, entity_type, entity_id, payload)
  SELECT
    'AlertCreated',
    'Investment',
    a.investment_id,
    OBJECT_CONSTRUCT('grade', a.grade, 'investment_name', i.investment_name)
  FROM GOLD.ASSESSMENT a
  JOIN GOLD.INVESTMENT i USING (investment_id)
  WHERE a.assessment_date = CURRENT_DATE()
    AND a.grade IN ('D', 'E')
    AND NOT EXISTS (
      SELECT 1 FROM EVENTS.EVENT_LOG e
      WHERE e.entity_id = a.investment_id
        AND e.event_type = 'AlertCreated'
        AND e.created_at::DATE = CURRENT_DATE()
    );
  
  RETURN 'OK';
END;
$$;
```

---

## 6. Tasks

```sql
CREATE TASK TASK_EXTRACT
  WAREHOUSE = WH_PIPELINE
  SCHEDULE = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('STR_NEW_DOCS')
AS CALL SP_EXTRACT_DOCUMENTS();

CREATE TASK TASK_ENGINE
  WAREHOUSE = WH_PIPELINE
  SCHEDULE = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('STR_APPROVED')
AS CALL SP_RUN_ENGINES();

CREATE TASK TASK_NOTIFY
  WAREHOUSE = WH_APP
  SCHEDULE = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('STR_ALERTS')
AS
BEGIN
  FOR alert IN (
    SELECT * FROM STR_ALERTS WHERE event_type = 'AlertCreated'
  ) DO
    CALL SYSTEM$SEND_EMAIL(
      'alerts@company.com',
      'Alert: ' || alert.payload:investment_name::STRING,
      'Grade changed to ' || alert.payload:grade::STRING
    );
  END FOR;
END;

ALTER TASK TASK_EXTRACT RESUME;
ALTER TASK TASK_ENGINE RESUME;
ALTER TASK TASK_NOTIFY RESUME;
```

---

## 7. Security

### 7.1 Roles

```sql
CREATE ROLE CLIENT_ROLE;
CREATE ROLE HAM_ROLE;
CREATE ROLE PM_ROLE;
CREATE ROLE ADMIN_ROLE;

GRANT ROLE CLIENT_ROLE TO ROLE HAM_ROLE;
GRANT ROLE HAM_ROLE TO ROLE PM_ROLE;
GRANT ROLE PM_ROLE TO ROLE ADMIN_ROLE;

GRANT USAGE ON WAREHOUSE WH_APP TO ROLE CLIENT_ROLE;
GRANT USAGE ON DATABASE SESAMESTREET_PROD TO ROLE CLIENT_ROLE;
GRANT USAGE ON SCHEMA MARTS TO ROLE CLIENT_ROLE;
GRANT SELECT ON ALL DYNAMIC TABLES IN SCHEMA MARTS TO ROLE CLIENT_ROLE;
```

### 7.2 Row Access Policy

```sql
CREATE ROW ACCESS POLICY rap_client
AS (client_id VARCHAR) RETURNS BOOLEAN ->
  client_id = CURRENT_ROLE()
  OR IS_ROLE_IN_SESSION('ADMIN_ROLE');

ALTER TABLE GOLD.INVESTMENT ADD ROW ACCESS POLICY rap_client ON (client_id);
ALTER TABLE GOLD.FINANCIAL_PERIOD ADD ROW ACCESS POLICY rap_client ON (client_id);
ALTER TABLE GOLD.ASSESSMENT ADD ROW ACCESS POLICY rap_client ON (client_id);
```

### 7.3 Authentication

```sql
CREATE SECURITY INTEGRATION si_oauth
  TYPE = EXTERNAL_OAUTH
  ENABLED = TRUE
  EXTERNAL_OAUTH_TYPE = CUSTOM
  EXTERNAL_OAUTH_ISSUER = '<issuer_url>'
  EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'email'
  EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'EMAIL_ADDRESS'
  EXTERNAL_OAUTH_JWS_KEYS_URL = '<jwks_url>';
```

---

## 8. Telemetry & Observability

### 8.1 Event Table Setup

```sql
CREATE EVENT TABLE EVENTS.SNOWFLAKE_EVENTS;

ALTER DATABASE SESAMESTREET_PROD SET
  LOG_LEVEL = INFO
  TRACE_LEVEL = ON_EVENT
  EVENT_TABLE = EVENTS.SNOWFLAKE_EVENTS;

ALTER SERVICE frontend SET
  LOG_LEVEL = INFO
  EVENT_TABLE_COLUMNS = (TIMESTAMP, RESOURCE_ATTRIBUTES, RECORD);
```

### 8.2 Query Tagging

```sql
ALTER SESSION SET QUERY_TAG = 'pipeline:extract';
ALTER SESSION SET QUERY_TAG = 'pipeline:engines';
ALTER SESSION SET QUERY_TAG = 'feature:topsheet';
ALTER SESSION SET QUERY_TAG = 'feature:portfolio';
```

### 8.3 Monitoring Queries

```sql
SELECT * FROM EVENTS.SNOWFLAKE_EVENTS
WHERE RECORD_TYPE = 'LOG'
ORDER BY TIMESTAMP DESC
LIMIT 100;

SELECT QUERY_TAG, COUNT(*) AS query_count, AVG(TOTAL_ELAPSED_TIME)/1000 AS avg_sec
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE QUERY_TAG LIKE 'pipeline:%'
  AND START_TIME > DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY QUERY_TAG;

SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
WHERE NAME IN ('TASK_EXTRACT', 'TASK_ENGINE', 'TASK_NOTIFY')
ORDER BY SCHEDULED_TIME DESC
LIMIT 50;

SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE WAREHOUSE_NAME IN ('WH_APP', 'WH_PIPELINE')
  AND START_TIME > DATEADD('day', -7, CURRENT_TIMESTAMP());

SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE QUERY_START_TIME > DATEADD('day', -1, CURRENT_TIMESTAMP())
  AND ARRAY_SIZE(BASE_OBJECTS_ACCESSED) > 0;

SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE EVENT_TIMESTAMP > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY EVENT_TIMESTAMP DESC;
```

---

## 9. Notification Integration

```sql
CREATE NOTIFICATION INTEGRATION ni_email
  TYPE = EMAIL
  ENABLED = TRUE
  ALLOWED_RECIPIENTS = ('alerts@company.com', 'ops@company.com');
```

---

## 10. Deployment Checklist

- [ ] Create database and schemas
- [ ] Create warehouses
- [ ] Create compute pool and frontend service
- [ ] Create Bronze stage and Snowpipe
- [ ] Create Silver/Gold/Marts tables
- [ ] Create Dynamic Tables
- [ ] Create Event Tables for telemetry
- [ ] Create Streams
- [ ] Create Stored Procedures
- [ ] Create and resume Tasks
- [ ] Create Row Access Policies
- [ ] Create Roles and grant permissions
- [ ] Configure authentication integration
- [ ] Create notification integration
- [ ] Verify telemetry is capturing logs
- [ ] Test end-to-end document flow

---

## 11. Architecture Diagram

Diagram removed from the docs tree. Keep this section as a placeholder for a future simplified architecture visual if needed.

---

## 12. V1 Features (Post-MVP)

### 12.1 Cortex Search Service

Semantic search over all uploaded documents for RAG capabilities.

```sql
CREATE CORTEX SEARCH SERVICE CS_DOCUMENTS
  ON document_text
  ATTRIBUTES client_id, document_type, investment_id
  WAREHOUSE = WH_PIPELINE
  TARGET_LAG = '1 hour'
AS SELECT
  document_id,
  extracted_text AS document_text,
  client_id,
  document_type,
  investment_id
FROM SILVER.DOCUMENT_EXTRACTS;
```

**Use Cases:**
- "Find all compliance certificates mentioning covenant waiver"
- "Show documents with EBITDA below threshold"
- RAG context retrieval for Cortex Agent

---

### 12.2 Cortex Agent

Autonomous portfolio assistant combining structured queries and document search.

```sql
CREATE AGENT PORTFOLIO_ASSISTANT
  MODEL = 'claude-3-5-sonnet'
  TOOLS = (
    analyst_tool(semantic_view => 'SV_PORTFOLIO'),
    cortex_search_tool(service => 'CS_DOCUMENTS')
  )
  INSTRUCTIONS = $$
    You help portfolio managers analyze investments.
    Use the analyst tool for structured data queries (AUM, grades, metrics).
    Use the search tool for document-based questions.
    Always cite sources when referencing documents.
  $$;
```

**Use Cases:**
- "What's the trend for Investment X and summarize recent documents?"
- "Which investments have covenant breaches and what do the compliance certs say?"
- "Compare Client A portfolio performance to last quarter"

---

### 12.3 Semantic View (Cortex Analyst)

Natural language to SQL for business users.

```sql
CREATE SEMANTIC VIEW SV_PORTFOLIO
  TABLES = (
    MARTS.DT_TOPSHEET,
    MARTS.DT_PORTFOLIO,
    GOLD.COVENANT_TEST,
    GOLD.FINANCIAL_PERIOD
  )
  FACTS = (
    commitment,
    funded_amount,
    risk_score,
    tested_value
  )
  DIMENSIONS = (
    client_id,
    investment_name,
    grade,
    covenant_type,
    period_end_date
  )
  METRICS = (
    total_aum => SUM(commitment),
    total_funded => SUM(funded_amount),
    deal_count => COUNT(DISTINCT investment_id),
    watchlist_count => COUNT_IF(grade IN ('D','E')),
    breach_rate => COUNT_IF(NOT passed) / COUNT(*)
  );
```

**Sample Questions:**
- "What's total AUM by grade for Client A?"
- "Show me watchlist investments with covenant breaches"
- "Compare funded amounts by quarter"

---

### 12.4 AI Observability (LLM Evaluation)

Evaluate extraction quality using LLM-as-a-judge metrics.

#### Ground Truth Table

```sql
CREATE TABLE GOLD.EXTRACTION_GROUND_TRUTH (
  ground_truth_id VARCHAR DEFAULT UUID_STRING(),
  document_id VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  expected_value VARCHAR NOT NULL,
  source_text VARCHAR,
  verified_by VARCHAR,
  verified_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_gt PRIMARY KEY (ground_truth_id)
);
```

#### TruLens Instrumentation (Python)

```python
from trulens.core.otel.instrument import instrument
from trulens.otel.semconv.trace import SpanAttributes
from trulens.connectors.snowflake import SnowflakeConnector
from trulens.apps import TruApp
from trulens.core.run import RunConfig

class DocumentExtractor:
    @instrument(
        span_type=SpanAttributes.SpanType.RETRIEVAL,
        attributes={
            SpanAttributes.RETRIEVAL.QUERY_TEXT: "field_name",
            SpanAttributes.RETRIEVAL.RETRIEVED_CONTEXTS: "return",
        }
    )
    def extract_field(self, document_text: str, field_name: str) -> str:
        return cortex_extract_answer(document_text, field_name)
    
    @instrument(span_type=SpanAttributes.SpanType.RECORD_ROOT)
    def process_document(self, doc_id: str) -> dict:
        doc = self.load_document(doc_id)
        results = {}
        for field in self.required_fields:
            results[field] = self.extract_field(doc.text, field)
        return results

connector = SnowflakeConnector(snowpark_session=session)
extractor = DocumentExtractor()

tru_app = TruApp(
    app=extractor,
    app_name="document_extractor",
    app_version="v1.0",
    connector=connector,
    main_method=extractor.process_document
)

run_config = RunConfig(
    run_name="extraction_eval_001",
    description="Evaluate extraction accuracy against ground truth",
    dataset=session.table("GOLD.EXTRACTION_GROUND_TRUTH"),
    metrics=["groundedness", "correctness", "answer_relevance", "context_relevance"]
)

tru_app.add_run(run_config)
tru_app.run()
```

#### Evaluation Metrics

| Metric | Description | Required Attributes |
|--------|-------------|---------------------|
| **Groundedness** | Is the extracted value supported by the source text? | RETRIEVED_CONTEXTS, OUTPUT |
| **Correctness** | Does extraction match human-verified ground truth? | INPUT, GROUND_TRUTH_OUTPUT, OUTPUT |
| **Answer Relevance** | Is the extraction relevant to the field requested? | INPUT, OUTPUT |
| **Context Relevance** | Is the source text relevant to the field? | QUERY_TEXT, RETRIEVED_CONTEXTS |

#### View Results

```sql
SELECT 
  run_name,
  app_version,
  AVG(groundedness_score) AS avg_groundedness,
  AVG(correctness_score) AS avg_correctness,
  AVG(answer_relevance_score) AS avg_relevance,
  COUNT(*) AS samples
FROM SNOWFLAKE.AI_OBSERVABILITY.EVALUATION_RESULTS
WHERE app_name = 'document_extractor'
GROUP BY run_name, app_version
ORDER BY run_name DESC;
```

---

### 12.5 Additional Cortex LLM Functions

#### SUMMARIZE - Executive Summaries

```sql
CREATE OR REPLACE PROCEDURE SP_GENERATE_SUMMARIES()
RETURNS STRING
LANGUAGE SQL
AS $$
BEGIN
  UPDATE GOLD.FINANCIAL_PERIOD
  SET executive_summary = SNOWFLAKE.CORTEX.SUMMARIZE(
    'Summarize the key financial metrics and trends: ' || 
    reported_metrics::STRING || ' Ratios: ' || ratios::STRING
  )
  WHERE executive_summary IS NULL
    AND reported_metrics IS NOT NULL;
  RETURN 'OK';
END;
$$;
```

#### SENTIMENT - Document Tone Analysis

```sql
ALTER TABLE SILVER.DOCUMENT_EXTRACTS ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;

UPDATE SILVER.DOCUMENT_EXTRACTS
SET sentiment_score = SNOWFLAKE.CORTEX.SENTIMENT(extracted_text)
WHERE document_type IN ('management_letter', 'commentary')
  AND sentiment_score IS NULL;

SELECT 
  investment_id,
  AVG(sentiment_score) AS avg_sentiment,
  COUNT(*) AS doc_count
FROM SILVER.DOCUMENT_EXTRACTS
WHERE sentiment_score < 0
GROUP BY investment_id
ORDER BY avg_sentiment ASC;
```

#### EMBED - Vector Similarity

```sql
ALTER TABLE GOLD.INVESTMENT ADD COLUMN IF NOT EXISTS embedding VECTOR(FLOAT, 1024);

UPDATE GOLD.INVESTMENT
SET embedding = SNOWFLAKE.CORTEX.EMBED_TEXT_1024(
  'snowflake-arctic-embed-l-v2.0',
  investment_name || ' ' || COALESCE(borrower_name, '') || ' ' || COALESCE(investment_type, '')
)
WHERE embedding IS NULL;

SELECT 
  i1.investment_name AS investment,
  i2.investment_name AS similar_to,
  VECTOR_COSINE_SIMILARITY(i1.embedding, i2.embedding) AS similarity
FROM GOLD.INVESTMENT i1
JOIN GOLD.INVESTMENT i2 ON i1.investment_id != i2.investment_id
WHERE VECTOR_COSINE_SIMILARITY(i1.embedding, i2.embedding) > 0.8
ORDER BY similarity DESC
LIMIT 20;
```

---

### 12.6 V1 Deployment Checklist

- [ ] Create SILVER.DOCUMENT_EXTRACTS table with extracted_text column
- [ ] Create Cortex Search Service CS_DOCUMENTS
- [ ] Create Semantic View SV_PORTFOLIO
- [ ] Create Cortex Agent PORTFOLIO_ASSISTANT
- [ ] Create ground truth table for AI evaluation
- [ ] Set up TruLens instrumentation in extraction pipeline
- [ ] Run initial evaluation and establish baseline metrics
- [ ] Add sentiment_score column and populate
- [ ] Add embedding column and populate
- [ ] Add executive_summary generation to pipeline
- [ ] Test Agent with sample queries
- [ ] Validate Semantic View generates correct SQL
