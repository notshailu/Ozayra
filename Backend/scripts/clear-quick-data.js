import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";

const run = async () => {
  console.log("Connecting to MongoDB database...");
  await connectDB();

  try {
    const db = mongoose.connection.db;
    
    // 1. Fetch all collections in the database
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log(`Found ${collectionNames.length} total collections in the database.`);
    
    // 2. Identify all collections starting with "quick_"
    const quickCollections = collectionNames.filter(name => name.startsWith("quick_"));
    console.log(`Found ${quickCollections.length} collections matching the "quick_" prefix:`);
    console.log(quickCollections);

    // 3. Clear all documents from "quick_" collections
    for (const colName of quickCollections) {
      console.log(`Clearing collection "${colName}"...`);
      const result = await db.collection(colName).deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from collection "${colName}"`);
    }

    // 4. Delete QC orders from shared "food_orders" collection
    if (collectionNames.includes("food_orders")) {
      console.log('Clearing quick-commerce orders from "food_orders"...');
      const result = await db.collection("food_orders").deleteMany({
        orderType: { $in: ["quick", "mixed"] }
      });
      console.log(`Cleared ${result.deletedCount} quick-commerce orders from shared "food_orders" collection.`);
    } else {
      console.log('Collection "food_orders" does not exist. Skipping order cleanup.');
    }

    // 5. Delete QC transactions from shared "food_transactions" collection
    if (collectionNames.includes("food_transactions")) {
      console.log('Clearing quick-commerce transactions from "food_transactions"...');
      const result = await db.collection("food_transactions").deleteMany({
        orderType: { $in: ["quick", "mixed"] }
      });
      console.log(`Cleared ${result.deletedCount} quick-commerce transactions from shared "food_transactions" collection.`);
    } else {
      console.log('Collection "food_transactions" does not exist. Skipping transaction cleanup.');
    }

    console.log("Database cleanup successfully completed!");
  } catch (error) {
    console.error("An error occurred during database cleanup:", error);
    process.exitCode = 1;
  } finally {
    console.log("Disconnecting from MongoDB...");
    await disconnectDB();
  }
};

run().catch(async (error) => {
  console.error("Unhandled error:", error?.message || error);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});
