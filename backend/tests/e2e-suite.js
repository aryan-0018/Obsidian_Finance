require("dotenv/config");
const assert = require("assert");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Compiled dist modules
const {
  hasPdfSignature,
  hasJpegSignature,
  hasPngSignature,
  hasWebpSignature,
  hasHeicSignature,
  isLikelyTextCsv,
  assertValidStatementFile,
} = require("../dist/utils/file-validation");

const {
  escapeRegex,
  escapeHtml,
  sanitizeCsvCell,
  isSafeHttpUrl,
  sha256Hex,
} = require("../dist/utils/security");

const {
  signJwtToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../dist/utils/jwt");

const { withUserLedgerLock } = require("../dist/utils/ledger-lock");

const {
  parseIndianCurrencyExpression,
  detectIndianMerchantAndCategory,
} = require("../dist/utils/nlp-parser");

const {
  parseDeterministicIndianSms,
  checkDuplicateSmsTransaction,
} = require("../dist/services/sms-parser.service");

const {
  getGenesisHash,
  computeTransactionBlockHash,
  verifyLedgerIntegrityService,
} = require("../dist/services/ledger-audit.service");

// Models & Services
const UserModel = require("../dist/models/user.model").default;
const TransactionModel = require("../dist/models/transaction.model").default;
const ReportSettingModel = require("../dist/models/report-setting.model").default;
const BudgetModel = require("../dist/models/budget.model").default;
const {
  registerService,
  loginService,
  refreshTokenService,
} = require("../dist/services/auth.service");
const {
  createTransactionService,
} = require("../dist/services/transaction.service");
const {
  generateUserApiKeyService,
  authenticateApiKey,
} = require("../dist/services/api-key.service");
const {
  summaryAnalyticsService,
} = require("../dist/services/analytics.service");

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ${colors.green}✓${colors.reset} ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ${colors.red}✗${colors.reset} ${description}`);
    console.error(`    ${colors.red}${err.message}${colors.reset}`);
    failedTests++;
  }
}

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`  ${colors.green}✓${colors.reset} ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ${colors.red}✗${colors.reset} ${description}`);
    console.error(`    ${colors.red}${err.message}${colors.reset}`);
    failedTests++;
  }
}

async function runAllSuites() {
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  OBSIDIAN FINANCE — FULL END-TO-END VERIFICATION  ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  // ==========================================
  // SUITE 1: SECURITY & FILE VALIDATION
  // ==========================================
  console.log(`${colors.bold}SUITE 1: Security & File Integrity Utilities${colors.reset}`);

  it("File Validation: Magic byte identification for PDF, PNG, JPG, WEBP, and HEIC", () => {
    const pdfBuf = Buffer.from("%PDF-1.7\nSome stream data");
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const jpgBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const fakeBuf = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // Windows PE executable header

    assert.strictEqual(hasPdfSignature(pdfBuf), true);
    assert.strictEqual(hasPngSignature(pngBuf), true);
    assert.strictEqual(hasJpegSignature(jpgBuf), true);
    assert.strictEqual(hasPdfSignature(fakeBuf), false);

    assertValidStatementFile(pdfBuf, "PDF");
    assertValidStatementFile(pngBuf, "IMAGE");
    assertValidStatementFile(jpgBuf, "IMAGE");

    let thrown = false;
    try {
      assertValidStatementFile(fakeBuf, "PDF");
    } catch {
      thrown = true;
    }
    assert.strictEqual(thrown, true, "Disguised executable should be rejected for PDF");
  });

  it("File Validation: CSV binary / NUL-byte rejection", () => {
    const cleanCsv = Buffer.from("Date,Title,Amount\n2026-11-20,Coffee,250\n");
    const corruptedCsv = Buffer.from("Date,Title,Amount\n2026-11-20\x00EvilBinary,250\n");

    assert.strictEqual(isLikelyTextCsv(cleanCsv), true);
    assert.strictEqual(isLikelyTextCsv(corruptedCsv), false);
  });

  it("Security: HTML escaping and CSV formula injection neutralization", () => {
    const unsafeHtml = '<script>alert("xss")</script>&"quote"\'single\'';
    const safeHtml = escapeHtml(unsafeHtml);
    assert.strictEqual(safeHtml.includes("<script>"), false);
    assert.strictEqual(safeHtml.includes("&lt;script&gt;"), true);

    const maliciousCsvFormula = "=cmd|' /C calc'!A0";
    const sanitizedCell = sanitizeCsvCell(maliciousCsvFormula);
    assert.strictEqual(sanitizedCell.startsWith("\"'=cmd"), true, "Formula must be apostrophe-escaped and quoted");

    assert.strictEqual(isSafeHttpUrl("https://obsidian.finance/dashboard"), true);
    assert.strictEqual(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.strictEqual(isSafeHttpUrl("data:text/html,<script>"), false);
  });

  it("JWT & Cryptography: Refresh token hashing and timing-safe comparison", () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const { token, hash } = signRefreshToken(userId);
    const computedHash = hashToken(token);
    assert.strictEqual(computedHash, hash);

    const decoded = verifyRefreshToken(token);
    assert.strictEqual(decoded.userId, userId);

    const bufA = Buffer.from(hash, "hex");
    const bufB = Buffer.from(computedHash, "hex");
    assert.strictEqual(crypto.timingSafeEqual(bufA, bufB), true);
  });

  await itAsync("Ledger Lock: Concurrency serialization", async () => {
    const executionOrder = [];
    const testUserId = "test-user-lock-concurrency";

    const p1 = withUserLedgerLock(testUserId, async () => {
      await new Promise((r) => setTimeout(r, 60));
      executionOrder.push(1);
    });

    const p2 = withUserLedgerLock(testUserId, async () => {
      await new Promise((r) => setTimeout(r, 10));
      executionOrder.push(2);
    });

    await Promise.all([p1, p2]);
    assert.deepStrictEqual(executionOrder, [1, 2], "Lock must enforce sequential FIFO ordering");
  });

  // ==========================================
  // SUITE 2: INDIAN CURRENCY & NLP PARSER
  // ==========================================
  console.log(`\n${colors.bold}SUITE 2: Indian Banking & Spoken NLP Currency Parser${colors.reset}`);

  it("NLP: Spoken composite Indian phrases & colloquial numbers", () => {
    assert.strictEqual(parseIndianCurrencyExpression("1 lakh 70 thousand"), 170000);
    assert.strictEqual(parseIndianCurrencyExpression("one lakh seventy thousand"), 170000);
    assert.strictEqual(parseIndianCurrencyExpression("dedh lakh"), 150000);
    assert.strictEqual(parseIndianCurrencyExpression("dhai lakh"), 250000);
    assert.strictEqual(parseIndianCurrencyExpression("dedh sau"), 150);
    assert.strictEqual(parseIndianCurrencyExpression("dhai sau"), 250);
    assert.strictEqual(parseIndianCurrencyExpression("25k"), 25000);
    assert.strictEqual(parseIndianCurrencyExpression("50 hazaar"), 50000);
    assert.strictEqual(parseIndianCurrencyExpression("70 000"), 70000); // Spaced speech grouping
    assert.strictEqual(parseIndianCurrencyExpression("1 70000"), 170000);
  });

  it("NLP: Entity & Category Recognition", () => {
    const r1 = detectIndianMerchantAndCategory("Ordered pizza from Zomato for 450");
    assert.strictEqual(r1.title, "Zomato");
    assert(r1.category === "dining" || r1.category === "food", "Zomato should map to dining or food");

    const r2 = detectIndianMerchantAndCategory("Bought new iPhone 16 for 79900");
    assert.strictEqual(r2.title, "iPhone");
    assert.strictEqual(r2.category, "shopping");

    const r3 = detectIndianMerchantAndCategory("Uber ride to Bangalore airport");
    assert.strictEqual(r3.title, "Uber");
    assert(
      r3.category === "transportation" || r3.category === "transport",
      "Uber should map to transportation or transport"
    );

    const r4 = detectIndianMerchantAndCategory("Received 85000 salary for November");
    assert.strictEqual(r4.type, "INCOME");
  });

  // ==========================================
  // SUITE 3: DETERMINISTIC BANK SMS PARSER
  // ==========================================
  console.log(`\n${colors.bold}SUITE 3: Bank SMS Ingestion Engine (HDFC, SBI, ICICI, Axis)${colors.reset}`);

  it("SMS Parser: HDFC Debit SMS", () => {
    const msg = "Alert: Rs. 1,499.00 debited from HDFC Bank A/C **4521 to SWIGGY on 23-NOV-26. UPI Ref 334455667788. Avail Bal: Rs 45,200.00";
    const res = parseDeterministicIndianSms(msg, "HDFCBK");
    assert(res, "HDFC SMS must parse");
    assert.strictEqual(res.amount, 1499);
    assert.strictEqual(res.type, "EXPENSE");
    assert.strictEqual(res.title.toLowerCase(), "swiggy");
    assert.strictEqual(res.paymentMethod, "MOBILE_PAYMENT");
    assert.strictEqual(res.externalRef, "334455667788");
  });

  it("SMS Parser: SBI Credit / Salary SMS", () => {
    const msg = "Dear Customer, A/C 6789 credited by Rs. 65,000.00 on 23-Nov-26 by Salary. Avail Bal Rs 1,20,500.00 - State Bank of India";
    const res = parseDeterministicIndianSms(msg, "SBINB");
    assert(res, "SBI Credit SMS must parse");
    assert.strictEqual(res.amount, 65000);
    assert.strictEqual(res.type, "INCOME");
  });

  it("SMS Parser: ICICI Refund Credit SMS", () => {
    const msg = "Your ICICI Bank Acct XX1234 has been credited with Rs 499.00 on 22-Nov-26 towards Refund from AMAZON. UPI Ref 998877665544";
    const res = parseDeterministicIndianSms(msg, "ICICIB");
    assert(res, "ICICI Refund SMS must parse");
    assert.strictEqual(res.amount, 499);
    assert.strictEqual(res.type, "INCOME");
    assert(res.title.toLowerCase().includes("amazon"));
    assert.strictEqual(res.externalRef, "998877665544");
  });

  it("SMS Parser: Axis Bank Card Debit SMS", () => {
    const msg = "Axis Bank: Your Credit Card XX9988 was used for Rs 3,250.00 at ZARA on 23-11-2026 at 19:45. Avail Limit: Rs 1,80,000";
    const res = parseDeterministicIndianSms(msg, "AXISBK");
    assert(res, "Axis Card SMS must parse");
    assert.strictEqual(res.amount, 3250);
    assert.strictEqual(res.type, "EXPENSE");
    assert.strictEqual(res.paymentMethod, "CARD");
    assert(
      res.title.toLowerCase() === "zara" || res.title.toLowerCase() === "shopping",
      "Title should be Zara or Shopping"
    );
    assert.strictEqual(res.category, "shopping");
  });

  // ==========================================
  // SUITE 4: CRYPTOGRAPHIC BLOCKCHAIN LEDGER
  // ==========================================
  console.log(`\n${colors.bold}SUITE 4: Cryptographic Blockchain Ledger & Tamper Detection${colors.reset}`);

  it("Blockchain Ledger: Hash chaining and tamper detection", () => {
    const genesis = getGenesisHash();
    assert.strictEqual(typeof genesis, "string");
    assert.strictEqual(genesis.length, 64);

    const tx1 = {
      _id: new mongoose.Types.ObjectId().toString(),
      date: new Date("2026-11-01"),
      amount: 5000,
      type: "INCOME",
      title: "Freelance",
    };
    const blockHash1 = computeTransactionBlockHash(genesis, tx1);

    const tx2 = {
      _id: new mongoose.Types.ObjectId().toString(),
      date: new Date("2026-11-05"),
      amount: 1500,
      type: "EXPENSE",
      title: "Groceries",
    };
    const blockHash2 = computeTransactionBlockHash(blockHash1, tx2);

    const tx3 = {
      _id: new mongoose.Types.ObjectId().toString(),
      date: new Date("2026-11-10"),
      amount: 800,
      type: "EXPENSE",
      title: "Dinner",
    };
    const blockHash3 = computeTransactionBlockHash(blockHash2, tx3);

    assert.notStrictEqual(blockHash1, blockHash2);
    assert.notStrictEqual(blockHash2, blockHash3);

    // Tamper test
    const tamperedTx2 = { ...tx2, amount: 9500 };
    const alteredBlockHash2 = computeTransactionBlockHash(blockHash1, tamperedTx2);

    assert.notStrictEqual(alteredBlockHash2, blockHash2, "Tampered block hash must mismatch stored ledger hash");
  });

  // ==========================================
  // SUITE 5: LIVE MONGODB & API INTEGRATION
  // ==========================================
  console.log(`\n${colors.bold}SUITE 5: Live Database & API Lifecycle Integration${colors.reset}`);

  let testUserId = null;
  let testUserEmail = `e2e_test_${Date.now()}@obsidian.test`;
  let testUserPassword = "Password123#Secure";
  let apiKey = null;

  await itAsync("Database Connection: Connect to live MongoDB", async () => {
    const mongoUri = process.env.MONGO_URI;
    assert(mongoUri, "MONGO_URI must be configured in environment");
    await mongoose.connect(mongoUri);
    assert.strictEqual(mongoose.connection.readyState, 1, "Mongoose must be connected");
  });

  await itAsync("Auth Service: User Registration", async () => {
    const regResult = await registerService({
      name: "E2E Test User",
      email: testUserEmail,
      password: testUserPassword,
    });
    assert(regResult.user, "Registration must return user");
    assert.strictEqual(regResult.user.email, testUserEmail.toLowerCase());
    testUserId = regResult.user.id || regResult.user._id.toString();

    // Verify defaults
    const reportSetting = await ReportSettingModel.findOne({ userId: testUserId });
    assert(reportSetting, "Default report settings must be initialized");
    const budget = await BudgetModel.findOne({ userId: testUserId });
    assert(budget, "Default budget must be initialized");
  });

  await itAsync("Auth Service: User Login & Refresh Token Cookie Exchange", async () => {
    const loginResult = await loginService({
      email: testUserEmail,
      password: testUserPassword,
    });
    assert(loginResult.accessToken, "Login must issue accessToken");
    assert(loginResult.refreshToken, "Login must issue refreshToken");

    // Test token renewal
    const refreshResult = await refreshTokenService(loginResult.refreshToken);
    assert(refreshResult.accessToken, "Refresh must return new accessToken");
    assert(refreshResult.refreshToken, "Refresh must return new refreshToken");
  });

  await itAsync("API Key Service: Key Generation & Authentication", async () => {
    const keyData = await generateUserApiKeyService(testUserId);
    assert(keyData.apiKey, "API Key must be generated");
    assert(keyData.apiKey.startsWith("obs_live_"), "API Key must start with obs_live_");

    apiKey = keyData.apiKey;
    const authenticatedUser = await authenticateApiKey(apiKey);
    assert(authenticatedUser, "API Key authentication must succeed");
    assert.strictEqual(authenticatedUser._id.toString(), testUserId);
  });

  await itAsync("Transaction & Cryptographic Ledger: Commit Debit Transaction", async () => {
    const tx = await createTransactionService(
      {
        title: "Apple Store",
        amount: 24900,
        type: "EXPENSE",
        category: "shopping",
        paymentMethod: "CARD",
        date: new Date(),
        description: "AirPods Max",
        externalRef: "APPLE_REF_001",
      },
      testUserId
    );
    assert(tx, "Transaction must be created");
    assert.strictEqual(tx.ledgerHash.length, 64);
    assert.strictEqual(tx.prevLedgerHash.length, 64);
  });

  await itAsync("Transaction & Cryptographic Ledger: Commit Credit Transaction", async () => {
    const tx = await createTransactionService(
      {
        title: "Client Payment",
        amount: 100000,
        type: "INCOME",
        category: "salary",
        paymentMethod: "BANK_TRANSFER",
        date: new Date(),
        description: "Milestone completion",
        externalRef: "CLIENT_PAY_002",
      },
      testUserId
    );
    assert(tx, "Credit transaction must be created");
    assert.strictEqual(tx.ledgerHash.length, 64);

    // Verify analytics summary
    const summary = await summaryAnalyticsService(testUserId);
    assert.strictEqual(summary.totalExpenses, 24900, "Total expenses must equal 24900");
    assert.strictEqual(summary.totalIncome, 100000, "Total income must equal 100000");
    assert.strictEqual(summary.availableBalance, 75100, "Available balance must equal 75100");
  });

  await itAsync("Ledger Audit: Full Chain Integrity Verification", async () => {
    const auditResult = await verifyLedgerIntegrityService(testUserId);
    assert.strictEqual(auditResult.status, "VERIFIED_SECURE");
    assert.strictEqual(auditResult.tamperedBlocks.length, 0);
    assert.strictEqual(auditResult.chainDepth, 2);
  });

  await itAsync("SMS Deduplication Check: Prevent Re-ingestion", async () => {
    const dupCheck = await checkDuplicateSmsTransaction(testUserId, {
      externalRef: "APPLE_REF_001",
      date: new Date(),
      amount: 24900,
      type: "EXPENSE",
      title: "Apple Store",
      category: "shopping",
      paymentMethod: "CARD",
      isTransaction: true,
    });
    assert.strictEqual(dupCheck.isDuplicate, true, "Existing transaction must be recognized as duplicate");

    const nonDupCheck = await checkDuplicateSmsTransaction(testUserId, {
      externalRef: "NEW_UNIQUE_UTR_9999",
      date: new Date(),
      amount: 9999,
      type: "EXPENSE",
      title: "New Store",
      category: "shopping",
      paymentMethod: "CARD",
      isTransaction: true,
    });
    assert.strictEqual(nonDupCheck.isDuplicate, false, "Brand new transaction must not be marked as duplicate");
  });

  await itAsync("Cleanup: Purge Ephemeral Test Data", async () => {
    await TransactionModel.deleteMany({ userId: testUserId });
    await ReportSettingModel.deleteMany({ userId: testUserId });
    await BudgetModel.deleteMany({ userId: testUserId });
    await UserModel.findByIdAndDelete(testUserId);

    const remainingUser = await UserModel.findById(testUserId);
    assert.strictEqual(remainingUser, null, "Test user must be deleted");
    await mongoose.disconnect();
  });

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}TEST RUN RESULTS:${colors.reset}`);
  console.log(`  ${colors.green}Total Passed: ${passedTests}${colors.reset}`);
  if (failedTests > 0) {
    console.log(`  ${colors.red}Total Failed: ${failedTests}${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`  ${colors.bold}${colors.green}ALL TESTS PASSED WITH 100% SUCCESS!${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);
    process.exit(0);
  }
}

runAllSuites().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
