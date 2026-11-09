"""
Run an evaluation set through the real answering pipeline and measure quality.

    python manage.py run_eval eval/brewhaven_eval.json --business brewhaven-coffee-co

Uses the same steps as AskView (retrieve -> relevance check -> LLM -> fallback check)
but saves no conversations, so evaluation runs never appear in the dashboard.
"""

import json
import math
import statistics
import time
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from openai import OpenAIError

from chat.services.llm import generate_answer
from chat.services.retrieval import retrieve_chunks
from chat.views import is_fallback, is_relevant
from tenants.models import Business


def section_of(chunk):
    """Chunks start with their section heading (see documents/services/chunking.py)."""
    return chunk.content.splitlines()[0].strip() if chunk.content else ""


def normalize(text):
    return text.lower().replace("\u2013", "-").replace("\u2014", "-")


def includes_all_groups(answer, groups):
    """Every group needs at least one of its phrases in the answer."""
    text = normalize(answer)
    return all(any(normalize(phrase) in text for phrase in group) for group in groups)


def p90(values):
    """Nearest-rank 90th percentile."""
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(0.9 * len(ordered)) - 1)]


def pct(part, whole):
    return round(100 * part / whole, 1) if whole else None


class Command(BaseCommand):
    help = "Evaluate answer quality, refusals, retrieval and speed on a question set."

    def add_arguments(self, parser):
        parser.add_argument("dataset", help="Path to the evaluation JSON file")
        parser.add_argument("--business", required=True, help="Business slug (see /admin/ > Businesses)")
        parser.add_argument("--limit", type=int, help="Only run the first N cases")
        parser.add_argument(
            "--clear-cache",
            action="store_true",
            help="Clear the cache first, so cached question embeddings don't make latency look faster",
        )

    def handle(self, *args, **options):
        dataset_path = Path(options["dataset"])
        if not dataset_path.exists():
            raise CommandError(f"Dataset not found: {dataset_path}")
        dataset = json.loads(dataset_path.read_text(encoding="utf-8"))

        business = Business.objects.filter(slug=options["business"]).first()
        if business is None:
            raise CommandError(f"No business with slug '{options['business']}'. Check /admin/ > Businesses.")

        if options["clear_cache"]:
            cache.clear()

        cases = dataset["cases"][: options["limit"]] if options["limit"] else dataset["cases"]
        self.stdout.write(f"Running {len(cases)} cases for {business.name} with {settings.CHAT_MODEL}\n")

        results = []
        for case in cases:
            result = self.run_case(business, case)
            results.append(result)
            if result["error"]:
                status = self.style.WARNING("ERROR")
            elif result["passed"]:
                status = self.style.SUCCESS("PASS ")
            else:
                status = self.style.ERROR("FAIL ")
            self.stdout.write(f"{result['id']:>4}  {status}  {result['latency_ms'] or 0:>6} ms  {result['question'][:70]}")

        summary = self.summarize(results)
        self.print_summary(summary)
        json_path, md_path = self.save_report(dataset_path, dataset, business, results, summary)
        self.stdout.write(f"\nReport saved: {json_path}\nSummary: {md_path}")

    def run_case(self, business, case):
        result = {
            "id": case["id"],
            "question": case["question"],
            "answerable": case["answerable"],
            "expected_section": case.get("expected_section"),
            "expected_phrases": case.get("must_include"),
            "answered": None,
            "passed": False,
            "top1_section": None,
            "hit_at_1": None,
            "hit_at_3": None,
            "latency_ms": None,
            "answer": "",
            "error": None,
        }
        start = time.perf_counter()
        try:
            chunks = retrieve_chunks(business, case["question"])
            sections = [section_of(chunk) for chunk in chunks]
            result["top1_section"] = sections[0] if sections else None

            if case["answerable"]:
                result["hit_at_1"] = sections[:1] == [case["expected_section"]]
                result["hit_at_3"] = case["expected_section"] in sections[:3]

            if is_relevant(chunks):
                answer = generate_answer(business.name, case["question"], chunks)
                answered = not is_fallback(answer)
            else:
                answer, answered = "", False  # layer 1: nothing close enough, LLM skipped
        except OpenAIError as exc:
            result["error"] = str(exc)[:300]
            result["latency_ms"] = int((time.perf_counter() - start) * 1000)
            return result

        result["latency_ms"] = int((time.perf_counter() - start) * 1000)
        result["answer"] = answer
        result["answered"] = answered
        if case["answerable"]:
            result["passed"] = answered and includes_all_groups(answer, case["must_include"])
        else:
            result["passed"] = not answered
        return result

    def summarize(self, results):
        ok = [r for r in results if not r["error"]]
        answerable = [r for r in ok if r["answerable"]]
        unanswerable = [r for r in ok if not r["answerable"]]
        latencies = [r["latency_ms"] for r in ok]
        return {
            "cases": len(results),
            "errors": len(results) - len(ok),
            "answerable": len(answerable),
            "unanswerable": len(unanswerable),
            "answer_accuracy_pct": pct(sum(r["passed"] for r in answerable), len(answerable)),
            "correct_refusals_pct": pct(sum(r["passed"] for r in unanswerable), len(unanswerable)),
            "false_refusals": sum(not r["answered"] for r in answerable),
            "hallucinations": sum(bool(r["answered"]) for r in unanswerable),
            "retrieval_hit_at_1_pct": pct(sum(bool(r["hit_at_1"]) for r in answerable), len(answerable)),
            "retrieval_hit_at_3_pct": pct(sum(bool(r["hit_at_3"]) for r in answerable), len(answerable)),
            "avg_latency_ms": round(statistics.mean(latencies)) if latencies else None,
            "p90_latency_ms": p90(latencies),
        }

    def print_summary(self, s):
        rows = [
            ("Answer accuracy", f"{s['answer_accuracy_pct']}% of {s['answerable']} answerable"),
            ("Correct refusals", f"{s['correct_refusals_pct']}% of {s['unanswerable']} unanswerable"),
            ("False refusals", s["false_refusals"]),
            ("Hallucinations", s["hallucinations"]),
            ("Retrieval hit@1", f"{s['retrieval_hit_at_1_pct']}%"),
            ("Retrieval hit@3", f"{s['retrieval_hit_at_3_pct']}%"),
            ("Average latency", f"{s['avg_latency_ms']} ms"),
            ("p90 latency", f"{s['p90_latency_ms']} ms"),
            ("Errors", s["errors"]),
        ]
        self.stdout.write("\n" + self.style.MIGRATE_HEADING("Summary"))
        for label, value in rows:
            self.stdout.write(f"  {label:<18} {value}")

    def save_report(self, dataset_path, dataset, business, results, summary):
        reports_dir = dataset_path.parent / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

        report = {
            "dataset": dataset.get("name", dataset_path.name),
            "business": business.slug,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "chat_model": settings.CHAT_MODEL,
            "embedding_model": settings.EMBEDDING_MODEL,
            "retrieval_max_distance": settings.RETRIEVAL_MAX_DISTANCE,
            "summary": summary,
            "cases": results,
        }
        json_path = reports_dir / f"{stamp}.json"
        json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

        lines = [
            f"# Evaluation: {report['dataset']}",
            "",
            f"Run {report['timestamp']} with {report['chat_model']} and {report['embedding_model']}.",
            "",
            "| Metric | Value |",
            "|---|---|",
        ]
        for key, value in summary.items():
            lines.append(f"| {key} | {value} |")

        failed = [r for r in results if not r["passed"]]
        lines += ["", f"## Failed cases ({len(failed)})", ""]
        for r in failed:
            lines.append(f"### {r['id']}: {r['question']}")
            if r["error"]:
                lines.append(f"- Error: {r['error']}")
            else:
                expected = "should refuse" if not r["answerable"] else r["expected_phrases"]
                lines.append(f"- Expected: {expected}")
                if r["answerable"]:
                    lines.append(f"- Expected section: {r['expected_section']} (top result: {r['top1_section']})")
                lines.append(f"- Answer: {r['answer'] or '(fallback)'}")
            lines.append("")

        md_path = reports_dir / f"{stamp}.md"
        md_path.write_text("\n".join(lines), encoding="utf-8")
        return json_path, md_path