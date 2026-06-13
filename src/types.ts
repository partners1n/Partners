/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for static assets.
	 */
	ASSETS: { fetch: (request: Request) => Promise<Response> };

	/**
	 * LINE Channel Access Token for Messaging API
	 */
	LINE_CHANNEL_ACCESS_TOKEN: string;

	/**
	 * Binding for KV Database (ใช้สำหรับเก็บประวัติการทักเพื่อทำนาฬิกาปลุก)
	 */
	KV: KVNamespace;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}
