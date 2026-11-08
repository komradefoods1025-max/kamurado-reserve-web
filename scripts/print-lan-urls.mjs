#!/usr/bin/env node
import os from "node:os";

const port = process.env.PORT || "3000";

function lanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const net of entries) {
      if (net.family !== "IPv4" || net.internal) continue;
      ips.push(net.address);
    }
  }
  return [...new Set(ips)];
}

const ips = lanIps();
console.log("");
console.log("── スマホから同じ Wi‑Fi で開く URL ──");
if (!ips.length) {
  console.log("（LAN の IP が取れませんでした。ターミナルで ipconfig getifaddr en0 を試してください）");
} else {
  for (const ip of ips) {
    console.log(`  http://${ip}:${port}/order`);
  }
}
console.log("  Mac 本体: http://localhost:" + port + "/order");
console.log("");
