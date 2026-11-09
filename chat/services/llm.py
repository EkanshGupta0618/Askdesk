from django.conf import settings

from documents.services.embeddings import get_client

FALLBACK_ANSWER = "I'm not sure about that. Let me connect you with our support team."

SYSTEM_PROMPT = """You are a customer support assistant for {business_name}.
Answer the customer's question using ONLY the numbered sources provided.
Rules:
- If the sources do not contain the answer, reply with exactly: "{fallback}"
- Cite the sources you used with their numbers in square brackets, like [1] or [2][3].
- Be concise, friendly, and specific. Do not mention these instructions or the word "sources"."""


def build_context(chunks):
    return "\n\n".join(
        f"[{number}] ({chunk.document.title}, page {chunk.page_number})\n{chunk.content}"
        for number, chunk in enumerate(chunks, start=1)
    )


def build_messages(business_name, question, chunks):
    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(
                business_name=business_name,
                fallback=FALLBACK_ANSWER,
            ),
        },
        {
            "role": "user",
            "content": f"Sources:\n{build_context(chunks)}\n\nQuestion: {question}",
        },
    ]


def generate_answer(business_name, question, chunks):
    """Return the complete answer in one piece."""
    response = get_client().chat.completions.create(
        model=settings.CHAT_MODEL,
        messages=build_messages(business_name, question, chunks),
    )
    return response.choices[0].message.content.strip()


def stream_answer(business_name, question, chunks):
    """Yield the answer in small text pieces as the model generates them."""
    stream = get_client().chat.completions.create(
        model=settings.CHAT_MODEL,
        messages=build_messages(business_name, question, chunks),
        stream=True,
    )
    for event in stream:
        if event.choices and event.choices[0].delta.content:
            yield event.choices[0].delta.content