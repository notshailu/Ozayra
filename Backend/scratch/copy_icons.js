import fs from 'fs';
import path from 'path';

const srcMiniTruck = 'C:/Users/Shailendra Rajpoot/.gemini/antigravity-ide/brain/3f3bd01f-492a-4d7d-b43c-f880aa958a76/mini_truck_icon_1783576462672.png';
const srcSuv = 'C:/Users/Shailendra Rajpoot/.gemini/antigravity-ide/brain/3f3bd01f-492a-4d7d-b43c-f880aa958a76/suv_vehicle_icon_1783576475032.png';

const publicDir = 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Frontend/public';

function copyFile(src, destName) {
  const dest = path.join(publicDir, destName);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} to ${dest}`);
}

try {
  copyFile(srcMiniTruck, 'ehcv.png');
  copyFile(srcMiniTruck, 'truck.png');
  copyFile(srcMiniTruck, 'LCV.png');
  copyFile(srcMiniTruck, 'mcv.png');
  copyFile(srcSuv, 'SUV.png');
  console.log('All icons copied successfully!');
} catch (e) {
  console.error('Error copying icons:', e);
}
