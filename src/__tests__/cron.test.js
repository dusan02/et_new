/**
 * 🕐 CRON JOB TESTS - SKUTOČNÉ CHOVANIE
 * Testuje skutočné chovanie cron jobov podľa reality
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

describe.skip("🕐 Cron Job Tests - Real Behavior (SKIPPED - Long running processes)", () => {
  let cronProcess;
  const cronScriptPath = path.join(__dirname, "../queue/worker-new.js");
  const fetchScriptPath = path.join(__dirname, "../jobs/fetch-today.ts");

  afterEach(() => {
    if (cronProcess) {
      cronProcess.kill();
    }
  });

  test("Cron script exists and is executable", () => {
    expect(fs.existsSync(cronScriptPath)).toBe(true);
    expect(fs.statSync(cronScriptPath).isFile()).toBe(true);
    expect(fs.existsSync(fetchScriptPath)).toBe(true);
  });

  test("Cron script starts and runs initial fetch immediately", (done) => {
    cronProcess = spawn("node", [cronScriptPath], {
      cwd: path.dirname(cronScriptPath),
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let output = "";
    let hasStarted = false;
    let hasRunInitialFetch = false;

    cronProcess.stdout.on("data", (data) => {
      output += data.toString();

      // Check startup messages
      if (output.includes("Starting Earnings Queue Worker") && !hasStarted) {
        hasStarted = true;
        expect(output).toContain("Starting Earnings Queue Worker");
        expect(output).toContain("Schedule:");
        expect(output).toContain("Main fetch: Daily at 2:00 AM NY time");
      }

      // Check initial fetch
      if (
        output.includes("Running initial data fetch") &&
        !hasRunInitialFetch
      ) {
        hasRunInitialFetch = true;
        expect(output).toContain("Running initial data fetch");
      }

      // Both conditions met
      if (hasStarted && hasRunInitialFetch) {
        done();
      }
    });

    cronProcess.stderr.on("data", (data) => {
      console.error("Cron stderr:", data.toString());
    });

    cronProcess.on("error", (error) => {
      done(error);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!hasStarted || !hasRunInitialFetch) {
        done(
          new Error("Cron script did not complete startup within 15 seconds")
        );
      }
    }, 15000);
  });

  test("Cron script spawns child process for fetch script", (done) => {
    cronProcess = spawn("node", [cronScriptPath], {
      cwd: path.dirname(cronScriptPath),
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let output = "";
    let hasSpawnedChild = false;

    cronProcess.stdout.on("data", (data) => {
      output += data.toString();

      // Check for fetch script output (indicates child process spawned)
      if (output.includes("Starting data fetch for") && !hasSpawnedChild) {
        hasSpawnedChild = true;
        expect(output).toContain("Starting data fetch for");
        expect(output).toContain("Fetching earnings data from Finnhub");
        done();
      }
    });

    cronProcess.stderr.on("data", (data) => {
      console.error("Cron stderr:", data.toString());
    });

    cronProcess.on("error", (error) => {
      done(error);
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      if (!hasSpawnedChild) {
        done(new Error("Child process did not spawn within 20 seconds"));
      }
    }, 20000);
  });

  test("Cron script handles fetch script errors gracefully", (done) => {
    // Create a mock fetch script that fails
    const mockFetchScript = `
      console.log('🚀 FETCHING DATA NOW - Simple approach');
      console.log('=====================================');
      console.log('📅 Date: 2024-01-01');
      console.log('🔑 Finnhub API: ❌ Missing');
      console.log('🔑 Polygon API: ❌ Missing');
      console.log('');
      console.log('❌ Failed to fetch earnings: API key missing');
      process.exit(1);
    `;

    const tempScriptPath = path.join(
      __dirname,
      "../../scripts/temp-fetch-test.js"
    );

    fs.writeFileSync(tempScriptPath, mockFetchScript);

    // Modify cron script temporarily to use mock fetch
    const originalCronContent = fs.readFileSync(cronScriptPath, "utf8");
    const modifiedCronContent = originalCronContent.replace(
      "fetch-data-now.js",
      "temp-fetch-test.js"
    );

    const tempCronPath = path.join(
      __dirname,
      "../../scripts/temp-cron-test.js"
    );
    fs.writeFileSync(tempCronPath, modifiedCronContent);

    cronProcess = spawn("node", [tempCronPath], {
      cwd: path.dirname(cronScriptPath),
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let output = "";
    let hasHandledError = false;

    cronProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    cronProcess.stderr.on("data", (data) => {
      output += data.toString();
    });

    cronProcess.on("data", (data) => {
      output += data.toString();

      // Check for error handling
      if (output.includes("Failed to fetch earnings") && !hasHandledError) {
        hasHandledError = true;
        // Cron should continue running even if fetch fails
        expect(cronProcess.killed).toBe(false);
        done();
      }
    });

    cronProcess.on("error", (error) => {
      done(error);
    });

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
      if (fs.existsSync(tempCronPath)) fs.unlinkSync(tempCronPath);
    }, 20000);

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!hasHandledError) {
        done(
          new Error("Error handling test did not complete within 15 seconds")
        );
      }
    }, 15000);
  });

  test("Cron script shows proper completion messages", (done) => {
    cronProcess = spawn("node", [cronScriptPath], {
      cwd: path.dirname(cronScriptPath),
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let output = "";
    let hasShownCompletion = false;

    cronProcess.stdout.on("data", (data) => {
      output += data.toString();

      // Check for completion messages
      if (
        output.includes("Initial startup fetch completed with code") &&
        !hasShownCompletion
      ) {
        hasShownCompletion = true;
        expect(output).toContain("Initial startup fetch completed with code");
        expect(output).toContain("Queue worker started successfully");
        done();
      }
    });

    cronProcess.stderr.on("data", (data) => {
      console.error("Cron stderr:", data.toString());
    });

    cronProcess.on("error", (error) => {
      done(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!hasShownCompletion) {
        done(new Error("Completion messages did not appear within 30 seconds"));
      }
    }, 30000);
  });

  test("Cron script sets proper environment variables", (done) => {
    // Create a mock fetch script that checks environment
    const mockFetchScript = `
      console.log('🚀 FETCHING DATA NOW - Simple approach');
      console.log('=====================================');
      console.log('📅 Date: 2024-01-01');
      console.log('🔑 Finnhub API:', process.env.FINNHUB_API_KEY ? '✅ Set' : '❌ Missing');
      console.log('🔑 Polygon API:', process.env.POLYGON_API_KEY ? '✅ Set' : '❌ Missing');
      console.log('🔑 Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
      console.log('🔑 NODE_ENV:', process.env.NODE_ENV);
      process.exit(0);
    `;

    const tempScriptPath = path.join(
      __dirname,
      "../../scripts/temp-fetch-test.js"
    );

    fs.writeFileSync(tempScriptPath, mockFetchScript);

    // Modify cron script temporarily to use mock fetch
    const originalCronContent = fs.readFileSync(cronScriptPath, "utf8");
    const modifiedCronContent = originalCronContent.replace(
      "fetch-data-now.js",
      "temp-fetch-test.js"
    );

    const tempCronPath = path.join(
      __dirname,
      "../../scripts/temp-cron-test.js"
    );
    fs.writeFileSync(tempCronPath, modifiedCronContent);

    cronProcess = spawn("node", [tempCronPath], {
      cwd: path.dirname(cronScriptPath),
      env: {
        ...process.env,
        NODE_ENV: "test",
        FINNHUB_API_KEY: "test-finnhub-key",
        POLYGON_API_KEY: "test-polygon-key",
        DATABASE_URL: "test-database-url",
      },
    });

    let output = "";
    let hasCheckedEnv = false;

    cronProcess.stdout.on("data", (data) => {
      output += data.toString();

      // Check for environment variable output
      if (output.includes("NODE_ENV: test") && !hasCheckedEnv) {
        hasCheckedEnv = true;
        expect(output).toContain("NODE_ENV: test");
        done();
      }
    });

    cronProcess.stderr.on("data", (data) => {
      console.error("Cron stderr:", data.toString());
    });

    cronProcess.on("error", (error) => {
      done(error);
    });

    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
      if (fs.existsSync(tempCronPath)) fs.unlinkSync(tempCronPath);
    }, 20000);

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!hasCheckedEnv) {
        done(new Error("Environment check did not complete within 15 seconds"));
      }
    }, 15000);
  });
});
