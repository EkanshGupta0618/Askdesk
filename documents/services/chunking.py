"""
Section-aware chunking.

1. Detect headings (short lines like "Returns and Refunds").
2. Group the text under each heading into blocks.
3. Pack whole sentences into chunks of up to CHUNK_SIZE tokens.
4. Prefix every chunk with its heading, so it carries its topic.
"""

import re

import tiktoken

CHUNK_SIZE = 300          # max tokens per chunk, heading included
HEADING_MAX_WORDS = 8
SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")

_encoder = tiktoken.get_encoding("cl100k_base")


def count_tokens(text):
    return len(_encoder.encode(text))


def is_heading(line):
    """A short line that starts with a capital letter and doesn't end like a sentence."""
    words = line.split()
    return (
        0 < len(words) <= HEADING_MAX_WORDS
        and line[0].isupper()
        and not line.endswith((".", ",", ";", ":", "?", "!"))
    )


def split_into_blocks(pages):
    """
    Turn [(page_number, text), ...] into (heading, page_number, body) blocks.
    A block ends at a new heading or at the end of a page.
    The current heading carries over when a section continues on the next page.
    """
    heading = ""
    for page_number, text in pages:
        body_lines = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if is_heading(line):
                if body_lines:
                    yield heading, page_number, " ".join(body_lines)
                    body_lines = []
                heading = line
            else:
                body_lines.append(line)
        if body_lines:
            yield heading, page_number, " ".join(body_lines)


def _split_long_text(text, max_tokens):
    """Fallback for a single sentence longer than max_tokens: cut it by token count."""
    tokens = _encoder.encode(text)
    return [
        _encoder.decode(tokens[start:start + max_tokens])
        for start in range(0, len(tokens), max_tokens)
    ]


def chunk_block(heading, body, max_tokens=CHUNK_SIZE):
    """
    Pack whole sentences into chunks, each prefixed with its heading.
    The last sentence of a chunk is repeated at the start of the next
    (when it fits), so context isn't lost at the boundary.
    """
    prefix = f"{heading}\n" if heading else ""
    budget = max_tokens - count_tokens(prefix)

    sentences = []
    for sentence in SENTENCE_SPLIT.split(body):
        sentence = sentence.strip()
        if not sentence:
            continue
        if count_tokens(sentence) > budget:
            sentences.extend(_split_long_text(sentence, budget))
        else:
            sentences.append(sentence)

    chunks, current = [], []
    for sentence in sentences:
        if current and count_tokens(" ".join(current + [sentence])) > budget:
            chunks.append(prefix + " ".join(current))
            last = current[-1]
            overlap = [last] if count_tokens(f"{last} {sentence}") <= budget else []
            current = overlap + [sentence]
        else:
            current.append(sentence)
    if current:
        chunks.append(prefix + " ".join(current))
    return chunks


def build_chunks(pages):
    """Return [(page_number, content, token_count), ...] for a whole document."""
    result = []
    for heading, page_number, body in split_into_blocks(pages):
        for content in chunk_block(heading, body):
            result.append((page_number, content, count_tokens(content)))
    return result