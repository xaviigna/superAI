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
  
    columnData   = columnData?.value ?? "";
    prompt       = prompt?.value ?? "";
    secretKey    = secretKey?.value ?? "";
    model        = model?.value ?? "gpt-4o-mini";
    temperature  = temperature?.value ? Number(temperature.value) : 0.6;
    maxTokens    = maxTokens?.value ? Number(maxTokens.value) : 200;
  
    if (!secretKey) return "Error: Secret Key required";
    if (!prompt && !columnData) return "Error: Prompt or Column → required";
  
    let finalPrompt = prompt || "";
    if (columnData) {
      finalPrompt = prompt ? `${prompt}\n\nData: ${columnData}` : columnData;
    }
  
    // ALWAYS enforce provider
    const payload = {
      provider: "openai",
      payload: {
        model,
        messages: [{ role: "user", content: finalPrompt }],
        temperature,
        max_tokens: maxTokens
      }
    };
  
    const raw = JSON.stringify(payload);
    const signature = await sha256(raw + secretKey);

    try {
      // Ensure body is a string (not undefined/null)
      if (!raw || typeof raw !== 'string') {
        return "Error: Failed to serialize payload";
      }

      const response = await fetch(
        "https://cloudflare-proxy.xavierbenavidesm.workers.dev",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature": signature
          },
          body: raw  // String body should work, but ensure it's not empty
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        return `Error: ${errorText}`;
      }
  
      const data = await response.json();
  
      // Debug: Check what we actually received
      if (!data) {
        return "Error: Empty response from server";
      }
      
      // Check for OpenAI error structure
      if (data.error) {
        return `Error: ${data.error.message || JSON.stringify(data.error)}`;
      }
      
      // Try to extract the content
      const content = data?.choices?.[0]?.message?.content || 
                      data?.choices?.[0]?.text ||
                      data?.content;
      
      if (content) {
        return content;
      }
      
      // If we get here, log what we received for debugging
      return `Error: Unexpected response format. Received: ${JSON.stringify(data).substring(0, 200)}`;
  
    } catch (err) {
      return `Error: ${err.message}`;
    }
  };
  

