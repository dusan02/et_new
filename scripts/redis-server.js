#!/usr/bin/env node

/**
 * Simple Redis-compatible server for development
 * Implements basic Redis commands needed for the application
 */

const net = require("net");
const fs = require("fs");
const path = require("path");

class SimpleRedisServer {
  constructor(port = 6379) {
    this.port = port;
    this.data = new Map();
    this.dataFile = path.join(process.cwd(), "data", "redis-data.json");
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileData = fs.readFileSync(this.dataFile, "utf8");
        const parsed = JSON.parse(fileData);
        this.data = new Map(Object.entries(parsed));
        console.log(`📁 Loaded ${this.data.size} keys from ${this.dataFile}`);
      }
    } catch (error) {
      console.warn("Failed to load Redis data:", error.message);
    }
  }

  saveData() {
    try {
      const dir = path.dirname(this.dataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dataObj = Object.fromEntries(this.data);
      fs.writeFileSync(this.dataFile, JSON.stringify(dataObj, null, 2));
    } catch (error) {
      console.error("Failed to save Redis data:", error.message);
    }
  }

  start() {
    const server = net.createServer((socket) => {
      console.log("🔌 Client connected");

      socket.on("data", (data) => {
        const command = data.toString().trim();
        const response = this.processCommand(command);
        socket.write(response);
      });

      socket.on("close", () => {
        console.log("🔌 Client disconnected");
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error.message);
      });
    });

    server.listen(this.port, () => {
      console.log(`🚀 Simple Redis server running on port ${this.port}`);
      console.log(`📁 Data file: ${this.dataFile}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.log(`✅ Redis server already running on port ${this.port}`);
      } else {
        console.error("Server error:", error.message);
      }
    });
  }

  processCommand(command) {
    const parts = command
      .split("\r\n")
      .filter((part) => part && !part.startsWith("*") && !part.startsWith("$"));

    if (parts.length === 0) return "+PONG\r\n";

    const cmd = parts[0].toUpperCase();

    switch (cmd) {
      case "PING":
        return "+PONG\r\n";

      case "GET":
        if (parts.length < 2) return "-ERR wrong number of arguments\r\n";
        const value = this.data.get(parts[1]);
        if (value === undefined) return "$-1\r\n";
        return `$${value.length}\r\n${value}\r\n`;

      case "SET":
        if (parts.length < 3) return "-ERR wrong number of arguments\r\n";
        this.data.set(parts[1], parts[2]);
        this.saveData();
        return "+OK\r\n";

      case "SETEX":
        if (parts.length < 4) return "-ERR wrong number of arguments\r\n";
        this.data.set(parts[1], parts[3]);
        this.saveData();
        return "+OK\r\n";

      case "EXISTS":
        if (parts.length < 2) return "-ERR wrong number of arguments\r\n";
        const exists = this.data.has(parts[1]) ? 1 : 0;
        return `:${exists}\r\n`;

      case "RENAME":
        if (parts.length < 3) return "-ERR wrong number of arguments\r\n";
        const oldValue = this.data.get(parts[1]);
        if (oldValue === undefined) return "-ERR no such key\r\n";
        this.data.set(parts[2], oldValue);
        this.data.delete(parts[1]);
        this.saveData();
        return "+OK\r\n";

      case "KEYS":
        if (parts.length < 2) return "-ERR wrong number of arguments\r\n";
        const pattern = parts[1];
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        const matchingKeys = Array.from(this.data.keys()).filter((key) =>
          regex.test(key)
        );
        let response = `*${matchingKeys.length}\r\n`;
        matchingKeys.forEach((key) => {
          response += `$${key.length}\r\n${key}\r\n`;
        });
        return response;

      case "DEL":
        if (parts.length < 2) return "-ERR wrong number of arguments\r\n";
        const deleted = this.data.delete(parts[1]) ? 1 : 0;
        if (deleted) this.saveData();
        return `:${deleted}\r\n`;

      case "INFO":
        const info = `# Server
redis_version:7.2.0
redis_mode:standalone
os:Windows
arch_bits:64
uptime_in_seconds:${Math.floor(process.uptime())}
connected_clients:1
used_memory:${this.data.size * 100}
used_memory_human:${this.data.size * 100}B
`;
        return `$${info.length}\r\n${info}\r\n`;

      case "EVAL":
        // Mock EVAL command for BullMQ compatibility
        // Return a simple job ID
        const jobId = Math.floor(Math.random() * 1000000);
        return `:${jobId}\r\n`;

      case "HMSET":
        // Mock HMSET for BullMQ
        if (parts.length >= 3) {
          const key = parts[1];
          // Store as JSON for simplicity
          const value = JSON.stringify({
            type: "bullmq_job",
            data: parts.slice(2),
          });
          this.data.set(key, value);
          this.saveData();
        }
        return "+OK\r\n";

      case "HGET":
        if (parts.length >= 3) {
          const key = parts[1];
          const field = parts[2];
          const value = this.data.get(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.type === "bullmq_job") {
                return `$${field.length}\r\n${field}\r\n`;
              }
            } catch (e) {
              // Not JSON, return as is
            }
          }
        }
        return "$-1\r\n";

      case "INCR":
        if (parts.length >= 2) {
          const key = parts[1];
          const current = parseInt(this.data.get(key) || "0");
          const newValue = current + 1;
          this.data.set(key, newValue.toString());
          this.saveData();
          return `:${newValue}\r\n`;
        }
        return ":1\r\n";

      case "LPUSH":
        if (parts.length >= 3) {
          const key = parts[1];
          const value = parts[2];
          // Mock list push
          const listKey = `${key}_list`;
          const current = this.data.get(listKey) || "[]";
          try {
            const list = JSON.parse(current);
            list.unshift(value);
            this.data.set(listKey, JSON.stringify(list));
            this.saveData();
            return `:${list.length}\r\n`;
          } catch (e) {
            return ":1\r\n";
          }
        }
        return ":1\r\n";

      case "PUBLISH":
        // Mock publish - just return 1
        return ":1\r\n";

      case "ZADD":
        // Mock ZADD - just return 1
        return ":1\r\n";

      case "ZCOUNT":
        // Mock ZCOUNT - return 0
        return ":0\r\n";

      case "LLEN":
        // Mock LLEN - return 0
        return ":0\r\n";

      case "LINDEX":
        // Mock LINDEX - return null
        return "$-1\r\n";

      case "LINSERT":
        // Mock LINSERT - return 1
        return ":1\r\n";

      case "RPUSH":
        // Mock RPUSH - return 1
        return ":1\r\n";

      default:
        return `-ERR unknown command '${cmd}'\r\n`;
    }
  }
}

// Start server if called directly
if (require.main === module) {
  const server = new SimpleRedisServer(6379);
  server.start();
}

module.exports = SimpleRedisServer;
