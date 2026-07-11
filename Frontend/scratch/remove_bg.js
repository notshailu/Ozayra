import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcMiniTruck = 'C:/Users/Shailendra Rajpoot/.gemini/antigravity-ide/brain/3f3bd01f-492a-4d7d-b43c-f880aa958a76/mini_truck_icon_1783576462672.png';
const srcSuv = 'C:/Users/Shailendra Rajpoot/.gemini/antigravity-ide/brain/3f3bd01f-492a-4d7d-b43c-f880aa958a76/suv_vehicle_icon_1783576475032.png';

const publicDir = 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Frontend/public';

async function makeTransparent(srcPath, destName) {
  console.log(`Processing ${srcPath}...`);
  const image = sharp(srcPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  
  // Iterate pixel-by-pixel
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if the pixel is near-white (threshold 245)
    if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0; // Set Alpha to 0 (fully transparent)
    }
  }

  const destPath = path.join(publicDir, destName);
  await sharp(data, {
    raw: {
      width,
      height,
      channels
    }
  })
  .png()
  .toFile(destPath);
  
  console.log(`Saved transparent image to ${destPath}`);
}

async function run() {
  try {
    await makeTransparent(srcMiniTruck, 'ehcv.png');
    await makeTransparent(srcMiniTruck, 'truck.png');
    await makeTransparent(srcMiniTruck, 'LCV.png');
    await makeTransparent(srcMiniTruck, 'mcv.png');
    await makeTransparent(srcSuv, 'SUV.png');
    console.log('Successfully processed all images to transparent PNGs!');
  } catch (e) {
    console.error('Error during transparent processing:', e);
  }
}

run();
