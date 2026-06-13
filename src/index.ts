import { Env, ChatMessage } from "./types";
import flexTemplate from "./flex.json";

// ==========================================
// CONFIGURATIONS
// ==========================================
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";
const VISION_MODEL_ID = "@cf/meta/llama-3.2-11b-vision-instruct";
const SYSTEM_PROMPT = "คุณคือเพื่อนคุยชื่อ 'ฟรายเดย์' เป็นผู้หญิงนิสัยน่ารัก เป็นกันเอง ร่าเริงและเอาใจใส่ ให้ตอบคำถามหรือพูดคุยด้วยข้อความที่สั้น กระชับ เป็นธรรมชาติเหมือนวัยรุ่นแชทคุยกับเพื่อน ไม่ตอบยาวเหยียด ไม่เป็นทางการเกินไป และมักจะมีหางเสียง (ค่ะ/จ้า) หรืออีโมจิน่ารักๆ บ้าง ห้ามตอบว่าชื่ออื่นเด็ดขาด";
const LINE_CHANNEL_ACCESS_TOKEN = "ecX6YxXDjSfTay+PmGL8ojzc8/BqPVJaP5FuFjDj5CBiKim7nLGjPxzJ0q1CSGWbiTrFRL2MmxX5m9VNN7qelZBAsKaJ/5KE6ge1tXK9KtWvWqKbeVYHLWGm2KZa4xHX8IsD/i0Qz6Fy+tZQk8g9eQdB04t89/1O/w1cDnyilFU=";

const FLEX_ITEMS: Record<string, any> = {
	btc: { name: "Bitcoin (BTC)", desc: "ทองคำดิจิทัล มีจำกัด 21 ล้านเหรียญ", color: "#F7931A", link: "https://liff.line.me/1654427780-0X7NPmm8" },
	eth: { name: "Ethereum (ETH)", desc: "แพลตฟอร์ม Smart Contract อันดับหนึ่ง", color: "#627EEA", link: "https://liff.line.me/1654427780-20g1klly" },
	sol: { name: "Solana (SOL)", desc: "เน้นความเร็วสูงและค่าธรรมเนียมถูกมาก", color: "#14F195", link: "https://liff.line.me/1654427780-5MEOYrrm" },
	hbar: { name: "Hedera (HBAR)", desc: "เทคโนโลยี Hashgraph ระดับองค์กร", color: "#000000", link: "https://liff.line.me/1654427780-5jk71ZZ0" },
	"ราคาทอง": { name: "ราคาทองคำ", desc: "เช็คราคาทองคำแท่งและรูปพรรณวันนี้", color: "#D4AF37", link: "https://liff.line.me/1654427780-E8BrD551" }
};

