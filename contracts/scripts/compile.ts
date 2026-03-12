import { run } from "hardhat/runtime";

async function main() {
  console.log("Compiling contracts...");
  
  try {
    // Compile all contracts
    await run("compile");
    
    console.log("✅ Contracts compiled successfully!");
    console.log("Artifacts generated in artifacts/ directory");
    
    // List generated artifacts
    const fs = require("fs");
    if (fs.existsSync("artifacts")) {
      const artifacts = fs.readdirSync("artifacts");
      console.log("Generated artifacts:", artifacts);
    }
    
  } catch (error) {
    console.error("❌ Compilation failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
