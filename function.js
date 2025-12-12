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
// IMPORTANT: Update your Glide Plugin to include a 'providerInput' parameter 
window.function = async function(columnData, prompt, secretKey, providerInput, model, temperature, maxTokens, aspectRatio) {

    columnData    = columnData?.value ?? "";
    prompt        = prompt?.value ?? "";
    secretKey     = secretKey?.value ?? "";
    
    // New Input: determines which worker function runs (e.g., "openai", "google-image")
    const provider = providerInput?.value ?? "openai"; 

    // Text-specific parameters
    model         = model?.value ?? "gpt-4o-mini";
    temperature   = temperature?.value ? Number(temperature.value) : 0.6;
    maxTokens     = maxTokens?.value ? Number(maxTokens.value) : 200;

    // Image-specific parameter
    aspectRatio   = aspectRatio?.value ?? "1:1"; 
    
    // --- Initial Validation ---
    if (!secretKey) return "Error: Secret Key required";
    if (!prompt && !columnData) return "Error: Prompt or Column → required";

    let finalPrompt = prompt || "";
    if (columnData) {
        finalPrompt = prompt ? `${prompt}\n\nData: ${columnData}` : columnData;
    }
    
    // --- Dynamic Payload Construction ---
    let aiPayload;

    if (provider === "google-image") {
        // Payload structure required for your callGoogleImage function in the Worker
        aiPayload = {
            prompt: finalPrompt,
            aspect_ratio: aspectRatio
        };
    } else if (provider === "openai" || provider === "google" || provider === "anthropic") {
        // Payload structure for text models (uses text-specific inputs)
        aiPayload = {
            model,
            messages: [{ role: "user", content: finalPrompt }],
            temperature,
            max_tokens: maxTokens
        };
    } else {
         return `Error: Unknown provider '${provider}'.`;
    }

    // --- Final Request Payload for Worker ---
    const workerRequestPayload = {
      provider: provider,
      payload: aiPayload
    };
    
    const raw = JSON.stringify(workerRequestPayload);
    const signature = await sha256(raw + secretKey);

    try {
        const response = await fetch(
            "https://cloudflare-proxy.xavierbenavidesm.workers.dev",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Signature": signature,
                },
                body: raw,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return `Error: Worker failed with status ${response.status}. Details: ${errorText}`;
        }

        const data = await response.json();

        if (!data) {
            return "Error: Empty response from server";
        }
        
        // --- Output Handling ---
        if (provider === "google-image") {
            // Check for the image URL structure from the worker
            if (data.image_url) {
                // Return the Base64 Data URL directly for Glide to display
                return data.image_url;
            }
            // If the worker returned an error, it should be in data.error
            if (data.error) {
                 return `Error from Worker: ${data.error.message || JSON.stringify(data.error)}`;
            }
        }
        
        // --- Text Output Handling (Original Logic) ---
        // Check for OpenAI/Gemini/Anthropic error structure
        if (data.error) {
            return `Error: ${data.error.message || JSON.stringify(data.error)}`;
        }
        
        const content = data?.choices?.[0]?.message?.content || 
                        data?.choices?.[0]?.text ||
                        data?.content; // Catches Anthropic/Gemini/other simple text outputs
        
        if (content) {
            return content;
        }

        // Final catch-all debug
        return `Error: Unexpected response format. Received: ${JSON.stringify(data).substring(0, 200)}`;

    } catch (err) {
        return `Error: Network failure or unexpected code error: ${err.message}`;
    }
};
  