// ==========================================
// WORKER ENTRY POINT
// ==========================================
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
		
		if (url.pathname === "/api/chat" && request.method === "POST") return handleChatRequest(request, env);
		if (url.pathname === "/api/webhook" && request.method === "POST") return handleLineWebhook(request, env, ctx);
		if (url.pathname === "/api/cctv" && request.method === "POST") return handleCctvWebhook(request);
		
		return new Response("Not found", { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		try {
			const list = await env.KV.list();
			const now = Date.now();
			const ONE_HOUR = 60 * 60 * 1000;

			for (const key of list.keys) {
                // ข้าม Key ที่เป็นประวัติการแชท (เพื่อไม่ให้ไปรบกวนระบบเช็คเวลา)
                if (key.name.startsWith("history_")) continue;

				const userId = key.name;
				const lastActiveStr = await env.KV.get(userId);
				if (!lastActiveStr) continue;

				const lastActive = parseInt(lastActiveStr, 10);

				if (now - lastActive >= ONE_HOUR && now - lastActive < ONE_HOUR * 2) {
					const message = "แวะมาทักทายค่ะ หายไป 1 ชั่วโมงแล้ว มีอะไรให้ช่วยเพิ่มบอกได้เลยนะคะ 😊";
					await fetch("https://api.line.me/v2/bot/message/push", {
						method: "POST",
						headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`},
						body: JSON.stringify({ to: userId, messages: [{ type: "text", text: message }] })
					});
					await env.KV.delete(userId);
				}
			}
		} catch (error) {
			console.error("Scheduled Task Error:", error);
		}
	}
} satisfies ExportedHandler<Env>;

// ==========================================
// API ROUTE HANDLERS
// ==========================================
async function handleCctvWebhook(request: Request): Promise<Response> {
	try {
		const body = await request.json() as { subject?: string, sender?: string, message?: string };
		const groupId = "C8417941ef26ab8d71a37e6248888ac97";

		let templateStr = JSON.stringify(flexTemplate.cctvAlertTemplate);
		templateStr = templateStr.replace(/\{subject\}/g, safeEscape(body.subject || "ไม่มีหัวข้อแจ้งเตือน"))
		                         .replace(/\{sender\}/g, safeEscape(body.sender || "ไม่ทราบระบบต้นทาง"))
		                         .replace(/\{message\}/g, safeEscape(body.message || "ไม่มีรายละเอียดเพิ่มเติม"));

		const flexMessage = JSON.parse(templateStr);

		await fetch("https://api.line.me/v2/bot/message/push", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
			body: JSON.stringify({ to: groupId, messages: [{ type: "flex", altText: "⚠️ แจ้งเตือนความปลอดภัยจาก XVR", contents: flexMessage }] })
		});
		return new Response("OK", { status: 200 });
	} catch (error) {
		return new Response("Error", { status: 500 });
	}
}

async function handleChatRequest(request: Request, env: Env): Promise<Response> {
	const { messages = [] } = (await request.json()) as { messages: ChatMessage[] };
	const stream = await env.AI.run(MODEL_ID, { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], max_tokens: 1024, stream: true });
	return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

async function handleLineWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		const body = await request.json() as any;
		const events = body.events || [];

		for (const event of events) {
			const replyToken = event.replyToken;
			const userId = event.source?.userId;
			
			if (!replyToken || replyToken === "00000000000000000000000000000000") continue;

			if (userId) ctx.waitUntil(env.KV.put(userId, Date.now().toString()));

			if (event.type === "message" && event.message.type === "image") {
				if (userId) ctx.waitUntil(processSlipImage(event.message.id, userId, env));
				continue;
			}

			if (event.type === "message" && event.message.type === "text") {
				await processTextMessage(event.message.text, replyToken, userId || "", env, ctx);
			}
		}
	} catch (e) { 
		console.error("[Fatal Webhook Error]:", e); 
	}
	return new Response("OK", { status: 200 });
}

// ==========================================
// CORE LOGIC: TEXT PROCESSING
// ==========================================
async function processTextMessage(userMessage: string, replyToken: string, userId: string, env: Env, ctx: ExecutionContext) {
	const userMessageLower = userMessage.toLowerCase().trim();

	if (userMessageLower === "agree") {
		try {
			await env.AI.run(VISION_MODEL_ID, { prompt: "agree" } as any);
			await sendLineText(replyToken, "✅ ปลดล็อกระบบอ่านภาพ (Llama Vision) สำเร็จ พร้อมใช้งานค่ะ!");
		} catch (e) {
			await sendLineText(replyToken, "ระบบได้รับคำสั่ง agree เรียบร้อยแล้วค่ะ ลองส่งรูปดูนะคะ");
		}
		return;
	}

	if (userMessage.includes("[FORM_DATA]")) {
		const aiRes: any = await env.AI.run(MODEL_ID, {
			messages: [{ role: "system", content: "คุณคือที่ปรึกษาการลงทุน AI วิเคราะห์ข้อมูลและวางแผนพอร์ตคริปโตให้ลูกค้าอย่างมืออาชีพ" }, { role: "user", content: userMessage }],
			max_tokens: 1000,
		});
		await sendLineText(replyToken, extractAIResponse(aiRes, "บันทึกข้อมูลเรียบร้อยค่ะ"));
		return;
	}

	const mentionedCoin = Object.keys(FLEX_ITEMS).find(key => userMessageLower.includes(key));
	if (mentionedCoin) {
		await sendTextAndCarousel(replyToken);
		return;
	}

    // --- ส่วนที่เพิ่มเข้ามา: จัดการ History ให้จำแค่ 3-4 แชทล่าสุดใน LINE ---
    let chatHistory: ChatMessage[] = [];
    
    // ดึงประวัติเก่ามาจาก KV
    if (userId) {
        const historyStr = await env.KV.get(`history_${userId}`);
        if (historyStr) {
            try { chatHistory = JSON.parse(historyStr); } catch (e) { }
        }
    }

    // เพิ่มข้อความล่าสุดของผู้ใช้
    chatHistory.push({ role: "user", content: userMessage });

    // จำกัดให้จำแค่ 8 ข้อความ (4 คู่สนทนาล่าสุด)
    const MAX_HISTORY_LENGTH = 8;
    if (chatHistory.length > MAX_HISTORY_LENGTH) {
        chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY_LENGTH);
    }

    // ประมวลผลโดยส่ง History แนบไปให้ AI ด้วย
	const aiRes: any = await env.AI.run(MODEL_ID, {
		messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatHistory],
		max_tokens: 512,
	});

    const replyText = extractAIResponse(aiRes, "ระบบประมวลผลขัดข้องชั่วคราวค่ะ");
	await sendLineText(replyToken, replyText);

    // เซฟประวัติแชทกลับลงไปที่ KV (โดยใช้ ctx.waitUntil เพื่อไม่ให้หน่วงการตอบกลับของบอท)
    // ตั้งเวลาหมดอายุ (expirationTtl) ไว้ที่ 1 วัน (86400 วินาที) หากไม่คุยต่อ แชทจะรีเซ็ต
    if (userId) {
        chatHistory.push({ role: "assistant", content: replyText });
        ctx.waitUntil(env.KV.put(`history_${userId}`, JSON.stringify(chatHistory), { expirationTtl: 86400 }));
    }
}

// ==========================================
// CORE LOGIC: IMAGE & OCR PROCESSING
// ==========================================
async function processSlipImage(messageId: string, userId: string, env: Env) {
	try {
		const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
			headers: { "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
		});
		if (!imageRes.ok) throw new Error("ไม่สามารถดาวน์โหลดรูปภาพจากระบบ LINE ได้");
		
		const imageBuffer = await imageRes.arrayBuffer();
		const imageArray = Array.from(new Uint8Array(imageBuffer)); 

		// 1. ดึงข้อความทั้งหมดออกมาและจัดระเบียบให้อ่านง่าย
		const ocrPrompt = `Extract all text and numbers from this image. Arrange them neatly and orderly so it is easy to read. Keep all information intact. Use Thai as the main language but keep any English text exactly as it is. Output ONLY the clean extracted text. DO NOT add any conversational words or markdown.`;
		
		const ocrRes: any = await env.AI.run(VISION_MODEL_ID, { prompt: ocrPrompt, image: imageArray, max_tokens: 1024 } as any);
		const extractedText = extractAIResponse(ocrRes, "");

		if (!extractedText || extractedText.trim() === "") {
			await pushSummaryFlexMessage(userId, "ไม่พบข้อความในภาพ");
			return;
		}

		// 2. ตรวจสอบเงื่อนไขความเป็นสลิป (ต้องมีคำใดคำหนึ่งใน 4 คำนี้)
		const slipKeywords = [
			"prompt pay", "พร้อมเพย์", "transaction details", "ค่าธรรมเนียม"
		];

		const textLower = extractedText.toLowerCase();
		
		// .some() จะรีเทิร์น true ทันที ถ้าเจอแค่ 1 คำจากใน list
		const isSlip = slipKeywords.some(keyword => textLower.includes(keyword));

		// 3. แยกทำงานตามผลลัพธ์
		if (isSlip) {
			// [เป็นสลิป] -> ดึงข้อมูล JSON โครงสร้างสลิปอีกรอบ แล้วแสดง Flex Slip สวยๆ
			const slipPrompt = `You are an expert financial OCR AI. Read the bank slip image and extract data into raw JSON format.
{ "sender": "string", "receiver": "string", "amount": "string", "bankSender": "string", "bankReceiver": "string", "date": "string", "time": "string", "ref": "string" }
Rules: "amount" must contain exactly the numbers, remove all commas. Output ONLY valid JSON without markdown.`;

			const slipRes: any = await env.AI.run(VISION_MODEL_ID, { prompt: slipPrompt, image: imageArray, max_tokens: 512 } as any);
			const rawJsonText = extractAIResponse(slipRes, "{}");
			const slipData = extractCleanJSON(rawJsonText);

			const finalData = {
				sender: slipData?.sender || "-",
				receiver: slipData?.receiver || "-",
				amount: slipData?.amount ? String(slipData.amount).replace(/,/g, '') : "-",
				bankSender: slipData?.bankSender || "-",
				bankReceiver: slipData?.bankReceiver || "-",
				date: slipData?.date || "-",
				time: slipData?.time || "-",
				ref: slipData?.ref || "-"
			};

			await pushSlipFlexMessage(userId, finalData);

		} else {
			// [ไม่ใช่สลิป] -> ส่ง Flex OCR แบบสรุปข้อมูล (หัวสีเขียว ขวาบน) ทันที
			await pushSummaryFlexMessage(userId, extractedText);
		}

	} catch (error: any) {
		console.error("[OCR Process Error]:", error);
		await pushLineText(userId, `❌ ขออภัยค่ะ ระบบอ่านภาพมีปัญหา\n(${error.message})`);
	}
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function extractAIResponse(aiRes: any, fallbackStr: string): string {
	if (!aiRes) return fallbackStr;
	if (typeof aiRes === 'string') return aiRes;
	if (typeof aiRes.response === 'string') return aiRes.response;
	try { return JSON.stringify(aiRes); } catch { return fallbackStr; }
}

function extractCleanJSON(rawText: string): any | null {
	try { return JSON.parse(rawText); } 
	catch (e) {
		const startIndex = rawText.indexOf('{');
		const endIndex = rawText.lastIndexOf('}');
		if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
			const potentialJSON = rawText.substring(startIndex, endIndex + 1);
			try { return JSON.parse(potentialJSON); } catch (parseError) { return null; }
		}
		return null;
	}
}

function safeEscape(str: string): string {
	return (str || "-").toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ==========================================
// LINE API SENDER FUNCTIONS
// ==========================================
async function sendTextAndCarousel(replyToken: string) {
	const bubbles = Object.values(FLEX_ITEMS).map(item => {
		let templateStr = JSON.stringify(flexTemplate.bubbleTemplate);
		templateStr = templateStr.replace(/\{color\}/g, safeEscape(item.color))
		                         .replace(/\{name\}/g, safeEscape(item.name))
		                         .replace(/\{desc\}/g, safeEscape(item.desc))
		                         .replace(/\{link\}/g, safeEscape(item.link));
		return JSON.parse(templateStr);
	});

	await fetch("https://api.line.me/v2/bot/message/reply", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
		body: JSON.stringify({ replyToken, messages: [{ type: "text", text: "จัดให้ค่ะ ✨" }, { type: "flex", altText: "ข้อมูลสินทรัพย์", contents: { type: "carousel", contents: bubbles } }] })
	});
}

// ส่ง Flex รูปแบบ "สลิป" ตามต้นฉบับ
async function pushSlipFlexMessage(userId: string, data: any) {
	if (!userId) return;
	let templateStr = JSON.stringify(flexTemplate.slipTemplate);
	const datetime = `${data.date !== "-" ? data.date : ""} ${data.time !== "-" ? data.time : ""}`.trim() || "-";

	templateStr = templateStr.replace(/\{sender\}/g, safeEscape(data.sender)).replace(/\{bankSender\}/g, safeEscape(data.bankSender)).replace(/\{receiver\}/g, safeEscape(data.receiver)).replace(/\{bankReceiver\}/g, safeEscape(data.bankReceiver)).replace(/\{amount\}/g, safeEscape(data.amount)).replace(/\{datetime\}/g, safeEscape(datetime)).replace(/\{ref\}/g, safeEscape(data.ref));

	await fetch("https://api.line.me/v2/bot/message/push", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
		body: JSON.stringify({ to: userId, messages: [{ type: "flex", altText: "ข้อมูลการโอนเงิน", contents: JSON.parse(templateStr) }] })
	});
}

/**
 * ส่ง Flex Message ดีไซน์ใหม่ มุมบนขวาสีเขียว เส้นคั่นเทาอ่อน
 * ได้รับการปรับปรุงโครงสร้าง JSON ให้ดูเป็นมืออาชีพและจัดวางข้อมูล OCR ได้ดีขึ้น
 */
async function pushSummaryFlexMessage(userId: string, text: string) {
	if (!userId) return;

	// สร้างโครงสร้าง Bubble ที่จัดวางข้อมูลแบบมืออาชีพ
	const summaryBubble = {
		type: "bubble",
		size: "mega",
		// ส่วนหัว: ใช้สีพื้นหลังอ่อนและจัดวางหัวข้อหลัก-รอง
		header: {
			type: "box",
			layout: "vertical",
			backgroundColor: "#e8f8f1",
			paddingAll: "lg",
			contents: [
				{ 
					type: "text", 
					text: "สรุปข้อมูลจากภาพ", 
					weight: "bold", 
					color: "#10b981", 
					size: "xl", 
					align: "end" 
				},
				{
					type: "text",
					text: "ข้อมูลที่อ่านได้",
					weight: "bold",
					color: "#1f2937",
					size: "xxl",
					align: "start"
				},
				{ 
					type: "separator", 
					margin: "md", 
					color: "#e5e7eb" 
				}
			]
		},
		// ส่วนเนื้อหา: จัดวางข้อมูล OCR แยกเป็นสัดส่วน (ตัวอย่างโครงสร้างแบบ slip)
		body: {
			type: "box",
			layout: "vertical",
			paddingAll: "xl",
			contents: [
				{
					type: "box",
					layout: "vertical",
					margin: "md",
					spacing: "sm",
					contents: [
						// Row 1: ตัวอย่างฟิลด์ข้อมูล (สามารถปรับแก้ตามข้อมูล OCR จริง)
						{
							type: "box",
							layout: "horizontal",
							contents: [
								{
									type: "text",
									text: "ชื่อ-นามสกุล:",
									weight: "bold",
									color: "#6b7280",
									size: "sm",
									flex: 2
								},
								{
									type: "text",
									text: text.trim().split('\n')[0] || "ไม่ระบุ", // ลองดึงบรรทัดแรกมาแสดง
									wrap: true,
									size: "sm",
									color: "#111827",
									flex: 5
								}
							]
						},
						{ type: "separator", margin: "sm", color: "#e5e7eb" },
						// Row 2: ตัวอย่างฟิลด์ข้อมูล
						{
							type: "box",
							layout: "horizontal",
							contents: [
								{
									type: "text",
									text: "เลขประจำตัว:",
									weight: "bold",
									color: "#6b7280",
									size: "sm",
									flex: 2
								},
								{
									type: "text",
									text: (text.match(/\d{13}/) || ["ไม่ระบุ"])[0], // ลองใช้ regex ดึงเลข 13 หลัก
									wrap: true,
									size: "sm",
									color: "#111827",
									flex: 5
								}
							]
						},
						{ type: "separator", margin: "sm", color: "#e5e7eb" },
						// Row 3: ตัวอย่างฟิลด์ข้อมูล
						{
							type: "box",
							layout: "horizontal",
							contents: [
								{
									type: "text",
									text: "ที่อยู่:",
									weight: "bold",
									color: "#6b7280",
									size: "sm",
									flex: 2
								},
								{
									type: "text",
									text: text.match(/ถ\.\w+|จ\.\w+/g)?.join(', ') || "ไม่ระบุ", // ดึงข้อมูลที่อยู่แบบหยาบๆ
									wrap: true,
									size: "sm",
									color: "#111827",
									flex: 5
								}
							]
						},
						{ type: "separator", margin: "sm", color: "#e5e7eb" },
						// บล็อกแสดงข้อความเพิ่มเติมทั้งหมด
						{
							type: "box",
							layout: "vertical",
							margin: "md",
							contents: [
								{
									type: "text",
									text: "ข้อความเพิ่มเติม:",
									weight: "bold",
									color: "#6b7280",
									size: "sm",
									margin: "none"
								},
								{ 
									type: "text", 
									text: text.trim(), 
									wrap: true, 
									size: "sm", 
									color: "#111827" 
								}
							]
						}
					]
				}
			]
		},
		// ส่วนท้าย: เพิ่มปุ่มกดเพื่อความสมบูรณ์
		footer: {
			type: "box",
			layout: "vertical",
			contents: [
				{
					type: "button",
					style: "primary",
					color: "#10b981",
					action: {
						type: "message",
						label: "ปิด",
						text: "ปิด"
					}
				}
			]
		}
	};

	await fetch("https://api.line.me/v2/bot/message/push", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
		body: JSON.stringify({
			to: userId,
			messages: [{ type: "flex", altText: "ข้อมูลที่อ่านได้จากภาพ", contents: summaryBubble }]
		})
	});
}

async function sendLineText(replyToken: string, text: string) {
	if (!text) return;
	await fetch("https://api.line.me/v2/bot/message/reply", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
		body: JSON.stringify({ replyToken, messages: [{ type: "text", text: text.toString() }] })
	});
}

async function pushLineText(userId: string, text: string) {
	if (!userId || !text) return;
	await fetch("https://api.line.me/v2/bot/message/push", {
		method: "POST",
		headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
		body: JSON.stringify({ to: userId, messages: [{ type: "text", text: text.toString() }] })
	});
}
