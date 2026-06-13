เทมเพลตแอปพลิเคชันแชท LLM

เทมเพลตแอปพลิเคชันแชทที่เรียบง่าย พร้อมปรับใช้งาน ขับเคลื่อนโดย Cloudflare Workers AI เทมเพลตนี้มอบจุดเริ่มต้นที่สะอาดสำหรับการสร้างแอปพลิเคชันแชท AI พร้อมการตอบกลับแบบสตรีมมิ่ง

https://deploy.workers.cloudflare.com/button

<!-- dash-content-start -->

การสาธิต

เทมเพลตนี้สาธิตวิธีการสร้างส่วนติดต่อแชทที่ขับเคลื่อนด้วย AI โดยใช้ Cloudflare Workers AI พร้อมการตอบกลับแบบสตรีมมิ่ง โดยมีคุณสมบัติ:

· การสตรีมการตอบกลับ AI แบบเรียลไทม์โดยใช้ Server-Sent Events (SSE)
· การปรับแต่งโมเดลและ System Prompt ได้อย่างง่ายดาย
· รองรับการผสานรวม AI Gateway
· ส่วนติดต่อผู้ใช้ที่สะอาดและตอบสนองได้ดีบนมือถือและเดสก์ท็อป

คุณสมบัติ

· 💬 ส่วนติดต่อแชทที่เรียบง่ายและตอบสนองได้ดี
· ⚡ Server-Sent Events (SSE) สำหรับการสตรีมการตอบกลับ
· 🧠 ขับเคลื่อนโดย Cloudflare Workers AI LLMs
· 🛠️ สร้างด้วย TypeScript และ Cloudflare Workers
· 📱 ออกแบบให้เป็นมิตรกับมือถือ
· 🔄 เก็บบันทึกประวัติแชทบนฝั่งไคลเอนต์
· 🔎 มีการบันทึก Observability ในตัว

<!-- dash-content-end -->

เริ่มต้นใช้งาน

ข้อกำหนดเบื้องต้น

· Node.js (v18 ขึ้นไป)
· Wrangler CLI
· บัญชี Cloudflare ที่สามารถเข้าถึง Workers AI

การติดตั้ง

1. โคลนที่เก็บนี้:
   ```bash
   git clone https://github.com/cloudflare/templates.git
   cd templates/llm-chat-app
   ```
2. ติดตั้งแพ็คเกจที่จำเป็น:
   ```bash
   npm install
   ```
3. สร้างการกำหนดประเภท Worker:
   ```bash
   npm run cf-typegen
   ```

การพัฒนา

เริ่มเซิร์ฟเวอร์พัฒนาท้องถิ่น:

```bash
npm run dev
```

คำสั่งนี้จะเริ่มเซิร์ฟเวอร์ท้องถิ่นที่ http://localhost:8787

หมายเหตุ: การใช้ Workers AI เข้าถึงบัญชี Cloudflare ของคุณแม้ในระหว่างการพัฒนาท้องถิ่น ซึ่งจะทำให้เกิดค่าใช้จ่ายในการใช้งาน

การปรับใช้

ปรับใช้กับ Cloudflare Workers:

```bash
npm run deploy
```

การตรวจสอบ

ดูบันทึกตามเวลาจริงที่เกี่ยวข้องกับ Worker ที่ปรับใช้:

```bash
npm wrangler tail
```

โครงสร้างโปรเจกต์

```
/
├── public/             # ไฟล์สาธารณะ
│   ├── index.html      # HTML ส่วนติดต่อแชท
│   └── chat.js         # สคริปต์ฟรอนต์เอนด์ของแชท
├── src/
│   ├── index.ts        # จุดเริ่มต้นของ Worker หลัก
│   └── types.ts        # การกำหนดประเภท TypeScript
├── test/               # ไฟล์ทดสอบ
├── wrangler.jsonc      # การกำหนดค่า Cloudflare Worker
├── tsconfig.json       # การกำหนดค่า TypeScript
└── README.md           # เอกสารนี้
```

วิธีการทำงาน

แบ็กเอนด์

แบ็กเอนด์สร้างด้วย Cloudflare Workers และใช้แพลตฟอร์ม Workers AI เพื่อสร้างการตอบกลับ ส่วนประกอบหลักคือ:

1. API Endpoint (/api/chat): รับคำขอ POST พร้อมข้อความแชทและสตรีมการตอบกลับ
2. การสตรีม: ใช้ Server-Sent Events (SSE) สำหรับการสตรีมการตอบกลับ AI แบบเรียลไทม์
3. Workers AI Binding: เชื่อมต่อกับบริการ AI ของ Cloudflare ผ่าน Workers AI binding

ฟรอนต์เอนด์

ฟรอนต์เอนด์เป็นแอปพลิเคชัน HTML/CSS/JavaScript อย่างง่ายที่:

1. แสดงส่วนติดต่อแชท
2. ส่งข้อความจากผู้ใช้ไปยัง API
3. ประมวลผลการตอบกลับแบบสตรีมตามเวลาจริง
4. เก็บบันทึกประวัติแชทฝั่งไคลเอนต์

การปรับแต่ง

การเปลี่ยนโมเดล

หากต้องการใช้โมเดล AI อื่น ให้อัปเดตค่าคงที่ MODEL_ID ใน src/index.ts คุณสามารถดูโมเดลที่พร้อมใช้งานได้ใน เอกสาร Cloudflare Workers AI

การใช้ AI Gateway

เทมเพลตมีโค้ดที่ถูกคอมเมนต์ไว้สำหรับการผสานรวม AI Gateway ซึ่งให้ความสามารถเพิ่มเติม เช่น การจำกัดอัตรา การแคช และการวิเคราะห์

เพื่อเปิดใช้ AI Gateway:

1. สร้าง AI Gateway ในแดชบอร์ด Cloudflare ของคุณ
2. ยกเลิกการคอมเมนต์การกำหนดค่าเกตเวย์ใน src/index.ts
3. แทนที่ YOUR_GATEWAY_ID ด้วย AI Gateway ID จริงของคุณ
4. กำหนดค่าตัวเลือกเกตเวย์อื่น ๆ ตามต้องการ:
   · skipCache: ตั้งเป็น true เพื่อข้ามการแคชของเกตเวย์
   · cacheTtl: ตั้งค่า time-to-live ของแคชเป็นวินาที

เรียนรู้เพิ่มเติมเกี่ยวกับ AI Gateway

การแก้ไข System Prompt

สามารถเปลี่ยน System Prompt เริ่มต้นได้โดยอัปเดตค่าคงที่ SYSTEM_PROMPT ใน src/index.ts

การปรับแต่งสไตล์

สไตล์ UI อยู่ในส่วน <style> ของ public/index.html คุณสามารถแก้ไขตัวแปร CSS ด้านบนเพื่อเปลี่ยนชุดสีได้อย่างรวดเร็ว

แหล่งข้อมูล

· เอกสาร Cloudflare Workers
· เอกสาร Cloudflare Workers AI
· โมเดล Workers AI