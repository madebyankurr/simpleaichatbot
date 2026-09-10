const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const chat = document.getElementById("chat");


function addMessage(text, type) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    return message;
}


form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const userMessage = input.value.trim();

    if (!userMessage) return;


    // Add user message
    addMessage(userMessage, "user");


    // Clear input
    input.value = "";


    // Temporary thinking message
    const thinkingMessage = addMessage(
        "Thinking...",
        "ai"
    );


    try {

        const response = await fetch("/api", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: userMessage
            })

        });


        const data = await response.json();


        // Remove thinking message
        thinkingMessage.remove();


        if (!response.ok) {

            addMessage(
                data.error || "Something went wrong.",
                "ai"
            );

            return;
        }


        // Add AI response
        addMessage(
            data.response,
            "ai"
        );


    } catch (error) {

        console.error(error);

        thinkingMessage.remove();

        addMessage(
            "Could not connect to the server.",
            "ai"
        );

    }

});
