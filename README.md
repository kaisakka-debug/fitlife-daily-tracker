# FitLife Daily Tracker (Next.js + Supabase + PWA)

เว็บแอปพลิเคชันติดตามแคลอรี่ โปรตีน เมนูอาหารไทยทั่วไป และตารางออกกำลังกายแบบ **Mobile-First PWA** รองรับการทำงานแบบ **Offline-First** (บันทึกในเครื่องทันทีผ่าน `localStorage` และซิงก์ขึ้นคลาวด์ **Supabase** อัตโนมัติเมื่อออนไลน์)

---

## ฟีเจอร์หลัก

1. **แท็บ `คำนวณวันนี้`:**
   - คำนวณ BMR / TDEE ตามสูตรมาตรฐาน **Mifflin-St Jeor** และเป้าหมาย (ลดไขมัน / คงน้ำหนัก / เพิ่มกล้ามเนื้อ)
   - ตัวเลือกกิจกรรมประจำวัน 4 ระดับที่เข้าใจง่าย
   - **Cloud Sync (Zero-Friction):** สร้าง **Sync Code** ส่วนตัวอัตโนมัติ (เช่น `FIT-XXXX-XXXX`) เพื่อนำไปเปิดดู/ซิงก์ข้อมูลข้ามมือถือและคอมพิวเตอร์ หรือเข้าสู่ระบบด้วยอีเมล (Magic Link)
   - **ดูข้อมูลย้อนหลัง (`วันนี้` / `ย้อนหลัง`):** สลับวันที่เพื่อดูประวัติการกินจาก `food_logs`
   - เช็คอินน้ำหนักรายสัปดาห์พร้อมกราฟแนวโน้ม SVG Sparkline

2. **แท็บ `คลังเมนูทั่วไป`:**
   - รวมเมนูไทยที่สั่งกินได้จริงทุกวัน **28 เมนู** (ตามสั่ง, ก๋วยเตี๋ยว/จานเดียว, ส้มตำ/ลาบ/ปิ้งย่าง, 7-Eleven/คาเฟ่)
   - ค้นหา กรองโปรตีนสูง (`25g+`), แคลต่ำ (`<450 kcal`), สุ่มเมนู (`🎲 สุ่มเมนูมื้อนี้`), บันทึกเข้ามื้ออาหารในคลิกเดียว และเพิ่มเมนูส่วนตัว (`custom_meals`)

3. **แท็บ `ตารางออกกำลังกาย`:**
   - ตัวจับเวลาพักในตัว (`60 วิ`, `90 วิ`, `120 วิ`) พร้อมเสียงเตือน Web Audio API และโหมดจับเวลาอัตโนมัติเมื่อติ๊กเสร็จ 1 เซต
   - ตารางฝึก 3 วัน (`วันจันทร์`, `วันพุธ`, `วันศุกร์`) ปรับน้ำหนัก/จำนวนครั้ง/เพิ่ม-ลบท่าฝึกได้อิสระ
   - ปุ่มจบการฝึกที่อัปเดตสถิติต่อเนื่อง (`🔥`) และปรับงบแคลอรี่ประจำวันให้อัตโนมัติ

---

## คู่มือการติดตั้งและขึ้นระบบจริง (Step-by-Step)

### ขั้นตอนที่ 1: สร้างฐานข้อมูลบน Supabase
1. ไปที่ [supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่ฟรี (Free Tier)
2. ในหน้า Dashboard ไปที่เมนู **SQL Editor** → กด **New query**
3. คัดลอกโค้ดทั้งหมดจากไฟล์ `supabase/schema.sql` มาวาง แล้วกด **Run** เพื่อสร้างตาราง (`profiles`, `food_logs`, `weight_logs`, `custom_meals`, `workout_logs`) และนโยบาย RLS
4. ไปที่ **Project Settings → API** แล้วคัดลอกค่า 2 ตัวเก็บไว้:
   - `Project URL` (ใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (ใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

> **สำหรับการรันทดสอบในเครื่อง (Local Development):**
> ```bash
> npm install
> cp .env.example .env.local
> # นำค่า URL และ Key จาก Supabase มาใส่ใน .env.local
> npm run dev
> ```

---

### ขั้นตอนที่ 2: นำโค้ดขึ้น GitHub
สร้าง Repository ใหม่บน GitHub (เช่น `fitlife-daily-tracker`) แล้วรันคำสั่งในโฟลเดอร์โปรเจกต์:

```bash
git init
git add .
git commit -m "Initial commit: FitLife Daily Tracker PWA + Supabase"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/fitlife-daily-tracker.git
git push -u origin main
```

---

### ขั้นตอนที่ 3: Deploy ขึ้น Vercel
1. เข้าสู่ระบบที่ [vercel.com](https://vercel.com) → กด **Add New... → Project**
2. เลือก Import Repository `fitlife-daily-tracker` จาก GitHub ของคุณ
3. ในหัวข้อ **Environment Variables** ให้เพิ่มตัวแปร 2 รายการ:
   - `NEXT_PUBLIC_SUPABASE_URL` = ค่า Project URL จาก Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ค่า anon public key จาก Supabase
4. กดปุ่ม **Deploy** และรอประมาณ 1–2 นาที ก็จะได้ลิงก์เว็บพร้อมใช้งานจริง

---

### ขั้นตอนที่ 4: ติดตั้งเป็นแอปบนมือถือ (PWA)
เมื่อเปิดลิงก์จาก Vercel บนมือถือ สามารถเพิ่มเป็นไอคอนแอปเหมือนแอป Native ได้ทันที:

- **iPhone / iPad (Safari):** เปิดเว็บใน Safari → กดปุ่ม **แชร์ (Share)** ด้านล่าง → เลือก **เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)**
- **Android (Chrome):** เปิดเว็บใน Chrome → กดปุ่มเมนู **จุด 3 จุด (⋮)** มุมขวาบน → เลือก **ติดตั้งแอป (Install App)**
