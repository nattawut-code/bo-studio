import { app } from "./firebase-config.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

export const storage = getStorage(app);

// อัปโหลดไฟล์รูป (File object จาก <input type="file">) ขึ้น Firebase Storage
// pathPrefix เช่น "logos/slot1" หรือ "logos/watermark" — จะได้ path จริงเป็น "logos/slot1-<timestamp>.<ext>"
// คืนค่าเป็น download URL (string) ให้เอาไปเก็บใน Firestore แทนการฝัง base64
export async function uploadLogo(file, pathPrefix) {
    if (!file) throw new Error("ไม่พบไฟล์ที่เลือก");
    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(file.type)) throw new Error("รองรับเฉพาะไฟล์ PNG, JPEG หรือ WEBP");
    if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 5MB");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${pathPrefix}-${Date.now()}.${ext}`;
    const fileRef = ref(storage, path);

    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
}
