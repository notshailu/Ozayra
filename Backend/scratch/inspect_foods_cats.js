import { connectDB, disconnectDB } from "../src/config/db.js";
import { buildSellerCategoryTree } from "../src/modules/quick-commerce/seller/services/sellerCatalog.service.js";

const run = async () => {
  await connectDB();
  try {
    const tree = await buildSellerCategoryTree();
    const foodsHeader = tree.find(node => String(node._id) === "6a2bc8bc40f170b3f733f94b");
    console.log("Foods Header Node in Tree:", JSON.stringify(foodsHeader, null, 2));
  } finally {
    await disconnectDB();
  }
};

run().catch(console.error);
