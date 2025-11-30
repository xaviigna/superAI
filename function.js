// ---------------------------
// SHA256 helper
// ---------------------------
async function sha256(message) {
	const msgUint8 = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  
  // ---------------------------------------
  // MAIN FUNCTION (Glide Experimental Code)
  // ---------------------------------------
  window.function = async function(columnData, prompt, secretKey, model, temperature, maxTokens) {
  
	// INPUTS
	columnData = columnData?.value ?? "";
	prompt = prompt?.value ?? "";
	secretKey = secretKey?.value ?? "";   // PRIVATE
	model = model?.value ?? "gpt-4o-mini";
	temperature = temperature?.value ? Number(temperature.value) : 0.7;
	maxTokens = maxTokens?.value ? Number(maxTokens.value) : 500;
  
	// VALIDACIONES
	if (!secretKey) return "Error: Secret Key is required";
	if (!prompt && !columnData) return "Error: Prompt or Column → is required";
  
	// BUILD FINAL PROMPT
	let finalPrompt = prompt || "";
	if (columnData) {
	  finalPrompt = prompt
		? `${prompt}\n\nData: ${columnData}`
		: columnData;
	}
  
	// WORKER PAYLOAD
	const payload = {
	  provider: "openai",
	  payload: {
		model,
		messages: [
		  {
			role: "user",
			content: finalPrompt
		  }
		],
		temperature,
		max_tokens: maxTokens
	  }
	};
  
	const raw = JSON.stringify(payload);
  
	// CALCULATE SIGNATURE
	const signature = await sha256(raw + secretKey);
  
	// SEND TO CLOUDFLARE WORKER
	try {
	  const response = await fetch("https://cloudflare-proxy.xavierbenavidesm.workers.dev", {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		  "X-Signature": signature
		},
		body: raw
	  });
  
	  if (!response.ok) {
		const err = await response.text();
		return `Error: ${err}`;
	  }
  
	  const data = await response.json();
  
	  // EXTRACT TEXT (OpenAI format)
	  return (
		data?.choices?.[0]?.message?.content ||
		data?.choices?.[0]?.text ||
		"No response"
	  );
  
	} catch (err) {
	  return `Error: ${err.message}`;
	}
  };
